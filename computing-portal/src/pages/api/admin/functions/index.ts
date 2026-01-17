import type { NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import { Function, School } from '@/models';
import { withMinProfile, AuthenticatedRequest } from '@/lib/roleAuth';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  await dbConnect();

  const { method } = req;

  switch (method) {
    case 'GET':
      return handleGetFunctions(req, res);
    case 'POST':
      return handleCreateFunction(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ message: `Method ${method} Not Allowed` });
  }
}

async function handleGetFunctions(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const { isActive, category, page = '1', limit = '50' } = req.query;
    
    const query: any = {};
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    if (category) {
      query['functionData.category'] = category;
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // For admin users, only show functions their school has access to
    if (req.user.profile === 'admin' && req.user.schoolId) {
      const school = await School.findById(req.user.schoolId).lean() as any;
      if (school && school.listAccessibleFunctions) {
        query._id = { $in: school.listAccessibleFunctions };
      }
    }
    // Super admin can see all functions

    const [functions, total] = await Promise.all([
      Function.find(query)
        .sort({ functionName: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Function.countDocuments(query),
    ]);

    return res.status(200).json({
      functions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Get functions error:', error);
    return res.status(500).json({ message: 'Failed to fetch functions' });
  }
}

async function handleCreateFunction(req: AuthenticatedRequest, res: NextApiResponse) {
  // Only super_admin can create functions
  if (req.user.profile !== 'super_admin') {
    return res.status(403).json({ message: 'Only super_admin can create functions' });
  }

  try {
    const { 
      functionName, 
      functionCode, 
      functionData = {},
      profileFunctionList = ['student', 'teacher', 'admin', 'super_admin'],
      isSystemFunction = false,
    } = req.body;

    if (!functionName || !functionCode) {
      return res.status(400).json({ message: 'Missing required fields: functionName, functionCode' });
    }

    // Check if function already exists
    const existingFunction = await Function.findOne({
      functionCode: functionCode.toUpperCase(),
    });

    if (existingFunction) {
      return res.status(400).json({ message: 'Function code already exists' });
    }

    const newFunction = await Function.create({
      functionName,
      functionCode: functionCode.toUpperCase(),
      functionData,
      profileFunctionList,
      isSystemFunction,
      isActive: true,
    });

    return res.status(201).json({
      message: 'Function created successfully',
      function: newFunction,
    });
  } catch (error: any) {
    console.error('Create function error:', error);
    return res.status(500).json({ message: 'Failed to create function' });
  }
}

// Require at least admin profile
export default withMinProfile('admin')(handler);

