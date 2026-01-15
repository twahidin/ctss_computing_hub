import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import { LearningProfile, Submission, Feedback, User } from '@/models';

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
    const { studentId } = req.query;

    // Determine which student to get profile for
    let targetStudentId = user.id;

    // Teachers/admins can view other students' profiles
    if (studentId && ['teacher', 'admin', 'super_admin'].includes(user.profile)) {
      targetStudentId = studentId as string;
    } else if (studentId && studentId !== user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get or create learning profile
    let profile = await LearningProfile.findOne({ student: targetStudentId })
      .populate('student', 'name username class level')
      .lean();

    if (!profile) {
      // Create a new profile
      const student = await User.findById(targetStudentId).lean();
      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }

      const newProfile = new LearningProfile({
        student: targetStudentId,
        school: student.school,
        overallAbilityLevel: 'at_grade',
        subjectPerformance: [],
        recentGrades: [],
        strongTopics: [],
        weakTopics: [],
        recommendations: [],
        totalSubmissions: 0,
        draftSubmissions: 0,
        finalSubmissions: 0,
      });

      await newProfile.save();
      profile = await LearningProfile.findById(newProfile._id)
        .populate('student', 'name username class level')
        .lean();
    }

    // Get detailed submission history
    const submissions = await Submission.find({
      student: targetStudentId,
      status: { $in: ['completed', 'approved', 'returned'] },
    })
      .populate('assignment', 'title subject topic totalMarks')
      .sort({ submittedAt: -1 })
      .limit(20)
      .lean();

    // Get all feedback for these submissions
    const submissionIds = submissions.map(s => s._id);
    const feedbacks = await Feedback.find({
      submission: { $in: submissionIds },
    }).lean();

    // Map feedback to submissions
    const submissionsWithFeedback = submissions.map(sub => {
      const subFeedback = feedbacks.filter(
        f => f.submission.toString() === sub._id.toString()
      );
      return {
        ...sub,
        feedback: subFeedback,
      };
    });

    // Calculate progression data for visualization
    const progressionData = calculateProgressionData(submissionsWithFeedback);

    // Generate insights
    const insights = generateInsights(profile, submissionsWithFeedback);

    return res.status(200).json({
      profile,
      submissions: submissionsWithFeedback,
      progressionData,
      insights,
    });
  } catch (error: any) {
    console.error('Get learning profile error:', error);
    return res.status(500).json({ message: error.message });
  }
}

function calculateProgressionData(submissions: any[]) {
  // Group by subject
  const bySubject: Record<string, any[]> = {};
  
  for (const sub of submissions) {
    const subject = sub.assignment?.subject || 'Unknown';
    if (!bySubject[subject]) {
      bySubject[subject] = [];
    }
    bySubject[subject].push({
      date: sub.submittedAt,
      percentage: sub.percentage || 0,
      topic: sub.assignment?.topic,
      grade: sub.grade,
    });
  }

  // Sort each subject by date
  for (const subject of Object.keys(bySubject)) {
    bySubject[subject].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  // Calculate overall trend
  const allScores = submissions
    .filter(s => s.percentage !== undefined)
    .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())
    .map(s => ({
      date: s.submittedAt,
      percentage: s.percentage,
    }));

  // Calculate moving average (3-submission window)
  const movingAverage = allScores.map((score, index) => {
    const start = Math.max(0, index - 2);
    const window = allScores.slice(start, index + 1);
    const avg = window.reduce((sum, s) => sum + s.percentage, 0) / window.length;
    return {
      date: score.date,
      average: Math.round(avg * 10) / 10,
    };
  });

  return {
    bySubject,
    overall: allScores,
    movingAverage,
  };
}

function generateInsights(profile: any, submissions: any[]) {
  const insights: {
    type: 'strength' | 'improvement' | 'trend' | 'recommendation';
    title: string;
    description: string;
  }[] = [];

  // Strength insights
  if (profile?.strongTopics?.length > 0) {
    insights.push({
      type: 'strength',
      title: 'Strong Performance Areas',
      description: `You're performing well in: ${profile.strongTopics.slice(0, 3).join(', ')}`,
    });
  }

  // Improvement areas
  if (profile?.weakTopics?.length > 0) {
    insights.push({
      type: 'improvement',
      title: 'Areas to Focus On',
      description: `Consider reviewing: ${profile.weakTopics.slice(0, 3).join(', ')}`,
    });
  }

  // Trend analysis
  if (submissions.length >= 3) {
    const recent = submissions.slice(0, 3);
    const older = submissions.slice(3, 6);

    if (older.length > 0) {
      const recentAvg = recent.reduce((sum, s) => sum + (s.percentage || 0), 0) / recent.length;
      const olderAvg = older.reduce((sum, s) => sum + (s.percentage || 0), 0) / older.length;
      const diff = recentAvg - olderAvg;

      if (diff > 5) {
        insights.push({
          type: 'trend',
          title: 'Improving Performance',
          description: `Your recent scores have improved by ${Math.round(diff)}% compared to earlier work. Keep it up!`,
        });
      } else if (diff < -5) {
        insights.push({
          type: 'trend',
          title: 'Performance Dip',
          description: `Your recent scores have dropped by ${Math.round(Math.abs(diff))}%. Consider reviewing recent topics or seeking help.`,
        });
      } else {
        insights.push({
          type: 'trend',
          title: 'Consistent Performance',
          description: 'Your performance has been steady. Challenge yourself with harder problems!',
        });
      }
    }
  }

  // Submission pattern
  if (profile?.draftSubmissions > 0 && profile?.finalSubmissions > 0) {
    const draftRatio = profile.draftSubmissions / profile.totalSubmissions;
    if (draftRatio > 0.3) {
      insights.push({
        type: 'recommendation',
        title: 'Great Use of Draft Feedback',
        description: 'You\'re effectively using draft submissions to improve before final submission.',
      });
    }
  }

  // Ability level recommendation
  if (profile?.overallAbilityLevel === 'above_grade') {
    insights.push({
      type: 'recommendation',
      title: 'Ready for Challenges',
      description: 'Your performance suggests you\'re ready for more challenging problems!',
    });
  } else if (profile?.overallAbilityLevel === 'below_grade') {
    insights.push({
      type: 'recommendation',
      title: 'Building Foundations',
      description: 'Focus on strengthening core concepts before moving to advanced topics.',
    });
  }

  return insights;
}
