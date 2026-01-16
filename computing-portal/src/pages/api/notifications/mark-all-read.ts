import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import { Notification } from '@/models';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  await dbConnect();

  try {
    const result = await Notification.updateMany(
      { 
        student: session.user.id,
        read: false,
      },
      { 
        $set: { 
          read: true,
          readAt: new Date(),
        }
      }
    );

    return res.status(200).json({
      success: true,
      markedRead: result.modifiedCount,
    });
  } catch (error: any) {
    console.error('Mark all read error:', error);
    return res.status(500).json({ message: error.message });
  }
}
