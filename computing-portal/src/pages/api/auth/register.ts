import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';
import { User, School } from '@/models';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    const { 
      username, 
      password, 
      name, 
      email,
      schoolId, 
      class: studentClass, 
      level 
    } = req.body;

    // Validate required fields
    if (!username || !password || !name || !schoolId || !studentClass || !level) {
      return res.status(400).json({ 
        message: 'Missing required fields: username, password, name, school, class, and level are required' 
      });
    }

    // Validate username length
    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({ 
        message: 'Username must be between 3 and 50 characters' 
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters' 
      });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    // Verify school exists and is active
    const school = await School.findOne({ _id: schoolId, isActive: true });
    if (!school) {
      return res.status(400).json({ message: 'Invalid school selected' });
    }

    // Verify class is valid for this school
    if (!school.listOfClasses.includes(studentClass)) {
      return res.status(400).json({ message: 'Invalid class for selected school' });
    }

    // Verify level is valid for this school
    if (!school.listOfLevels.includes(level)) {
      return res.status(400).json({ message: 'Invalid level for selected school' });
    }

    // Create new user with pending status
    const user = await User.create({
      username,
      password,
      name,
      email: email || undefined,
      profile: 'student',
      school: school._id,
      schoolName: school.schoolName,
      class: studentClass,
      level,
      approvalStatus: 'pending', // Students need approval
      savedConfiguration: {},
      progress: {
        module1: 0,
        module2: 0,
        module3: 0,
        module4: 0,
        module5: 0,
      },
    });

    res.status(201).json({
      message: 'Registration submitted successfully. Please wait for approval from your teacher or administrator.',
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        school: user.schoolName,
        class: user.class,
        level: user.level,
        approvalStatus: user.approvalStatus,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    
    res.status(500).json({ message: 'Server error during registration' });
  }
}
