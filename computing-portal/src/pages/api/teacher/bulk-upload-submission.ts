import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import { Submission, Assignment, User, Notification } from '@/models';
import formidable from 'formidable';
import { promises as fs } from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const user = session.user;

  // Only teachers and admins can bulk upload
  if (!['teacher', 'admin', 'super_admin'].includes(user.profile)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  await dbConnect();

  try {
    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads', 'submissions');
    await fs.mkdir(uploadsDir, { recursive: true });

    // Parse form data
    const form = formidable({
      uploadDir: uploadsDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const assignmentId = Array.isArray(fields.assignmentId) ? fields.assignmentId[0] : fields.assignmentId;
    const studentUsername = Array.isArray(fields.studentUsername) ? fields.studentUsername[0] : fields.studentUsername;

    if (!assignmentId) {
      return res.status(400).json({ message: 'Assignment ID is required' });
    }

    // Validate assignment exists
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Get teacher info for school context
    const teacher = await User.findById(user.id).lean();
    if (!teacher?.school) {
      return res.status(400).json({ message: 'Teacher must be associated with a school' });
    }

    // Find student by username
    const student = await User.findOne({
      username: { $regex: new RegExp(`^${studentUsername}`, 'i') },
      school: teacher.school,
      profile: 'student',
    }).lean();

    if (!student) {
      // Clean up uploaded file
      const pdfFile = files.pdf;
      if (pdfFile) {
        const file = Array.isArray(pdfFile) ? pdfFile[0] : pdfFile;
        await fs.unlink(file.filepath).catch(() => {});
      }
      return res.status(404).json({ message: `Student not found: ${studentUsername}` });
    }

    // Get PDF file
    const pdfFile = files.pdf;
    if (!pdfFile) {
      return res.status(400).json({ message: 'PDF file is required' });
    }

    const file = Array.isArray(pdfFile) ? pdfFile[0] : pdfFile;
    
    // Verify it's a PDF
    if (!file.mimetype?.includes('pdf')) {
      await fs.unlink(file.filepath);
      return res.status(400).json({ message: 'Only PDF files are allowed' });
    }

    // Create relative URL for the file
    const relativePath = path.relative(process.cwd(), file.filepath);
    const pdfUrl = `/${relativePath.replace(/\\/g, '/')}`;

    // Check if submission already exists for this student/assignment
    const existingSubmission = await Submission.findOne({
      student: student._id,
      assignment: assignmentId,
      submissionType: 'final',
    });

    let submission;
    if (existingSubmission) {
      // Update existing submission
      existingSubmission.pdfUrl = pdfUrl;
      existingSubmission.pdfFileName = file.originalFilename || 'submission.pdf';
      existingSubmission.status = 'pending';
      existingSubmission.submittedAt = new Date();
      await existingSubmission.save();
      submission = existingSubmission;
    } else {
      // Create new submission
      submission = new Submission({
        student: student._id,
        assignment: assignmentId,
        submissionType: 'final',
        pdfUrl,
        pdfFileName: file.originalFilename || 'submission.pdf',
        status: 'pending',
        submittedAt: new Date(),
      });
      await submission.save();
    }

    // Create notification for the student
    await Notification.create({
      student: student._id,
      type: 'submission_received',
      title: 'Submission Received',
      message: `Your teacher has uploaded your submission for "${assignment.title}". It is now pending review.`,
      assignment: assignmentId,
      submission: submission._id,
      actionUrl: '/student/dashboard',
    });

    return res.status(201).json({
      success: true,
      studentName: student.name,
      studentUsername: student.username,
      submissionId: submission._id,
    });
  } catch (error: any) {
    console.error('Bulk upload error:', error);
    return res.status(500).json({ message: error.message });
  }
}
