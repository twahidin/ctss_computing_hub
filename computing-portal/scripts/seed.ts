/**
 * Database Seed Script - New Schema
 * 
 * Creates the initial data for the new MongoDB structure:
 * - Schools collection
 * - Functions collection  
 * - Users collection (with super_admin)
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

    // Ask for confirmation before clearing data
    console.log('\n⚠️  This will reset the database with new schema.');
    console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Clear existing data
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    const collections = await db.listCollections().toArray();
    for (const collection of collections) {
      await db.dropCollection(collection.name);
    }
    console.log('Cleared existing data');

    // Create password hash
    const defaultPassword = await bcrypt.hash('password123', 12);
    const superAdminPassword = await bcrypt.hash('SuperAdmin@123', 12);

    // ============================================
    // 1. Create Functions Collection
    // ============================================
    const functions = await db.collection('functions').insertMany([
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
        createdAt: new Date(),
        updatedAt: new Date(),
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
        createdAt: new Date(),
        updatedAt: new Date(),
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
        createdAt: new Date(),
        updatedAt: new Date(),
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
        createdAt: new Date(),
        updatedAt: new Date(),
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
        createdAt: new Date(),
        updatedAt: new Date(),
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
        createdAt: new Date(),
        updatedAt: new Date(),
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
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    console.log(`Created ${functions.insertedCount} functions`);
    const functionIds = Object.values(functions.insertedIds);

    // ============================================
    // 2. Create Schools Collection
    // ============================================
    const schools = await db.collection('schools').insertMany([
      {
        schoolName: 'Clementi Town Secondary School',
        schoolCode: 'CTSS',
        listOfClasses: ['4A', '4B', '4C', '4D', '4E', '5A', '5B', '5C', '5D', '5E'],
        listOfLevels: ['Secondary 4', 'Secondary 5'],
        listAccessibleFunctions: functionIds,
        isActive: true,
        address: '10 Clementi Ave 3, Singapore 129903',
        contactEmail: 'ctss@moe.edu.sg',
        contactPhone: '+65 6466 1326',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        schoolName: 'Demo Secondary School',
        schoolCode: 'DEMO',
        listOfClasses: ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B'],
        listOfLevels: ['Secondary 1', 'Secondary 2', 'Secondary 3', 'Secondary 4'],
        listAccessibleFunctions: functionIds,
        isActive: true,
        address: 'Demo Address',
        contactEmail: 'demo@school.edu.sg',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    console.log(`Created ${schools.insertedCount} schools`);
    const ctssSchoolId = schools.insertedIds[0];
    const demoSchoolId = schools.insertedIds[1];

    // ============================================
    // 3. Create Users Collection
    // ============================================
    const users = await db.collection('users').insertMany([
      // Super Admin - no school assignment
      {
        username: 'superadmin',
        password: superAdminPassword,
        name: 'Super Administrator',
        email: 'superadmin@system.com',
        profile: 'super_admin',
        school: null,
        schoolName: '',
        class: '',
        level: '',
        savedConfiguration: {},
        approvalStatus: 'approved',
        approvedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Admin for CTSS
      {
        username: 'ctss_admin',
        password: defaultPassword,
        name: 'CTSS Administrator',
        email: 'admin@ctss.edu.sg',
        profile: 'admin',
        school: ctssSchoolId,
        schoolName: 'Clementi Town Secondary School',
        class: '',
        level: '',
        savedConfiguration: {},
        approvalStatus: 'approved',
        approvedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Teacher for CTSS
      {
        username: 'ctss_teacher',
        password: defaultPassword,
        name: 'Mr. Demo Teacher',
        email: 'teacher@ctss.edu.sg',
        profile: 'teacher',
        school: ctssSchoolId,
        schoolName: 'Clementi Town Secondary School',
        class: '4A',
        level: 'Secondary 4',
        savedConfiguration: {},
        approvalStatus: 'approved',
        approvedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Student for CTSS (approved)
      {
        username: 'ctss_student1',
        password: defaultPassword,
        name: 'Alice Tan',
        email: 'alice@ctss.edu.sg',
        profile: 'student',
        school: ctssSchoolId,
        schoolName: 'Clementi Town Secondary School',
        class: '4A',
        level: 'Secondary 4',
        savedConfiguration: {},
        approvalStatus: 'approved',
        approvedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Student for CTSS (pending approval)
      {
        username: 'ctss_student2',
        password: defaultPassword,
        name: 'Bob Lee',
        profile: 'student',
        school: ctssSchoolId,
        schoolName: 'Clementi Town Secondary School',
        class: '4A',
        level: 'Secondary 4',
        savedConfiguration: {},
        approvalStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Demo School Admin
      {
        username: 'demo_admin',
        password: defaultPassword,
        name: 'Demo Admin',
        email: 'admin@demo.edu.sg',
        profile: 'admin',
        school: demoSchoolId,
        schoolName: 'Demo Secondary School',
        class: '',
        level: '',
        savedConfiguration: {},
        approvalStatus: 'approved',
        approvedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    console.log(`Created ${users.insertedCount} users`);

    // ============================================
    // 4. Create Indexes
    // ============================================
    console.log('\nCreating indexes...');
    
    await db.collection('users').createIndexes([
      { key: { username: 1 }, unique: true },
      { key: { school: 1, class: 1 } },
      { key: { school: 1, profile: 1 } },
      { key: { approvalStatus: 1 } },
    ]);

    await db.collection('schools').createIndexes([
      { key: { schoolCode: 1 }, unique: true },
      { key: { schoolName: 1 }, unique: true },
      { key: { isActive: 1 } },
    ]);

    await db.collection('functions').createIndexes([
      { key: { functionCode: 1 }, unique: true },
      { key: { isActive: 1 } },
      { key: { profileFunctionList: 1 } },
    ]);

    console.log('Indexes created');

    // ============================================
    // Print Summary
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ Database seeded successfully with new schema!');
    console.log('='.repeat(60));
    
    console.log('\n📊 Collections Created:');
    console.log('  - functions: System functions for the portal');
    console.log('  - schools: School configurations with classes and levels');
    console.log('  - users: User accounts with role-based access');
    
    console.log('\n🔐 Demo Accounts:');
    console.log('\n  SUPER ADMIN (Full System Access):');
    console.log('    Username: superadmin');
    console.log('    Password: SuperAdmin@123');
    
    console.log('\n  SCHOOL ADMIN - CTSS:');
    console.log('    Username: ctss_admin');
    console.log('    Password: password123');
    
    console.log('\n  TEACHER - CTSS (Class 4A):');
    console.log('    Username: ctss_teacher');
    console.log('    Password: password123');
    
    console.log('\n  STUDENT - CTSS (Approved):');
    console.log('    Username: ctss_student1');
    console.log('    Password: password123');
    
    console.log('\n  STUDENT - CTSS (Pending Approval):');
    console.log('    Username: ctss_student2');
    console.log('    Password: password123');
    
    console.log('\n  DEMO SCHOOL ADMIN:');
    console.log('    Username: demo_admin');
    console.log('    Password: password123');
    
    console.log('\n📝 Functions Available:');
    console.log('  - Python Notebook: All users');
    console.log('  - Spreadsheet: All users');
    console.log('  - Feedback & Help: Students only');
    console.log('  - Submit Assignment: Students only');
    console.log('  - My Progress: Students only');
    console.log('  - Assignment Dashboard: Teachers, Admins, Super Admin');
    console.log('  - Admin Dashboard: Teachers, Admins, Super Admin');
    
    console.log('\n📝 Role Permissions:');
    console.log('  - super_admin: Full system access, can edit MongoDB');
    console.log('  - admin: Manage school users, reset passwords, edit functions');
    console.log('  - teacher: Approve/reset passwords for students in their class');
    console.log('  - student: Access learning functions, self-registration');
    console.log('='.repeat(60) + '\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
