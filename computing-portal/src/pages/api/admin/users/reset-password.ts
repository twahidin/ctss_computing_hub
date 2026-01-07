import type { NextApiResponse } from 'next';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models';
import { withMinProfile, AuthenticatedRequest } from '@/lib/roleAuth';
import { canResetPassword } from '@/types';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  await dbConnect();

  try {
    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      return res.status(400).json({ message: 'Missing required fields: userId, newPassword' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const targetUser = await User.findById(userId).select('-password');

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has permission to reset this password
    if (!canResetPassword(req.user.profile, targetUser.profile)) {
      return res.status(403).json({ 
        message: `You don't have permission to reset passwords for ${targetUser.profile} accounts` 
      });
    }

    // Additional checks based on role
    if (req.user.profile === 'admin') {
      // Admin can only reset passwords for users in their school
      if (targetUser.school?.toString() !== req.user.schoolId) {
        return res.status(403).json({ 
          message: 'Admins can only reset passwords for users in their own school' 
        });
      }
    }

    if (req.user.profile === 'teacher') {
      // Teacher can only reset passwords for students in their class
      if (targetUser.school?.toString() !== req.user.schoolId || 
          targetUser.class !== req.user.class ||
          targetUser.profile !== 'student') {
        return res.status(403).json({ 
          message: 'Teachers can only reset passwords for students in their own class' 
        });
      }
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password directly (bypassing pre-save hook)
    await User.findByIdAndUpdate(userId, { password: hashedPassword });

    return res.status(200).json({ 
      message: 'Password reset successfully',
      user: {
        _id: targetUser._id,
        username: targetUser.username,
        name: targetUser.name,
      }
    });
  } catch (error: any) {
    console.error('Password reset error:', error);
    return res.status(500).json({ message: 'Failed to reset password' });
  }
}

// Require at least teacher profile
export default withMinProfile('teacher')(handler);

