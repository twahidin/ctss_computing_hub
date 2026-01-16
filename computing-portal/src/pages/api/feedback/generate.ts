import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import { Submission, Assignment, Feedback, LearningProfile } from '@/models';
import { extractTextFromPDF } from '@/lib/pdfService';
import { generateDraftFeedback, markFinalSubmission } from '@/lib/aiMarkingService';
import { promises as fs } from 'fs';
import path from 'path';

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

  await dbConnect();

  try {
    const { submissionId } = req.body;

    if (!submissionId) {
      return res.status(400).json({ message: 'Submission ID is required' });
    }

    // Get submission with assignment
    const submission = await Submission.findById(submissionId)
      .populate('assignment')
      .populate('student', 'name username');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Check permissions
    const user = session.user;
    const isOwner = submission.student._id?.toString() === user.id;
    const isTeacherOrAdmin = ['teacher', 'admin', 'super_admin'].includes(user.profile);

    if (!isOwner && !isTeacherOrAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update submission status
    submission.status = 'processing';
    await submission.save();

    // Read PDF file
    const pdfPath = path.join(process.cwd(), submission.pdfUrl.replace(/^\//, ''));
    const pdfBuffer = await fs.readFile(pdfPath);

    // Extract text from PDF
    const { text: extractedText, numPages } = await extractTextFromPDF(pdfBuffer);

    if (!extractedText || extractedText.trim().length < 20) {
      submission.status = 'failed';
      submission.errorMessage = 'Could not extract readable text from PDF';
      await submission.save();
      return res.status(400).json({ message: 'Could not extract readable text from PDF' });
    }

    // Save extracted text
    submission.extractedText = extractedText;

    const assignment = submission.assignment as any;

    // Get student's learning profile for ability level
    let abilityLevel: string | undefined;
    const learningProfile = await LearningProfile.findOne({ student: submission.student._id });
    if (learningProfile) {
      abilityLevel = learningProfile.overallAbilityLevel;
    }

    let feedback;
    const startTime = Date.now();

    if (submission.submissionType === 'draft') {
      // Generate draft feedback (no marks)
      const draftResult = await generateDraftFeedback(
        assignment.title,
        assignment.subject,
        assignment.topic,
        assignment.questions,
        extractedText,
        abilityLevel
      );

      feedback = new Feedback({
        submission: submission._id,
        student: submission.student._id,
        assignment: assignment._id,
        feedbackType: 'draft',
        overallFeedback: draftResult.overallFeedback,
        overallStrengths: draftResult.overallStrengths,
        overallImprovements: draftResult.overallImprovements,
        questionFeedback: draftResult.questionFeedback,
        aiModel: 'claude-sonnet-4-20250514',
        processingTime: Date.now() - startTime,
      });
    } else {
      // Generate final marking
      const markingResult = await markFinalSubmission(
        assignment.title,
        assignment.subject,
        assignment.topic,
        assignment.questions,
        extractedText,
        assignment.totalMarks
      );

      feedback = new Feedback({
        submission: submission._id,
        student: submission.student._id,
        assignment: assignment._id,
        feedbackType: 'final',
        overallFeedback: markingResult.overallFeedback,
        overallStrengths: markingResult.overallStrengths,
        overallImprovements: markingResult.overallImprovements,
        questionFeedback: markingResult.questionFeedback,
        totalMarksAwarded: markingResult.totalMarksAwarded,
        totalMarksPossible: markingResult.totalMarksPossible,
        percentage: markingResult.percentage,
        grade: markingResult.grade,
        topicScores: markingResult.topicScores,
        aiModel: 'claude-sonnet-4-20250514',
        processingTime: Date.now() - startTime,
      });

      // Update submission with marks
      submission.marksAwarded = markingResult.totalMarksAwarded;
      submission.marksTotal = markingResult.totalMarksPossible;
      submission.percentage = markingResult.percentage;
      submission.grade = markingResult.grade;

      // Update learning profile
      await updateLearningProfile(
        submission.student._id.toString(),
        assignment,
        markingResult
      );
    }

    await feedback.save();

    // Update submission status
    submission.status = 'completed';
    submission.feedbackGeneratedAt = new Date();
    await submission.save();

    // Return populated feedback
    const populatedFeedback = await Feedback.findById(feedback._id)
      .populate('student', 'name username')
      .populate('assignment', 'title subject topic')
      .lean();

    return res.status(200).json({
      success: true,
      feedback: populatedFeedback,
      submission: {
        _id: submission._id,
        status: submission.status,
        marksAwarded: submission.marksAwarded,
        marksTotal: submission.marksTotal,
        percentage: submission.percentage,
        grade: submission.grade,
      },
    });
  } catch (error: any) {
    console.error('Generate feedback error:', error);

    // Update submission status to failed
    try {
      const { submissionId } = req.body;
      if (submissionId) {
        await Submission.findByIdAndUpdate(submissionId, {
          status: 'failed',
          errorMessage: error.message,
        });
      }
    } catch (updateError) {
      console.error('Failed to update submission status:', updateError);
    }

    return res.status(500).json({ message: error.message });
  }
}

async function updateLearningProfile(
  studentId: string,
  assignment: any,
  markingResult: any
) {
  try {
    let profile = await LearningProfile.findOne({ student: studentId });

    if (!profile) {
      profile = new LearningProfile({
        student: studentId,
        school: assignment.school,
        subjectPerformance: [],
        recentGrades: [],
        strongTopics: [],
        weakTopics: [],
        totalSubmissions: 0,
        draftSubmissions: 0,
        finalSubmissions: 0,
      });
    }

    // Update submission counts
    profile.totalSubmissions += 1;
    profile.finalSubmissions += 1;

    // Add to recent grades
    profile.recentGrades.unshift({
      assignmentId: assignment._id,
      subject: assignment.subject,
      topic: assignment.topic,
      percentage: markingResult.percentage,
      grade: markingResult.grade,
      date: new Date(),
    });

    // Keep only last 10 grades
    if (profile.recentGrades.length > 10) {
      profile.recentGrades = profile.recentGrades.slice(0, 10);
    }

    // Update subject performance
    let subjectPerf = profile.subjectPerformance.find(
      sp => sp.subject === assignment.subject
    );

    if (!subjectPerf) {
      subjectPerf = {
        subject: assignment.subject,
        averageScore: 0,
        totalAssignments: 0,
        completedAssignments: 0,
        topics: [],
        lastActivityDate: new Date(),
      };
      profile.subjectPerformance.push(subjectPerf);
    }

    subjectPerf.completedAssignments += 1;
    subjectPerf.lastActivityDate = new Date();

    // Recalculate average for subject
    const subjectGrades = profile.recentGrades.filter(
      g => g.subject === assignment.subject
    );
    if (subjectGrades.length > 0) {
      subjectPerf.averageScore = Math.round(
        subjectGrades.reduce((sum, g) => sum + g.percentage, 0) / subjectGrades.length
      );
    }

    // Update topic performance
    if (markingResult.topicScores) {
      for (const [topicName, scores] of Object.entries(markingResult.topicScores)) {
        const topicScore = scores as { awarded: number; possible: number; percentage: number };
        let topicPerf = subjectPerf.topics.find(t => t.topic === topicName);

        if (!topicPerf) {
          topicPerf = {
            topic: topicName,
            subject: assignment.subject,
            totalAttempts: 0,
            correctAttempts: 0,
            averageScore: 0,
            lastAttemptDate: new Date(),
            trend: 'stable',
            strengthLevel: 'developing',
          };
          subjectPerf.topics.push(topicPerf);
        }

        topicPerf.totalAttempts += 1;
        topicPerf.lastAttemptDate = new Date();

        // Update average score
        const oldTotal = topicPerf.averageScore * (topicPerf.totalAttempts - 1);
        topicPerf.averageScore = Math.round(
          (oldTotal + topicScore.percentage) / topicPerf.totalAttempts
        );

        // Update strength level
        if (topicPerf.averageScore >= 85) {
          topicPerf.strengthLevel = 'strong';
        } else if (topicPerf.averageScore >= 70) {
          topicPerf.strengthLevel = 'proficient';
        } else if (topicPerf.averageScore >= 50) {
          topicPerf.strengthLevel = 'developing';
        } else {
          topicPerf.strengthLevel = 'weak';
        }
      }
    }

    // Update strong and weak topics
    const allTopics = profile.subjectPerformance.flatMap(sp => sp.topics);
    profile.strongTopics = allTopics
      .filter(t => t.strengthLevel === 'strong')
      .map(t => `${t.subject}: ${t.topic}`);
    profile.weakTopics = allTopics
      .filter(t => t.strengthLevel === 'weak')
      .map(t => `${t.subject}: ${t.topic}`);

    // Update overall ability level based on recent performance
    const recentAverage = profile.recentGrades.length > 0
      ? profile.recentGrades.reduce((sum, g) => sum + g.percentage, 0) / profile.recentGrades.length
      : 50;

    if (recentAverage >= 75) {
      profile.overallAbilityLevel = 'above_grade';
    } else if (recentAverage >= 50) {
      profile.overallAbilityLevel = 'at_grade';
    } else {
      profile.overallAbilityLevel = 'below_grade';
    }

    profile.proficiencyUpdatedAt = new Date();
    await profile.save();
  } catch (error) {
    console.error('Error updating learning profile:', error);
    // Don't throw - this shouldn't fail the main operation
  }
}
