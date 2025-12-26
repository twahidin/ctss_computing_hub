import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    const { name, email, studentId, password, class: studentClass } = req.body;

    // Validate required fields
    if (!name || !email || !studentId || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { studentId }],
    });

    if (existingUser) {
      return res.status(400).json({
        message:
          existingUser.email === email
            ? 'Email already registered'
            : 'Student ID already registered',
      });
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      studentId,
      password,
      class: studentClass,
      role: 'student',
      progress: {
        module1: 0,
        module2: 0,
        module3: 0,
        module4: 0,
        module5: 0,
      },
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        studentId: user.studentId,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}
