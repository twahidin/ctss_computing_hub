import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import { Assignment, Submission } from '@/models';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Invalid assignment ID' });
  }

  await dbConnect();

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, session, id);
    case 'PUT':
      return handlePut(req, res, session, id);
    case 'DELETE':
      return handleDelete(req, res, session, id);
    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  session: any,
  id: string
) {
  try {
    const user = session.user;

    const assignment = await Assignment.findById(id)
      .populate('teacher', 'name username')
      .lean();

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check access permissions
    if (user.profile === 'student') {
      // Students can only see published assignments for their class
      if (assignment.status !== 'published') {
        return res.status(403).json({ message: 'Access denied' });
      }
      if (user.schoolId && assignment.school?.toString() !== user.schoolId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      if (user.class && assignment.class !== user.class) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (user.profile === 'teacher') {
      // Teachers can see their own assignments
      if (assignment.teacher._id?.toString() !== user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    // Admins can see all assignments in their school

    return res.status(200).json(assignment);
  } catch (error: any) {
    console.error('Get assignment error:', error);
    return res.status(500).json({ message: error.message });
  }
}

async function handlePut(
  req: NextApiRequest,
  res: NextApiResponse,
  session: any,
  id: string
) {
  try {
    const user = session.user;

    // Only teachers and admins can update assignments
    if (!['teacher', 'admin', 'super_admin'].includes(user.profile)) {
      return res.status(403).json({ message: 'Not authorized to update assignments' });
    }

    const assignment = await Assignment.findById(id);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Teachers can only update their own assignments
    if (user.profile === 'teacher' && assignment.teacher.toString() !== user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const {
      title,
      description,
      subject,
      topic,
      grade,
      class: classGroup,
      learningOutcomes,
      questions,
      totalMarks,
      dueDate,
      status,
      difficulty,
      allowDraftSubmissions,
      requiresApproval,
      knowledgeBasePdf,
    } = req.body;

    // Update fields
    if (title !== undefined) assignment.title = title;
    if (description !== undefined) assignment.description = description;
    if (subject !== undefined) assignment.subject = subject;
    if (topic !== undefined) assignment.topic = topic;
    if (grade !== undefined) assignment.grade = grade;
    if (classGroup !== undefined) assignment.class = classGroup;
    if (learningOutcomes !== undefined) assignment.learningOutcomes = learningOutcomes;
    if (questions !== undefined) assignment.questions = questions;
    if (totalMarks !== undefined) assignment.totalMarks = totalMarks;
    if (dueDate !== undefined) assignment.dueDate = dueDate ? new Date(dueDate) : undefined;
    if (status !== undefined) assignment.status = status;
    if (difficulty !== undefined) assignment.difficulty = difficulty;
    if (allowDraftSubmissions !== undefined) assignment.allowDraftSubmissions = allowDraftSubmissions;
    if (requiresApproval !== undefined) assignment.requiresApproval = requiresApproval;
    if (knowledgeBasePdf !== undefined) assignment.knowledgeBasePdf = knowledgeBasePdf;

    await assignment.save();

    return res.status(200).json(assignment);
  } catch (error: any) {
    console.error('Update assignment error:', error);
    return res.status(500).json({ message: error.message });
  }
}

async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse,
  session: any,
  id: string
) {
  try {
    const user = session.user;

    // Only teachers and admins can delete assignments
    if (!['teacher', 'admin', 'super_admin'].includes(user.profile)) {
      return res.status(403).json({ message: 'Not authorized to delete assignments' });
    }

    const assignment = await Assignment.findById(id);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Teachers can only delete their own assignments
    if (user.profile === 'teacher' && assignment.teacher.toString() !== user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if there are submissions
    const submissionCount = await Submission.countDocuments({ assignment: id });
    if (submissionCount > 0) {
      // Instead of deleting, archive the assignment
      assignment.status = 'archived';
      await assignment.save();
      return res.status(200).json({ 
        message: 'Assignment archived (has submissions)', 
        archived: true 
      });
    }

    await Assignment.findByIdAndDelete(id);

    return res.status(200).json({ message: 'Assignment deleted successfully' });
  } catch (error: any) {
    console.error('Delete assignment error:', error);
    return res.status(500).json({ message: error.message });
  }
}
