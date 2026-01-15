import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import { Submission, Assignment, Feedback } from '@/models';

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
    return res.status(400).json({ message: 'Invalid submission ID' });
  }

  await dbConnect();

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, session, id);
    case 'PUT':
      return handlePut(req, res, session, id);
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

    const submission = await Submission.findById(id)
      .populate('student', 'name username class')
      .populate('assignment', 'title subject topic totalMarks questions')
      .populate('approvedBy', 'name username')
      .lean();

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Check access permissions
    if (user.profile === 'student' && submission.student._id?.toString() !== user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get associated feedback
    const feedback = await Feedback.find({ submission: id })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ ...submission, feedback });
  } catch (error: any) {
    console.error('Get submission error:', error);
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

    const submission = await Submission.findById(id);

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Check permissions
    const isOwner = submission.student.toString() === user.id;
    const isTeacherOrAdmin = ['teacher', 'admin', 'super_admin'].includes(user.profile);

    if (!isOwner && !isTeacherOrAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const {
      status,
      marksAwarded,
      marksTotal,
      teacherComments,
      approveSubmission,
      returnToStudent,
    } = req.body;

    // Teacher actions
    if (isTeacherOrAdmin) {
      if (marksAwarded !== undefined) {
        submission.marksAwarded = marksAwarded;
        submission.marksAdjusted = true;
        submission.adjustedMarks = marksAwarded;
      }
      if (marksTotal !== undefined) submission.marksTotal = marksTotal;
      if (teacherComments !== undefined) submission.teacherComments = teacherComments;
      
      if (approveSubmission) {
        submission.status = 'approved';
        submission.approvedBy = user.id;
        submission.approvedAt = new Date();
      }

      if (returnToStudent) {
        submission.status = 'returned';
        submission.returnedAt = new Date();
        // TODO: Generate marked PDF with feedback annotations
      }
    }

    // Update status (with restrictions)
    if (status) {
      // Students can only cancel pending submissions
      if (isOwner && !isTeacherOrAdmin) {
        if (status === 'cancelled' && submission.status === 'pending') {
          submission.status = status;
        }
      } else {
        submission.status = status;
      }
    }

    // Calculate percentage and grade if marks are set
    if (submission.marksAwarded !== undefined && submission.marksTotal) {
      submission.percentage = Math.round((submission.marksAwarded / submission.marksTotal) * 100 * 10) / 10;
      submission.grade = calculateGrade(submission.percentage);
    }

    await submission.save();

    const populatedSubmission = await Submission.findById(id)
      .populate('student', 'name username class')
      .populate('assignment', 'title subject topic')
      .populate('approvedBy', 'name username')
      .lean();

    return res.status(200).json(populatedSubmission);
  } catch (error: any) {
    console.error('Update submission error:', error);
    return res.status(500).json({ message: error.message });
  }
}

function calculateGrade(percentage: number): string {
  if (percentage >= 90) return 'A1';
  if (percentage >= 80) return 'A2';
  if (percentage >= 75) return 'B3';
  if (percentage >= 70) return 'B4';
  if (percentage >= 65) return 'C5';
  if (percentage >= 60) return 'C6';
  if (percentage >= 55) return 'D7';
  if (percentage >= 50) return 'E8';
  return 'F9';
}
