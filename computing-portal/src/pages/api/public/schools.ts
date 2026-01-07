import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import { School } from '@/models';

// Public API - no authentication required
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  await dbConnect();

  try {
    const { schoolId } = req.query;

    // If schoolId is provided, return that school's details (classes, levels)
    if (schoolId) {
      const school = await School.findOne({ 
        _id: schoolId, 
        isActive: true 
      }).select('schoolName schoolCode listOfClasses listOfLevels').lean();

      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }

      return res.status(200).json({ school });
    }

    // Otherwise, return list of all active schools
    const schools = await School.find({ isActive: true })
      .select('schoolName schoolCode listOfClasses listOfLevels')
      .sort({ schoolName: 1 })
      .lean();

    return res.status(200).json({ schools });
  } catch (error: any) {
    console.error('Public schools API error:', error);
    return res.status(500).json({ message: 'Failed to fetch schools' });
  }
}

