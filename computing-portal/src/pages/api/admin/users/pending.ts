import type { NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models';
import { withMinProfile, AuthenticatedRequest } from '@/lib/roleAuth';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  await dbConnect();

  try {
    const query: any = { approvalStatus: 'pending' };

    // Restrict based on user's profile
    if (req.user.profile === 'admin') {
      // Admin can only see pending users in their school
      query.school = req.user.schoolId;
    } else if (req.user.profile === 'teacher') {
      // Teacher can only see pending students in their class
      query.school = req.user.schoolId;
      query.class = req.user.class;
      query.profile = 'student';
    }
    // Super admin can see all pending users

    const pendingUsers = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      pendingUsers,
      count: pendingUsers.length,
    });
  } catch (error: any) {
    console.error('Get pending users error:', error);
    return res.status(500).json({ message: 'Failed to fetch pending users' });
  }
}

// Require at least teacher profile
export default withMinProfile('teacher')(handler);

