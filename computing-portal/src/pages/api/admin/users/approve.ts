import type { NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models';
import { withMinProfile, AuthenticatedRequest } from '@/lib/roleAuth';
import { canApproveUser } from '@/types';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  await dbConnect();

  try {
    const { userId, action, rejectionReason } = req.body;

    if (!userId || !action) {
      return res.status(400).json({ message: 'Missing required fields: userId, action' });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action. Must be "approve" or "reject"' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const targetUser = await User.findById(userId).select('-password');

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (targetUser.approvalStatus !== 'pending') {
      return res.status(400).json({ 
        message: `User is already ${targetUser.approvalStatus}` 
      });
    }

    // Check if user has permission to approve this user
    if (!canApproveUser(req.user.profile, targetUser.profile)) {
      return res.status(403).json({ 
        message: `You don't have permission to approve ${targetUser.profile} accounts` 
      });
    }

    // Additional checks based on role
    if (req.user.profile === 'admin') {
      // Admin can only approve users in their school
      if (targetUser.school?.toString() !== req.user.schoolId) {
        return res.status(403).json({ 
          message: 'Admins can only approve users in their own school' 
        });
      }
    }

    if (req.user.profile === 'teacher') {
      // Teacher can only approve students in their class
      if (targetUser.school?.toString() !== req.user.schoolId || 
          targetUser.class !== req.user.class ||
          targetUser.profile !== 'student') {
        return res.status(403).json({ 
          message: 'Teachers can only approve students in their own class' 
        });
      }
    }

    const updateData: any = {
      approvalStatus: action === 'approve' ? 'approved' : 'rejected',
      approvedBy: req.user.id,
      approvedAt: new Date(),
    };

    if (action === 'reject' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    ).select('-password');

    return res.status(200).json({ 
      message: action === 'approve' ? 'User approved successfully' : 'User rejected',
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('User approval error:', error);
    return res.status(500).json({ message: 'Failed to process approval' });
  }
}

// Require at least teacher profile
export default withMinProfile('teacher')(handler);

