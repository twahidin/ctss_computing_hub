import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Spreadsheet from '@/models/Spreadsheet';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Spreadsheet ID is required' });
  }

  await dbConnect();

  switch (req.method) {
    case 'GET':
      return getSpreadsheet(req, res, id, session.user.id);
    case 'PUT':
      return updateSpreadsheet(req, res, id, session.user.id);
    case 'DELETE':
      return deleteSpreadsheet(req, res, id, session.user.id);
    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}

async function getSpreadsheet(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string,
  userId: string
) {
  try {
    const spreadsheet = await Spreadsheet.findOne({
      _id: id,
      $or: [{ userId }, { isTemplate: true }, { isExercise: true }],
    });

    if (!spreadsheet) {
      return res.status(404).json({ message: 'Spreadsheet not found' });
    }

    res.status(200).json({ spreadsheet });
  } catch (error) {
    console.error('Get spreadsheet error:', error);
    res.status(500).json({ message: 'Failed to fetch spreadsheet' });
  }
}

async function updateSpreadsheet(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string,
  userId: string
) {
  try {
    const { title, description, data, topic, tags } = req.body;

    const spreadsheet = await Spreadsheet.findOneAndUpdate(
      { _id: id, userId },
      {
        $set: {
          ...(title && { title }),
          ...(description !== undefined && { description }),
          ...(data && { data }),
          ...(topic !== undefined && { topic }),
          ...(tags && { tags }),
          lastModified: new Date(),
        },
      },
      { new: true }
    );

    if (!spreadsheet) {
      return res.status(404).json({ message: 'Spreadsheet not found' });
    }

    res.status(200).json({ spreadsheet });
  } catch (error) {
    console.error('Update spreadsheet error:', error);
    res.status(500).json({ message: 'Failed to update spreadsheet' });
  }
}

async function deleteSpreadsheet(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string,
  userId: string
) {
  try {
    const spreadsheet = await Spreadsheet.findOneAndDelete({ _id: id, userId });

    if (!spreadsheet) {
      return res.status(404).json({ message: 'Spreadsheet not found' });
    }

    res.status(200).json({ message: 'Spreadsheet deleted' });
  } catch (error) {
    console.error('Delete spreadsheet error:', error);
    res.status(500).json({ message: 'Failed to delete spreadsheet' });
  }
}
