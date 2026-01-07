import type { NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import { User, School } from '@/models';
import { withMinProfile, AuthenticatedRequest, canManageSchool, canManageClass } from '@/lib/roleAuth';
import { canManageUser, canResetPassword, PROFILE_HIERARCHY } from '@/types';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  await dbConnect();

  const { method } = req;
  const { id } = req.query;

  if (!id || !mongoose.Types.ObjectId.isValid(id as string)) {
    return res.status(400).json({ message: 'Invalid user ID' });
  }

  switch (method) {
    case 'GET':
      return handleGetUser(req, res, id as string);
    case 'PUT':
      return handleUpdateUser(req, res, id as string);
    case 'DELETE':
      return handleDeleteUser(req, res, id as string);
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ message: `Method ${method} Not Allowed` });
  }
}

async function handleGetUser(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const user = await User.findById(id).select('-password').lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has permission to view this user
    if (req.user.profile !== 'super_admin') {
      if (req.user.profile === 'admin' && user.school?.toString() !== req.user.schoolId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      if (req.user.profile === 'teacher') {
        if (user.school?.toString() !== req.user.schoolId || user.class !== req.user.class) {
          return res.status(403).json({ message: 'Access denied' });
        }
      }
    }

    return res.status(200).json({ user });
  } catch (error: any) {
    console.error('Get user error:', error);
    return res.status(500).json({ message: 'Failed to fetch user' });
  }
}

async function handleUpdateUser(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const targetUser = await User.findById(id).select('-password');

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check permissions
    if (!canManageUser(req.user.profile, targetUser.profile)) {
      return res.status(403).json({ 
        message: `You don't have permission to modify ${targetUser.profile} accounts` 
      });
    }

    // Additional checks for admin
    if (req.user.profile === 'admin') {
      if (targetUser.school?.toString() !== req.user.schoolId) {
        return res.status(403).json({ message: 'Admins can only modify users in their own school' });
      }
    }

    // Additional checks for teacher
    if (req.user.profile === 'teacher') {
      if (targetUser.school?.toString() !== req.user.schoolId || targetUser.class !== req.user.class) {
        return res.status(403).json({ message: 'Teachers can only modify students in their own class' });
      }
      if (targetUser.profile !== 'student') {
        return res.status(403).json({ message: 'Teachers can only modify student accounts' });
      }
    }

    const { 
      name, 
      email, 
      profile: newProfile, 
      schoolId, 
      class: userClass, 
      level,
      savedConfiguration 
    } = req.body;

    const updateData: any = {};

    // Only super_admin can change profile
    if (newProfile && req.user.profile === 'super_admin') {
      // Can't change a super_admin's profile
      if (targetUser.profile === 'super_admin') {
        return res.status(403).json({ message: 'Cannot change super_admin profile' });
      }
      updateData.profile = newProfile;
    }

    // Only super_admin can change school
    if (schoolId !== undefined && req.user.profile === 'super_admin') {
      updateData.school = schoolId || null;
      if (schoolId) {
        const school = await School.findById(schoolId);
        updateData.schoolName = school?.schoolName || '';
      } else {
        updateData.schoolName = '';
      }
    }

    if (name) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (userClass !== undefined) updateData.class = userClass;
    if (level !== undefined) updateData.level = level;
    if (savedConfiguration) updateData.savedConfiguration = savedConfiguration;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    return res.status(200).json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    return res.status(500).json({ message: 'Failed to update user' });
  }
}

async function handleDeleteUser(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const targetUser = await User.findById(id).select('-password');

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Cannot delete super_admin accounts
    if (targetUser.profile === 'super_admin') {
      return res.status(403).json({ message: 'Cannot delete super_admin accounts' });
    }

    // Check permissions
    if (!canManageUser(req.user.profile, targetUser.profile)) {
      return res.status(403).json({ 
        message: `You don't have permission to delete ${targetUser.profile} accounts` 
      });
    }

    // Admin can only delete users in their school
    if (req.user.profile === 'admin' && targetUser.school?.toString() !== req.user.schoolId) {
      return res.status(403).json({ message: 'Admins can only delete users in their own school' });
    }

    // Teacher can only delete students in their class
    if (req.user.profile === 'teacher') {
      if (targetUser.school?.toString() !== req.user.schoolId || targetUser.class !== req.user.class) {
        return res.status(403).json({ message: 'Teachers can only delete students in their own class' });
      }
    }

    await User.findByIdAndDelete(id);

    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return res.status(500).json({ message: 'Failed to delete user' });
  }
}

export default withMinProfile('teacher')(handler);

