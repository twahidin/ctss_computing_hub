import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import { School } from '@/models';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const user = session.user;

  // Only teachers and admins can access this
  if (!['teacher', 'admin', 'super_admin'].includes(user.profile)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  await dbConnect();

  try {
    // Get school from user's session
    const schoolId = user.schoolId;
    
    if (!schoolId) {
      return res.status(400).json({ message: 'No school associated with user' });
    }

    const school = await School.findById(schoolId).lean();

    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }

    return res.status(200).json({
      classes: school.listOfClasses || [],
      levels: school.listOfLevels || [],
      schoolName: school.schoolName,
    });
  } catch (error: any) {
    console.error('Fetch school classes error:', error);
    return res.status(500).json({ message: error.message });
  }
}
