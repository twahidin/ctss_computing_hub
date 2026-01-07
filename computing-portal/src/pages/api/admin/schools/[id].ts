import type { NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import { School, User } from '@/models';
import { withMinProfile, AuthenticatedRequest, canManageSchool } from '@/lib/roleAuth';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  await dbConnect();

  const { method } = req;
  const { id } = req.query;

  if (!id || !mongoose.Types.ObjectId.isValid(id as string)) {
    return res.status(400).json({ message: 'Invalid school ID' });
  }

  switch (method) {
    case 'GET':
      return handleGetSchool(req, res, id as string);
    case 'PUT':
      return handleUpdateSchool(req, res, id as string);
    case 'DELETE':
      return handleDeleteSchool(req, res, id as string);
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ message: `Method ${method} Not Allowed` });
  }
}

async function handleGetSchool(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    // Check permission
    if (!canManageSchool(req.user.profile, req.user.schoolId, id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const school = await School.findById(id).lean();

    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }

    // Get user counts for this school
    const [studentCount, teacherCount, adminCount] = await Promise.all([
      User.countDocuments({ school: id, profile: 'student', approvalStatus: 'approved' }),
      User.countDocuments({ school: id, profile: 'teacher', approvalStatus: 'approved' }),
      User.countDocuments({ school: id, profile: 'admin', approvalStatus: 'approved' }),
    ]);

    return res.status(200).json({ 
      school,
      stats: {
        studentCount,
        teacherCount,
        adminCount,
        totalUsers: studentCount + teacherCount + adminCount,
      }
    });
  } catch (error: any) {
    console.error('Get school error:', error);
    return res.status(500).json({ message: 'Failed to fetch school' });
  }
}

async function handleUpdateSchool(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const school = await School.findById(id);

    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }

    // Check permissions
    // Super admin can edit everything
    // Admin can only edit classes, levels, and accessible functions for their own school
    if (req.user.profile === 'admin') {
      if (id !== req.user.schoolId) {
        return res.status(403).json({ message: 'Admins can only modify their own school' });
      }
    }

    const { 
      schoolName, 
      schoolCode, 
      listOfClasses, 
      listOfLevels,
      listAccessibleFunctions,
      address,
      contactEmail,
      contactPhone,
      isActive,
    } = req.body;

    const updateData: any = {};

    // Only super_admin can change name, code, and active status
    if (req.user.profile === 'super_admin') {
      if (schoolName) updateData.schoolName = schoolName;
      if (schoolCode) updateData.schoolCode = schoolCode.toUpperCase();
      if (isActive !== undefined) updateData.isActive = isActive;
      if (address !== undefined) updateData.address = address;
      if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
      if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
    }

    // Admin and super_admin can update classes, levels, and functions
    if (listOfClasses) updateData.listOfClasses = listOfClasses;
    if (listOfLevels) updateData.listOfLevels = listOfLevels;
    if (listAccessibleFunctions) updateData.listAccessibleFunctions = listAccessibleFunctions;

    // Check for duplicate name/code if changing them
    if (updateData.schoolName || updateData.schoolCode) {
      const existingSchool = await School.findOne({
        _id: { $ne: id },
        $or: [
          updateData.schoolName ? { schoolName: updateData.schoolName } : null,
          updateData.schoolCode ? { schoolCode: updateData.schoolCode } : null,
        ].filter(Boolean),
      });

      if (existingSchool) {
        return res.status(400).json({ message: 'School name or code already exists' });
      }
    }

    const updatedSchool = await School.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    // If school name changed, update all users' schoolName
    if (updateData.schoolName) {
      await User.updateMany(
        { school: id },
        { $set: { schoolName: updateData.schoolName } }
      );
    }

    return res.status(200).json({
      message: 'School updated successfully',
      school: updatedSchool,
    });
  } catch (error: any) {
    console.error('Update school error:', error);
    return res.status(500).json({ message: 'Failed to update school' });
  }
}

async function handleDeleteSchool(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  // Only super_admin can delete schools
  if (req.user.profile !== 'super_admin') {
    return res.status(403).json({ message: 'Only super_admin can delete schools' });
  }

  try {
    const school = await School.findById(id);

    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }

    // Check if school has users
    const userCount = await User.countDocuments({ school: id });
    if (userCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete school with ${userCount} users. Please reassign or delete users first.` 
      });
    }

    await School.findByIdAndDelete(id);

    return res.status(200).json({ message: 'School deleted successfully' });
  } catch (error: any) {
    console.error('Delete school error:', error);
    return res.status(500).json({ message: 'Failed to delete school' });
  }
}

export default withMinProfile('admin')(handler);

