import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Basic health check - always return 200 for Railway
  // Try DB connection but don't fail if it's not ready yet
  let dbStatus = 'unknown';
  
  try {
    await dbConnect();
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = 'disconnected';
    console.error('Database connection error:', error);
  }
  
  // Always return 200 so Railway considers the service healthy
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    env: {
      nodeEnv: process.env.NODE_ENV,
      hasMongoUri: !!process.env.MONGODB_URI,
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    }
  });
}
