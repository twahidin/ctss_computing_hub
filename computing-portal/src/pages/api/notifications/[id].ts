import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import { Notification } from '@/models';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  await dbConnect();

  const { id } = req.query;

  switch (req.method) {
    case 'PUT':
      return handlePut(req, res, session, id as string);
    case 'DELETE':
      return handleDelete(req, res, session, id as string);
    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}

// PUT: Mark notification as read
async function handlePut(
  req: NextApiRequest,
  res: NextApiResponse,
  session: any,
  id: string
) {
  try {
    const notification = await Notification.findOne({
      _id: id,
      student: session.user.id,
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    return res.status(200).json({
      success: true,
      notification,
    });
  } catch (error: any) {
    console.error('Update notification error:', error);
    return res.status(500).json({ message: error.message });
  }
}

// DELETE: Delete a notification
async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse,
  session: any,
  id: string
) {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: id,
      student: session.user.id,
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error: any) {
    console.error('Delete notification error:', error);
    return res.status(500).json({ message: error.message });
  }
}
