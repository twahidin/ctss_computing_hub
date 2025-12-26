/**
 * Database Seed Script
 * 
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed.ts
 * Or add to package.json: "seed": "ts-node scripts/seed.ts"
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/computing-portal';

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await mongoose.connection.dropDatabase();
    console.log('Cleared existing data');

    // Create demo users
    const hashedPassword = await bcrypt.hash('password123', 12);

    const users = await mongoose.connection.collection('users').insertMany([
      {
        email: 'student@demo.com',
        password: hashedPassword,
        name: 'Demo Student',
        studentId: 'S00001',
        role: 'student',
        class: '4A',
        progress: {
          module1: 25,
          module2: 40,
          module3: 15,
          module4: 10,
          module5: 5,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        email: 'teacher@demo.com',
        password: hashedPassword,
        name: 'Demo Teacher',
        studentId: 'T00001',
        role: 'teacher',
        progress: {
          module1: 100,
          module2: 100,
          module3: 100,
          module4: 100,
          module5: 100,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        email: 'admin@demo.com',
        password: hashedPassword,
        name: 'Admin User',
        studentId: 'A00001',
        role: 'admin',
        progress: {
          module1: 100,
          module2: 100,
          module3: 100,
          module4: 100,
          module5: 100,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    console.log(`Created ${users.insertedCount} demo users`);

    // Create sample notebook templates
    const adminId = users.insertedIds[2];

    await mongoose.connection.collection('notebooks').insertMany([
      {
        userId: adminId,
        title: 'Introduction to Python Variables',
        description: 'Learn about variables and data types in Python',
        content: {
          cells: [
            {
              id: '1',
              type: 'markdown',
              content: '# Variables and Data Types\n\nIn Python, variables are used to store data values.',
            },
            {
              id: '2',
              type: 'code',
              content: '# Creating variables\nname = "Alice"\nage = 16\nheight = 1.65\nis_student = True\n\nprint(f"Name: {name}")\nprint(f"Age: {age}")\nprint(f"Height: {height}")\nprint(f"Is Student: {is_student}")',
            },
          ],
        },
        module: 2,
        topic: 'Python Code',
        isTemplate: true,
        createdBy: adminId,
        lastModified: new Date(),
        tags: ['python', 'variables', 'beginner'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        userId: adminId,
        title: 'List Operations Practice',
        description: 'Practice common list operations without using built-in functions',
        content: {
          cells: [
            {
              id: '1',
              type: 'markdown',
              content: '# List Operations\n\nPractice finding min, max, and sum without using built-in functions.',
            },
            {
              id: '2',
              type: 'code',
              content: '# Given list\nnumbers = [45, 23, 78, 12, 56, 89, 34]\n\n# TODO: Find the minimum value without using min()\nminimum = numbers[0]\nfor num in numbers:\n    if num < minimum:\n        minimum = num\n\nprint(f"Minimum: {minimum}")',
            },
          ],
        },
        module: 2,
        topic: 'Algorithm Design',
        isTemplate: true,
        createdBy: adminId,
        lastModified: new Date(),
        tags: ['python', 'lists', 'algorithms'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    console.log('Created sample notebook templates');

    // Create sample spreadsheet templates
    await mongoose.connection.collection('spreadsheets').insertMany([
      {
        userId: adminId,
        title: 'VLOOKUP Exercise',
        description: 'Practice using VLOOKUP to look up student grades',
        data: [
          {
            name: 'Sheet1',
            celldata: [
              { r: 0, c: 0, v: { v: 'Student ID', m: 'Student ID' } },
              { r: 0, c: 1, v: { v: 'Name', m: 'Name' } },
              { r: 0, c: 2, v: { v: 'Score', m: 'Score' } },
              { r: 1, c: 0, v: { v: 'S001', m: 'S001' } },
              { r: 1, c: 1, v: { v: 'Alice', m: 'Alice' } },
              { r: 1, c: 2, v: { v: 85, m: '85' } },
              { r: 2, c: 0, v: { v: 'S002', m: 'S002' } },
              { r: 2, c: 1, v: { v: 'Bob', m: 'Bob' } },
              { r: 2, c: 2, v: { v: 72, m: '72' } },
            ],
          },
        ],
        module: 3,
        topic: 'Lookup Functions',
        isTemplate: true,
        isExercise: true,
        exerciseConfig: {
          instructions: 'Use VLOOKUP to find the score for student S002',
          expectedFormulas: [
            { cell: 'E2', formula: '=VLOOKUP("S002",A1:C3,3,FALSE)' },
          ],
          hints: [
            'VLOOKUP syntax: =VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])',
            'Use FALSE for exact match',
          ],
        },
        createdBy: adminId,
        lastModified: new Date(),
        tags: ['vlookup', 'lookup', 'functions'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    console.log('Created sample spreadsheet templates');

    console.log('\n✅ Database seeded successfully!');
    console.log('\nDemo accounts:');
    console.log('  Student: student@demo.com / password123');
    console.log('  Teacher: teacher@demo.com / password123');
    console.log('  Admin: admin@demo.com / password123');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
