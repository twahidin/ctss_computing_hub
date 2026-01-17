/**
 * Migration Script - Update Functions
 * 
 * Updates the functions collection without clearing other data.
 * Removes AI Tutor and Syllabus, adds new student functions.
 * 
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-functions.ts
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/computing-portal';

async function migrate() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const functionsCollection = db.collection('functions');

    // ============================================
    // 1. Remove deprecated functions
    // ============================================
    console.log('\n🗑️  Removing deprecated functions...');
    
    const removeResult = await functionsCollection.deleteMany({
      functionCode: { $in: ['AI_TUTOR', 'SYLLABUS'] }
    });
    console.log(`  Removed ${removeResult.deletedCount} deprecated functions`);

    // ============================================
    // 2. Add/Update functions
    // ============================================
    console.log('\n📝 Adding/Updating functions...');

    const functionsToUpsert = [
      {
        functionName: 'Python Notebook',
        functionCode: 'PYTHON_NOTEBOOK',
        functionData: {
          description: 'Interactive Python programming environment',
          icon: '🐍',
          route: '/python',
          category: 'Programming',
          settings: {
            maxExecutionTime: 30,
            allowFileAccess: false,
          },
        },
        profileFunctionList: ['student', 'teacher', 'admin', 'super_admin'],
        isActive: true,
        isSystemFunction: true,
      },
      {
        functionName: 'Spreadsheet',
        functionCode: 'SPREADSHEET',
        functionData: {
          description: 'Excel-like spreadsheet for data manipulation',
          icon: '📊',
          route: '/spreadsheet',
          category: 'Data',
        },
        profileFunctionList: ['student', 'teacher', 'admin', 'super_admin'],
        isActive: true,
        isSystemFunction: true,
      },
      {
        functionName: 'Feedback & Help',
        functionCode: 'FEEDBACK_HELP',
        functionData: {
          description: 'View feedback and get help',
          icon: '📝',
          route: '/feedback-help',
          category: 'Student',
        },
        profileFunctionList: ['student'],
        isActive: true,
        isSystemFunction: true,
      },
      {
        functionName: 'Submit Assignment',
        functionCode: 'SUBMIT_ASSIGNMENT',
        functionData: {
          description: 'Upload and submit assignments',
          icon: '📤',
          route: '/submission',
          category: 'Student',
        },
        profileFunctionList: ['student'],
        isActive: true,
        isSystemFunction: true,
      },
      {
        functionName: 'My Progress',
        functionCode: 'STUDENT_DASHBOARD',
        functionData: {
          description: 'View your progress and notifications',
          icon: '📈',
          route: '/student/dashboard',
          category: 'Student',
        },
        profileFunctionList: ['student'],
        isActive: true,
        isSystemFunction: true,
      },
      {
        functionName: 'Assignment Dashboard',
        functionCode: 'ASSIGNMENT_DASHBOARD',
        functionData: {
          description: 'Create and manage assignments',
          icon: '📋',
          route: '/teacher/assignments',
          category: 'Teaching',
        },
        profileFunctionList: ['teacher', 'admin', 'super_admin'],
        isActive: true,
        isSystemFunction: true,
      },
      {
        functionName: 'Admin Dashboard',
        functionCode: 'ADMIN_DASHBOARD',
        functionData: {
          description: 'User and school management',
          icon: '⚙️',
          route: '/admin',
          category: 'Administration',
        },
        profileFunctionList: ['teacher', 'admin', 'super_admin'],
        isActive: true,
        isSystemFunction: true,
      },
    ];

    for (const func of functionsToUpsert) {
      const result = await functionsCollection.updateOne(
        { functionCode: func.functionCode },
        {
          $set: {
            ...func,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );

      if (result.upsertedCount > 0) {
        console.log(`  ✅ Created: ${func.functionName}`);
      } else if (result.modifiedCount > 0) {
        console.log(`  🔄 Updated: ${func.functionName}`);
      } else {
        console.log(`  ℹ️  No changes: ${func.functionName}`);
      }
    }

    // ============================================
    // 3. Update school accessible functions
    // ============================================
    console.log('\n🏫 Updating school function access...');

    const allFunctions = await functionsCollection.find({}).toArray();
    const allFunctionIds = allFunctions.map(f => f._id);

    const schoolsCollection = db.collection('schools');
    const schoolUpdateResult = await schoolsCollection.updateMany(
      {},
      { $set: { listAccessibleFunctions: allFunctionIds } }
    );
    console.log(`  Updated ${schoolUpdateResult.modifiedCount} schools with new function access`);

    // ============================================
    // Summary
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration completed successfully!');
    console.log('='.repeat(60));

    console.log('\n📝 Current Functions:');
    const finalFunctions = await functionsCollection.find({}).sort({ functionName: 1 }).toArray();
    for (const func of finalFunctions) {
      console.log(`  - ${func.functionName} (${func.functionCode})`);
      console.log(`    Profiles: ${func.profileFunctionList.join(', ')}`);
    }

    console.log('\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

migrate();
