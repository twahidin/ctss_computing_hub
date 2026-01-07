import type { NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import { User, School } from '@/models';
import { withMinProfile, AuthenticatedRequest, canManageSchool } from '@/lib/roleAuth';
import { UserProfile } from '@/types';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  await dbConnect();

  const { method } = req;

  switch (method) {
    case 'GET':
      return handleGetUsers(req, res);
    case 'POST':
      return handleCreateUser(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ message: `Method ${method} Not Allowed` });
  }
}

async function handleGetUsers(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const { profile, school, class: classFilter, approvalStatus, page = '1', limit = '50' } = req.query;
    
    const query: any = {};
    
    // Build query based on filters
    if (profile) query.profile = profile;
    if (classFilter) query.class = classFilter;
    if (approvalStatus) query.approvalStatus = approvalStatus;
    
    // Restrict based on user's profile
    if (req.user.profile === 'admin') {
      // Admin can only see users in their school
      query.school = req.user.schoolId;
    } else if (req.user.profile === 'teacher') {
      // Teacher can only see students in their school and class
      query.school = req.user.schoolId;
      query.class = req.user.class;
      query.profile = 'student';
    }
    // Super admin can see all users
    
    // If school filter is provided and user is super_admin
    if (school && req.user.profile === 'super_admin') {
      query.school = school;
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(query),
    ]);

    return res.status(200).json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Get users error:', error);
    return res.status(500).json({ message: 'Failed to fetch users' });
  }
}

async function handleCreateUser(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const { 
      username, 
      password, 
      name, 
      email,
      profile: targetProfile, 
      schoolId, 
      class: userClass, 
      level,
      approvalStatus = 'approved' // When admin creates user, they can set status
    } = req.body;

    // Validate required fields
    if (!username || !password || !name || !targetProfile) {
      return res.status(400).json({ message: 'Missing required fields: username, password, name, profile' });
    }

    // Only super_admin can create super_admin or admin accounts
    if (targetProfile === 'super_admin' && req.user.profile !== 'super_admin') {
      return res.status(403).json({ message: 'Only super_admin can create super_admin accounts' });
    }
    
    if (targetProfile === 'admin' && req.user.profile !== 'super_admin') {
      return res.status(403).json({ message: 'Only super_admin can create admin accounts' });
    }

    // Admin can only create users in their own school
    if (req.user.profile === 'admin') {
      if (schoolId && schoolId !== req.user.schoolId) {
        return res.status(403).json({ message: 'Admins can only create users in their own school' });
      }
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Get school name if schoolId provided
    let schoolName = '';
    if (schoolId) {
      const school = await School.findById(schoolId);
      if (school) {
        schoolName = school.schoolName;
      }
    }

    const newUser = await User.create({
      username,
      password,
      name,
      email,
      profile: targetProfile,
      school: schoolId || null,
      schoolName,
      class: userClass || '',
      level: level || '',
      approvalStatus: targetProfile === 'super_admin' ? 'approved' : approvalStatus,
      approvedBy: approvalStatus === 'approved' ? req.user.id : undefined,
      approvedAt: approvalStatus === 'approved' ? new Date() : undefined,
    });

    return res.status(201).json({
      message: 'User created successfully',
      user: {
        _id: newUser._id,
        username: newUser.username,
        name: newUser.name,
        profile: newUser.profile,
        school: newUser.school,
        schoolName: newUser.schoolName,
        class: newUser.class,
        level: newUser.level,
        approvalStatus: newUser.approvalStatus,
      },
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    return res.status(500).json({ message: 'Failed to create user' });
  }
}

// Require at least teacher profile to access this endpoint
export default withMinProfile('teacher')(handler);

