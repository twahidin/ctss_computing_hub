/**
 * Database Cleanup Script
 * 
 * Removes deprecated functions and cleans up the database.
 * 
 * Run with: MONGODB_URI="your-connection-string" npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/cleanup-db.ts
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI environment variable is required');
  console.log('\nUsage:');
  console.log('  MONGODB_URI="mongodb+srv://..." npx ts-node --compiler-options \'{"module":"CommonJS"}\' scripts/cleanup-db.ts');
  process.exit(1);
}

async function cleanup() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    // ============================================
    // 1. List current functions
    // ============================================
    console.log('\n📋 Current Functions:');
    const functionsCollection = db.collection('functions');
    const currentFunctions = await functionsCollection.find({}).toArray();
    
    for (const func of currentFunctions) {
      console.log(`  - ${func.functionName} (${func.functionCode})`);
      console.log(`    Route: ${func.functionData?.route || 'N/A'}`);
      console.log(`    Profiles: ${func.profileFunctionList?.join(', ') || 'N/A'}`);
      console.log(`    Active: ${func.isActive}`);
    }

    // ============================================
    // 2. Remove deprecated functions
    // ============================================
    console.log('\n🗑️  Removing deprecated functions...');
    
    const deprecatedCodes = ['AI_TUTOR', 'SYLLABUS'];
    const removeResult = await functionsCollection.deleteMany({
      functionCode: { $in: deprecatedCodes }
    });
    console.log(`  Removed ${removeResult.deletedCount} deprecated functions`);

    // ============================================
    // 3. Ensure all required functions exist
    // ============================================
    console.log('\n📝 Ensuring required functions exist...');

    const requiredFunctions = [
      {
        functionName: 'Python Notebook',
        functionCode: 'PYTHON_NOTEBOOK',
        functionData: {
          description: 'Interactive Python programming environment',
          icon: '🐍',
          route: '/python',
          category: 'Programming',
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

    for (const func of requiredFunctions) {
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
    // 4. Update school function access
    // ============================================
    console.log('\n🏫 Updating school function access...');

    const allFunctions = await functionsCollection.find({}).toArray();
    const allFunctionIds = allFunctions.map(f => f._id);

    const schoolsCollection = db.collection('schools');
    const schools = await schoolsCollection.find({}).toArray();
    
    for (const school of schools) {
      await schoolsCollection.updateOne(
        { _id: school._id },
        { $set: { listAccessibleFunctions: allFunctionIds } }
      );
      console.log(`  ✅ Updated: ${school.schoolName}`);
    }

    // ============================================
    // 5. List users summary
    // ============================================
    console.log('\n👥 Users Summary:');
    const usersCollection = db.collection('users');
    
    const usersByProfile = await usersCollection.aggregate([
      { $group: { _id: '$profile', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray();

    for (const group of usersByProfile) {
      console.log(`  - ${group._id}: ${group.count} users`);
    }

    const pendingUsers = await usersCollection.find({ approvalStatus: 'pending' }).toArray();
    if (pendingUsers.length > 0) {
      console.log(`\n⏳ Pending Approval (${pendingUsers.length}):`);
      for (const user of pendingUsers) {
        console.log(`  - ${user.username} (${user.name}) - ${user.schoolName || 'No school'}`);
      }
    }

    // ============================================
    // 6. Remove progress field from users (deprecated)
    // ============================================
    console.log('\n🧹 Cleaning up deprecated user fields...');
    const cleanupResult = await usersCollection.updateMany(
      { progress: { $exists: true } },
      { $unset: { progress: '' } }
    );
    console.log(`  Removed 'progress' field from ${cleanupResult.modifiedCount} users`);

    // ============================================
    // Summary
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ Cleanup completed successfully!');
    console.log('='.repeat(60));

    console.log('\n📝 Final Functions:');
    const finalFunctions = await functionsCollection.find({}).sort({ functionName: 1 }).toArray();
    for (const func of finalFunctions) {
      console.log(`  - ${func.functionName}`);
      console.log(`    Route: ${func.functionData?.route}`);
      console.log(`    Profiles: ${func.profileFunctionList.join(', ')}`);
    }

    console.log('\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Cleanup error:', error);
    process.exit(1);
  }
}

cleanup();
