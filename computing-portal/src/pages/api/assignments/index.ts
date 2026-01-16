import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import { Assignment, User } from '@/models';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  await dbConnect();

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, session);
    case 'POST':
      return handlePost(req, res, session);
    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  session: any
) {
  try {
    const { status, subject, topic, teacherId, classFilter } = req.query;
    const user = session.user;

    let query: any = {};

    // Students see published assignments for their class
    if (user.profile === 'student') {
      query.status = 'published';
      if (user.schoolId) query.school = user.schoolId;
      if (user.class) query.class = user.class;
    }
    // Teachers see their own assignments
    else if (user.profile === 'teacher') {
      query.teacher = user.id;
      if (status) query.status = status;
    }
    // Admins can see all assignments for their school
    else if (user.profile === 'admin' || user.profile === 'super_admin') {
      if (user.schoolId && user.profile !== 'super_admin') {
        query.school = user.schoolId;
      }
      if (status) query.status = status;
      if (teacherId) query.teacher = teacherId;
    }

    // Additional filters
    if (subject) query.subject = subject;
    if (topic) query.topic = topic;
    if (classFilter) query.class = classFilter;

    const assignments = await Assignment.find(query)
      .populate('teacher', 'name username')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(assignments);
  } catch (error: any) {
    console.error('Get assignments error:', error);
    return res.status(500).json({ message: error.message });
  }
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  session: any
) {
  try {
    const user = session.user;

    // Only teachers and admins can create assignments
    if (!['teacher', 'admin', 'super_admin'].includes(user.profile)) {
      return res.status(403).json({ message: 'Not authorized to create assignments' });
    }

    const {
      title,
      subject,
      topic,
      grade,
      class: classGroup,
      questions,
      totalMarks,
      dueDate,
      difficulty,
      allowDraftSubmissions,
      requiresApproval,
      learningOutcomesPdf,
      resourcePdfs,
    } = req.body;

    // Validate required fields
    if (!title || !subject || !topic || !grade || !classGroup) {
      return res.status(400).json({ 
        message: 'Missing required fields: title, subject, topic, grade, class' 
      });
    }

    // Get teacher's school
    const teacher = await User.findById(user.id).lean();
    if (!teacher || !teacher.school) {
      return res.status(400).json({ message: 'Teacher must be associated with a school' });
    }

    const assignment = new Assignment({
      title,
      subject,
      topic,
      grade,
      teacher: user.id,
      school: teacher.school,
      class: classGroup,
      questions: questions || [],
      totalMarks: totalMarks || questions?.reduce((sum: number, q: any) => sum + (q.marks || 0), 0) || 100,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      status: 'draft',
      difficulty: difficulty || 'medium',
      allowDraftSubmissions: allowDraftSubmissions ?? true,
      requiresApproval: requiresApproval ?? true,
      learningOutcomesPdf,
      resourcePdfs: resourcePdfs || [],
    });

    await assignment.save();

    return res.status(201).json(assignment);
  } catch (error: any) {
    console.error('Create assignment error:', error);
    return res.status(500).json({ message: error.message });
  }
}
