import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Exercise from '@/models/Exercise';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  await dbConnect();

  switch (req.method) {
    case 'GET':
      return getProgress(req, res, session.user.id);
    case 'PUT':
      return updateProgress(req, res, session.user.id);
    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}

async function getProgress(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const user = await User.findById(userId).select('progress');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get exercise statistics
    const exercises = await Exercise.find({ userId });
    
    const stats = {
      totalExercises: exercises.length,
      completedExercises: exercises.filter((e) => e.status === 'completed').length,
      inProgressExercises: exercises.filter((e) => e.status === 'in_progress').length,
      averageScore: exercises.length > 0 
        ? exercises.reduce((acc, e) => acc + (e.score || 0), 0) / exercises.filter(e => e.score).length 
        : 0,
      totalTimeSpent: exercises.reduce((acc, e) => acc + (e.timeSpent || 0), 0),
      exercisesByModule: {
        module1: exercises.filter((e) => e.module === 1).length,
        module2: exercises.filter((e) => e.module === 2).length,
        module3: exercises.filter((e) => e.module === 3).length,
        module4: exercises.filter((e) => e.module === 4).length,
        module5: exercises.filter((e) => e.module === 5).length,
      },
    };

    res.status(200).json({ 
      progress: user.progress,
      stats,
    });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ message: 'Failed to fetch progress' });
  }
}

async function updateProgress(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const { module, progress } = req.body;

    if (!module || progress === undefined) {
      return res.status(400).json({ message: 'Module and progress are required' });
    }

    const updateField = `progress.module${module}`;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { [updateField]: Math.min(100, Math.max(0, progress)) } },
      { new: true }
    ).select('progress');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ progress: user.progress });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ message: 'Failed to update progress' });
  }
}
