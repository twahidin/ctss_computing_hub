import type { NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import { School } from '@/models';
import { withMinProfile, AuthenticatedRequest } from '@/lib/roleAuth';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  await dbConnect();

  const { method } = req;

  switch (method) {
    case 'GET':
      return handleGetSchools(req, res);
    case 'POST':
      return handleCreateSchool(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ message: `Method ${method} Not Allowed` });
  }
}

async function handleGetSchools(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const { isActive, page = '1', limit = '50' } = req.query;
    
    const query: any = {};
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // For public registration, we want active schools only
    // But for admin users, they can see all schools (super_admin) or their own (admin)
    
    if (req.user.profile === 'admin') {
      // Admin can only see their own school details
      query._id = req.user.schoolId;
    }
    // Super admin can see all schools

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [schools, total] = await Promise.all([
      School.find(query)
        .sort({ schoolName: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      School.countDocuments(query),
    ]);

    return res.status(200).json({
      schools,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Get schools error:', error);
    return res.status(500).json({ message: 'Failed to fetch schools' });
  }
}

async function handleCreateSchool(req: AuthenticatedRequest, res: NextApiResponse) {
  // Only super_admin can create schools
  if (req.user.profile !== 'super_admin') {
    return res.status(403).json({ message: 'Only super_admin can create schools' });
  }

  try {
    const { 
      schoolName, 
      schoolCode, 
      listOfClasses = [], 
      listOfLevels = [],
      listAccessibleFunctions = [],
      address,
      contactEmail,
      contactPhone,
    } = req.body;

    if (!schoolName || !schoolCode) {
      return res.status(400).json({ message: 'Missing required fields: schoolName, schoolCode' });
    }

    // Check if school already exists
    const existingSchool = await School.findOne({
      $or: [
        { schoolName },
        { schoolCode: schoolCode.toUpperCase() },
      ],
    });

    if (existingSchool) {
      return res.status(400).json({ 
        message: existingSchool.schoolName === schoolName 
          ? 'School name already exists' 
          : 'School code already exists' 
      });
    }

    const newSchool = await School.create({
      schoolName,
      schoolCode: schoolCode.toUpperCase(),
      listOfClasses,
      listOfLevels,
      listAccessibleFunctions,
      address,
      contactEmail,
      contactPhone,
      isActive: true,
    });

    return res.status(201).json({
      message: 'School created successfully',
      school: newSchool,
    });
  } catch (error: any) {
    console.error('Create school error:', error);
    return res.status(500).json({ message: 'Failed to create school' });
  }
}

// Require at least admin profile
export default withMinProfile('admin')(handler);

