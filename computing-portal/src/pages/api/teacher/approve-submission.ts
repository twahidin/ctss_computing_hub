import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import { Submission, Assignment, Feedback } from '@/models';

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

  // Only teachers and admins can approve
  if (!['teacher', 'admin', 'super_admin'].includes(user.profile)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  await dbConnect();

  try {
    const {
      submissionId,
      action, // 'approve' | 'return' | 'adjust'
      adjustedMarks,
      teacherComments,
      questionFeedbackUpdates, // Array of { questionId, marksAwarded, feedback }
    } = req.body;

    if (!submissionId || !action) {
      return res.status(400).json({ message: 'Submission ID and action are required' });
    }

    // Get submission
    const submission = await Submission.findById(submissionId)
      .populate('assignment');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Verify teacher owns this assignment
    if (user.profile === 'teacher') {
      const assignment = await Assignment.findById(submission.assignment._id);
      if (assignment?.teacher.toString() !== user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Handle different actions
    switch (action) {
      case 'approve':
        submission.status = 'approved';
        submission.approvedBy = user.id;
        submission.approvedAt = new Date();
        if (teacherComments) submission.teacherComments = teacherComments;
        break;

      case 'return':
        submission.status = 'returned';
        submission.returnedAt = new Date();
        submission.approvedBy = user.id;
        submission.approvedAt = new Date();
        if (teacherComments) submission.teacherComments = teacherComments;
        break;

      case 'adjust':
        if (adjustedMarks !== undefined) {
          submission.marksAdjusted = true;
          submission.adjustedMarks = adjustedMarks;
          submission.marksAwarded = adjustedMarks;
          // Recalculate percentage and grade
          if (submission.marksTotal) {
            submission.percentage = Math.round((adjustedMarks / submission.marksTotal) * 100 * 10) / 10;
            submission.grade = calculateGrade(submission.percentage);
          }
        }
        if (teacherComments) submission.teacherComments = teacherComments;
        break;

      default:
        return res.status(400).json({ message: 'Invalid action' });
    }

    await submission.save();

    // Update feedback if question feedback updates provided
    if (questionFeedbackUpdates && questionFeedbackUpdates.length > 0) {
      const feedback = await Feedback.findOne({
        submission: submissionId,
        feedbackType: 'final',
      });

      if (feedback) {
        let totalMarksChanged = false;
        let newTotal = 0;

        for (const update of questionFeedbackUpdates) {
          const qfIndex = feedback.questionFeedback.findIndex(
            qf => qf.questionId === update.questionId
          );

          if (qfIndex !== -1) {
            if (update.marksAwarded !== undefined) {
              feedback.questionFeedback[qfIndex].marksAwarded = update.marksAwarded;
              totalMarksChanged = true;
            }
            if (update.feedback !== undefined) {
              feedback.questionFeedback[qfIndex].feedback = update.feedback;
            }
          }
        }

        // Recalculate totals if marks changed
        if (totalMarksChanged) {
          newTotal = feedback.questionFeedback.reduce(
            (sum, qf) => sum + (qf.marksAwarded || 0),
            0
          );
          feedback.totalMarksAwarded = newTotal;
          if (feedback.totalMarksPossible) {
            feedback.percentage = Math.round((newTotal / feedback.totalMarksPossible) * 100 * 10) / 10;
            feedback.grade = calculateGrade(feedback.percentage);
          }
        }

        feedback.teacherModified = true;
        feedback.teacherModifiedAt = new Date();
        feedback.teacherModifiedBy = user.id;

        // Store original if not already stored
        if (!feedback.originalFeedback) {
          feedback.originalFeedback = {
            totalMarksAwarded: submission.marksAwarded,
            questionFeedback: feedback.questionFeedback.map(qf => ({
              questionId: qf.questionId,
              marksAwarded: qf.marksAwarded,
              feedback: qf.feedback,
            })),
          };
        }

        await feedback.save();

        // Update submission marks to match feedback
        if (totalMarksChanged) {
          submission.marksAwarded = newTotal;
          submission.marksAdjusted = true;
          submission.adjustedMarks = newTotal;
          if (submission.marksTotal) {
            submission.percentage = Math.round((newTotal / submission.marksTotal) * 100 * 10) / 10;
            submission.grade = calculateGrade(submission.percentage);
          }
          await submission.save();
        }
      }
    }

    // Return updated submission
    const updatedSubmission = await Submission.findById(submissionId)
      .populate('student', 'name username class')
      .populate('assignment', 'title subject topic')
      .populate('approvedBy', 'name username')
      .lean();

    return res.status(200).json({
      success: true,
      submission: updatedSubmission,
    });
  } catch (error: any) {
    console.error('Approve submission error:', error);
    return res.status(500).json({ message: error.message });
  }
}

function calculateGrade(percentage: number): string {
  if (percentage >= 90) return 'A1';
  if (percentage >= 80) return 'A2';
  if (percentage >= 75) return 'B3';
  if (percentage >= 70) return 'B4';
  if (percentage >= 65) return 'C5';
  if (percentage >= 60) return 'C6';
  if (percentage >= 55) return 'D7';
  if (percentage >= 50) return 'E8';
  return 'F9';
}
