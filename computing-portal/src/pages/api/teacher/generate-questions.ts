import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import { Assignment, User, LearningProfile } from '@/models';
import { generateDifferentiatedQuestions } from '@/lib/aiMarkingService';

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

  // Only teachers and admins can generate questions
  if (!['teacher', 'admin', 'super_admin'].includes(user.profile)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  await dbConnect();

  try {
    const {
      assignmentId,
      subject,
      topic,
      learningOutcomes,
      additionalContext, // Optional: additional content from resource PDFs
      numQuestions,
      generateForClass, // If true, generate differentiated for each student
      classGroup,
    } = req.body;

    if (!subject || !topic || !learningOutcomes || learningOutcomes.length === 0) {
      return res.status(400).json({
        message: 'Subject, topic, and learning outcomes are required',
      });
    }

    // Combine learning outcomes with additional context from resources
    const combinedLearningOutcomes = additionalContext 
      ? [...learningOutcomes, `Additional Reference Material:\n${additionalContext}`]
      : learningOutcomes;

    const questionsCount = numQuestions || 10;

    // If generating for a class, create differentiated questions per student
    if (generateForClass && classGroup) {
      const teacher = await User.findById(user.id).lean();
      if (!teacher?.school) {
        return res.status(400).json({ message: 'Teacher must be associated with a school' });
      }

      // Get students in class
      const students = await User.find({
        school: teacher.school,
        class: classGroup,
        profile: 'student',
        approvalStatus: 'approved',
      }).select('_id name username').lean();

      const studentQuestions: Record<string, any> = {};

      // Generate questions for each student based on their ability level
      for (const student of students) {
        let abilityLevel: 'below_grade' | 'at_grade' | 'above_grade' = 'at_grade';
        let performanceHistory: { weakTopics?: string[]; strongTopics?: string[] } = {};

        // Get student's learning profile
        const profile = await LearningProfile.findOne({ student: student._id }).lean();
        if (profile) {
          abilityLevel = profile.overallAbilityLevel;
          performanceHistory = {
            weakTopics: profile.weakTopics,
            strongTopics: profile.strongTopics,
          };
        }

        const questions = await generateDifferentiatedQuestions(
          subject,
          topic,
          combinedLearningOutcomes,
          abilityLevel,
          questionsCount,
          performanceHistory
        );

        studentQuestions[student._id.toString()] = {
          student: {
            _id: student._id,
            name: student.name,
            username: student.username,
          },
          abilityLevel,
          questions,
        };
      }

      return res.status(200).json({
        success: true,
        generationType: 'differentiated',
        studentCount: students.length,
        studentQuestions,
      });
    }

    // Single set of questions (not differentiated)
    const questions = await generateDifferentiatedQuestions(
      subject,
      topic,
      combinedLearningOutcomes,
      'at_grade',
      questionsCount
    );

    // If assignmentId provided, update the assignment
    if (assignmentId) {
      const assignment = await Assignment.findById(assignmentId);
      if (assignment) {
        // Verify ownership
        if (user.profile === 'teacher' && assignment.teacher.toString() !== user.id) {
          return res.status(403).json({ message: 'Access denied' });
        }

        assignment.questions = questions;
        assignment.totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
        await assignment.save();
      }
    }

    return res.status(200).json({
      success: true,
      generationType: 'standard',
      questions,
      totalMarks: questions.reduce((sum, q) => sum + q.marks, 0),
    });
  } catch (error: any) {
    console.error('Generate questions error:', error);
    return res.status(500).json({ message: error.message });
  }
}
