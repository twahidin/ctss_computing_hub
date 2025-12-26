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

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Notebook ID is required' });
  }

  await dbConnect();

  switch (req.method) {
    case 'GET':
      return getNotebook(req, res, id, session.user.id);
    case 'PUT':
      return updateNotebook(req, res, id, session.user.id);
    case 'DELETE':
      return deleteNotebook(req, res, id, session.user.id);
    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}

async function getNotebook(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string,
  userId: string
) {
  try {
    const notebook = await Notebook.findOne({
      _id: id,
      $or: [{ userId }, { isTemplate: true }],
    });

    if (!notebook) {
      return res.status(404).json({ message: 'Notebook not found' });
    }

    res.status(200).json({ notebook });
  } catch (error) {
    console.error('Get notebook error:', error);
    res.status(500).json({ message: 'Failed to fetch notebook' });
  }
}

async function updateNotebook(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string,
  userId: string
) {
  try {
    const { title, description, content, topic, tags } = req.body;

    const notebook = await Notebook.findOneAndUpdate(
      { _id: id, userId },
      {
        $set: {
          ...(title && { title }),
          ...(description !== undefined && { description }),
          ...(content && { content }),
          ...(topic !== undefined && { topic }),
          ...(tags && { tags }),
          lastModified: new Date(),
        },
      },
      { new: true }
    );

    if (!notebook) {
      return res.status(404).json({ message: 'Notebook not found' });
    }

    res.status(200).json({ notebook });
  } catch (error) {
    console.error('Update notebook error:', error);
    res.status(500).json({ message: 'Failed to update notebook' });
  }
}

async function deleteNotebook(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string,
  userId: string
) {
  try {
    const notebook = await Notebook.findOneAndDelete({ _id: id, userId });

    if (!notebook) {
      return res.status(404).json({ message: 'Notebook not found' });
    }

    res.status(200).json({ message: 'Notebook deleted' });
  } catch (error) {
    console.error('Delete notebook error:', error);
    res.status(500).json({ message: 'Failed to delete notebook' });
  }
}
