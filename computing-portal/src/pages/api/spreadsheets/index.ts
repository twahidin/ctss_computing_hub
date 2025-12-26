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

  await dbConnect();

  switch (req.method) {
    case 'GET':
      return getSpreadsheets(req, res, session.user.id);
    case 'POST':
      return createSpreadsheet(req, res, session.user.id);
    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}

async function getSpreadsheets(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const { isTemplate, isExercise } = req.query;
    
    const query: any = {};
    
    if (isTemplate === 'true') {
      query.isTemplate = true;
    } else if (isExercise === 'true') {
      query.isExercise = true;
    } else {
      query.userId = userId;
    }

    const spreadsheets = await Spreadsheet.find(query)
      .sort({ updatedAt: -1 })
      .limit(50);

    res.status(200).json({ spreadsheets });
  } catch (error) {
    console.error('Get spreadsheets error:', error);
    res.status(500).json({ message: 'Failed to fetch spreadsheets' });
  }
}

async function createSpreadsheet(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const { title, description, data, topic, tags } = req.body;

    if (!title || !data) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const spreadsheet = await Spreadsheet.create({
      userId,
      title,
      description,
      data,
      module: 3, // Spreadsheets are always Module 3
      topic,
      tags: tags || [],
      isTemplate: false,
      isExercise: false,
      createdBy: userId,
      lastModified: new Date(),
    });

    res.status(201).json({ spreadsheet });
  } catch (error) {
    console.error('Create spreadsheet error:', error);
    res.status(500).json({ message: 'Failed to create spreadsheet' });
  }
}
