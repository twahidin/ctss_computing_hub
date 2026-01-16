import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import { Notification, User } from '@/models';

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

// GET: Fetch notifications for current user
async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  session: any
) {
  try {
    const { unreadOnly, limit = 20 } = req.query;
    
    const query: any = { student: session.user.id };
    
    if (unreadOnly === 'true') {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .populate('assignment', 'title subject topic')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string))
      .lean();

    // Get unread count
    const unreadCount = await Notification.countDocuments({
      student: session.user.id,
      read: false,
    });

    return res.status(200).json({
      notifications,
      unreadCount,
    });
  } catch (error: any) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ message: error.message });
  }
}

// POST: Create notifications (for teachers/admins)
async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  session: any
) {
  try {
    const user = session.user;

    // Only teachers and admins can create notifications
    if (!['teacher', 'admin', 'super_admin'].includes(user.profile)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { 
      studentIds,      // Array of student IDs or 'class' for class notification
      classGroup,      // Class name if notifying entire class
      type,
      title,
      message,
      assignmentId,
      submissionId,
      actionUrl,
    } = req.body;

    if (!type || !title || !message) {
      return res.status(400).json({ 
        message: 'Type, title, and message are required' 
      });
    }

    let targetStudentIds: string[] = [];

    // If notifying a class
    if (classGroup) {
      const teacher = await User.findById(user.id).lean();
      if (!teacher?.school) {
        return res.status(400).json({ message: 'Teacher must be associated with a school' });
      }

      const students = await User.find({
        school: teacher.school,
        class: classGroup,
        profile: 'student',
        approvalStatus: 'approved',
      }).select('_id').lean();

      targetStudentIds = students.map(s => s._id.toString());
    } else if (studentIds && Array.isArray(studentIds)) {
      targetStudentIds = studentIds;
    } else {
      return res.status(400).json({ 
        message: 'Either studentIds or classGroup is required' 
      });
    }

    if (targetStudentIds.length === 0) {
      return res.status(400).json({ message: 'No students found to notify' });
    }

    // Create notifications for all target students
    const notifications = targetStudentIds.map(studentId => ({
      student: studentId,
      type,
      title,
      message,
      assignment: assignmentId || undefined,
      submission: submissionId || undefined,
      actionUrl,
    }));

    const created = await Notification.insertMany(notifications);

    return res.status(201).json({
      success: true,
      count: created.length,
      message: `Notified ${created.length} student(s)`,
    });
  } catch (error: any) {
    console.error('Create notifications error:', error);
    return res.status(500).json({ message: error.message });
  }
}
