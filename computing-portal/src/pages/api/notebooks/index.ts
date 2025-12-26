import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Notebook from '@/models/Notebook';

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
      return getNotebooks(req, res, session.user.id);
    case 'POST':
      return createNotebook(req, res, session.user.id);
    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}

async function getNotebooks(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const { module, isTemplate } = req.query;
    
    const query: any = {};
    
    if (isTemplate === 'true') {
      query.isTemplate = true;
    } else {
      query.userId = userId;
    }
    
    if (module) {
      query.module = parseInt(module as string);
    }

    const notebooks = await Notebook.find(query)
      .sort({ updatedAt: -1 })
      .limit(50);

    res.status(200).json({ notebooks });
  } catch (error) {
    console.error('Get notebooks error:', error);
    res.status(500).json({ message: 'Failed to fetch notebooks' });
  }
}

async function createNotebook(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const { title, description, content, module, topic, tags } = req.body;

    if (!title || !content || !module) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const notebook = await Notebook.create({
      userId,
      title,
      description,
      content,
      module,
      topic,
      tags: tags || [],
      isTemplate: false,
      createdBy: userId,
      lastModified: new Date(),
    });

    res.status(201).json({ notebook });
  } catch (error) {
    console.error('Create notebook error:', error);
    res.status(500).json({ message: 'Failed to create notebook' });
  }
}
