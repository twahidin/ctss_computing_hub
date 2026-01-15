import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import { Assignment, Submission, User } from '@/models';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const user = session.user;

  // Only teachers and admins can access
  if (!['teacher', 'admin', 'super_admin'].includes(user.profile)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  await dbConnect();

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, session);
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
    const { status, withStats } = req.query;

    // Get teacher's assignments
    let query: any = { teacher: user.id };
    if (status) query.status = status;

    const assignments = await Assignment.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // If stats requested, get submission counts
    if (withStats === 'true') {
      // Get class students count
      const teacher = await User.findById(user.id).lean();
      
      const assignmentsWithStats = await Promise.all(
        assignments.map(async (assignment) => {
          // Count students in class
          const classStudents = await User.countDocuments({
            school: teacher?.school,
            class: assignment.class,
            profile: 'student',
            approvalStatus: 'approved',
          });

          // Get submission stats
          const submissions = await Submission.find({ assignment: assignment._id })
            .populate('student', 'name username')
            .lean();

          const draftSubmissions = submissions.filter(s => s.submissionType === 'draft');
          const finalSubmissions = submissions.filter(s => s.submissionType === 'final');
          const pendingApproval = finalSubmissions.filter(
            s => s.status === 'completed' && !s.approvedBy
          );
          const approved = finalSubmissions.filter(s => s.status === 'approved');
          const returned = finalSubmissions.filter(s => s.status === 'returned');

          // Calculate average score
          const gradedSubmissions = finalSubmissions.filter(
            s => s.marksAwarded !== undefined && s.marksTotal
          );
          const averageScore = gradedSubmissions.length > 0
            ? Math.round(
                gradedSubmissions.reduce(
                  (sum, s) => sum + ((s.marksAwarded! / s.marksTotal!) * 100),
                  0
                ) / gradedSubmissions.length
              )
            : null;

          // Get students who haven't submitted
          const submittedStudentIds = finalSubmissions.map(
            s => s.student._id?.toString() || s.student.toString()
          );
          const notSubmitted = await User.find({
            school: teacher?.school,
            class: assignment.class,
            profile: 'student',
            approvalStatus: 'approved',
            _id: { $nin: submittedStudentIds },
          }).select('name username').lean();

          return {
            ...assignment,
            stats: {
              totalStudents: classStudents,
              draftCount: draftSubmissions.length,
              finalCount: finalSubmissions.length,
              pendingApprovalCount: pendingApproval.length,
              approvedCount: approved.length,
              returnedCount: returned.length,
              notSubmittedCount: notSubmitted.length,
              averageScore,
            },
            submissions: finalSubmissions.map(s => ({
              _id: s._id,
              student: s.student,
              status: s.status,
              submittedAt: s.submittedAt,
              marksAwarded: s.marksAwarded,
              marksTotal: s.marksTotal,
              percentage: s.percentage,
              grade: s.grade,
            })),
            notSubmitted,
          };
        })
      );

      return res.status(200).json(assignmentsWithStats);
    }

    return res.status(200).json(assignments);
  } catch (error: any) {
    console.error('Get teacher assignments error:', error);
    return res.status(500).json({ message: error.message });
  }
}
