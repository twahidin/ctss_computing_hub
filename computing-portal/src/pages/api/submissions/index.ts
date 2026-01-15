import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import { Submission, Assignment } from '@/models';
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
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  await dbConnect();

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, session);
    case 'POST':
      return handlePost(req, res, session);
    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  session: any
) {
  try {
    const user = session.user;
    const { assignmentId, status, submissionType } = req.query;

    let query: any = {};

    // Students see only their own submissions
    if (user.profile === 'student') {
      query.student = user.id;
    }
    // Teachers see submissions for their assignments
    else if (user.profile === 'teacher') {
      // Get teacher's assignments first
      const teacherAssignments = await Assignment.find({ teacher: user.id }).select('_id');
      query.assignment = { $in: teacherAssignments.map(a => a._id) };
    }

    // Additional filters
    if (assignmentId) query.assignment = assignmentId;
    if (status) query.status = status;
    if (submissionType) query.submissionType = submissionType;

    const submissions = await Submission.find(query)
      .populate('student', 'name username class')
      .populate('assignment', 'title subject topic totalMarks')
      .sort({ submittedAt: -1 })
      .lean();

    return res.status(200).json(submissions);
  } catch (error: any) {
    console.error('Get submissions error:', error);
    return res.status(500).json({ message: error.message });
  }
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  session: any
) {
  try {
    const user = session.user;

    // Only students can submit (or teachers on behalf of students)
    if (!['student', 'teacher', 'admin', 'super_admin'].includes(user.profile)) {
      return res.status(403).json({ message: 'Not authorized to submit' });
    }

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
    const submissionType = Array.isArray(fields.submissionType) ? fields.submissionType[0] : fields.submissionType;
    const studentId = Array.isArray(fields.studentId) ? fields.studentId[0] : fields.studentId;

    if (!assignmentId) {
      return res.status(400).json({ message: 'Assignment ID is required' });
    }

    // Validate assignment exists and is published
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (assignment.status !== 'published') {
      return res.status(400).json({ message: 'Assignment is not available for submission' });
    }

    // Check submission type
    const type = submissionType === 'final' ? 'final' : 'draft';
    if (type === 'draft' && !assignment.allowDraftSubmissions) {
      return res.status(400).json({ message: 'Draft submissions are not allowed for this assignment' });
    }

    // Get PDF file
    const pdfFile = files.pdf;
    if (!pdfFile) {
      return res.status(400).json({ message: 'PDF file is required' });
    }

    const file = Array.isArray(pdfFile) ? pdfFile[0] : pdfFile;
    
    // Verify it's a PDF
    if (!file.mimetype?.includes('pdf')) {
      // Clean up uploaded file
      await fs.unlink(file.filepath);
      return res.status(400).json({ message: 'Only PDF files are allowed' });
    }

    // Determine submitting student
    const submittingStudentId = user.profile === 'student' ? user.id : (studentId || user.id);

    // Create relative URL for the file
    const relativePath = path.relative(process.cwd(), file.filepath);
    const pdfUrl = `/${relativePath.replace(/\\/g, '/')}`;

    // Create submission
    const submission = new Submission({
      student: submittingStudentId,
      assignment: assignmentId,
      submissionType: type,
      pdfUrl,
      pdfFileName: file.originalFilename || 'submission.pdf',
      status: 'pending',
      submittedAt: new Date(),
    });

    await submission.save();

    // Return submission with populated fields
    const populatedSubmission = await Submission.findById(submission._id)
      .populate('student', 'name username')
      .populate('assignment', 'title subject topic')
      .lean();

    return res.status(201).json(populatedSubmission);
  } catch (error: any) {
    console.error('Create submission error:', error);
    return res.status(500).json({ message: error.message });
  }
}
