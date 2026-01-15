import mongoose, { Schema, Document, Model } from 'mongoose';

export type FeedbackType = 'draft' | 'final';

export interface IQuestionFeedback {
  questionId: string;
  questionNumber: number;
  studentAnswer?: string;
  feedback: string;
  strengths?: string[];
  improvements?: string[];
  marksAwarded?: number;
  marksPossible: number;
  isCorrect?: boolean;
  canBeImproved?: boolean;
  suggestedAnswer?: string;
  topic?: string;
}

export interface IFeedback extends Document {
  _id: mongoose.Types.ObjectId;
  submission: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  assignment: mongoose.Types.ObjectId;
  feedbackType: FeedbackType;
  // Overall feedback
  overallFeedback: string;
  overallStrengths: string[];
  overallImprovements: string[];
  // Question-level feedback
  questionFeedback: IQuestionFeedback[];
  // Marks (only for final feedback)
  totalMarksAwarded?: number;
  totalMarksPossible?: number;
  percentage?: number;
  grade?: string;
  // Performance by topic (for learning profile)
  topicScores?: Record<string, { awarded: number; possible: number; percentage: number }>;
  // AI metadata
  aiModel?: string;
  aiConfidence?: number;
  processingTime?: number;
  // Teacher modifications
  teacherModified: boolean;
  teacherModifiedAt?: Date;
  teacherModifiedBy?: mongoose.Types.ObjectId;
  originalFeedback?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionFeedbackSchema = new Schema({
  questionId: { type: String, required: true },
  questionNumber: { type: Number, required: true },
  studentAnswer: { type: String },
  feedback: { type: String, required: true },
  strengths: [{ type: String }],
  improvements: [{ type: String }],
  marksAwarded: { type: Number, min: 0 },
  marksPossible: { type: Number, required: true, min: 0 },
  isCorrect: { type: Boolean },
  canBeImproved: { type: Boolean },
  suggestedAnswer: { type: String },
  topic: { type: String },
});

const FeedbackSchema = new Schema<IFeedback>(
  {
    submission: {
      type: Schema.Types.ObjectId,
      ref: 'Submission',
      required: true,
      index: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    assignment: {
      type: Schema.Types.ObjectId,
      ref: 'Assignment',
      required: true,
      index: true,
    },
    feedbackType: {
      type: String,
      enum: ['draft', 'final'],
      required: true,
    },
    overallFeedback: {
      type: String,
      required: true,
    },
    overallStrengths: [{
      type: String,
    }],
    overallImprovements: [{
      type: String,
    }],
    questionFeedback: [QuestionFeedbackSchema],
    totalMarksAwarded: {
      type: Number,
      min: 0,
    },
    totalMarksPossible: {
      type: Number,
      min: 0,
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    grade: {
      type: String,
    },
    topicScores: {
      type: Schema.Types.Mixed,
    },
    aiModel: {
      type: String,
    },
    aiConfidence: {
      type: Number,
      min: 0,
      max: 1,
    },
    processingTime: {
      type: Number,
    },
    teacherModified: {
      type: Boolean,
      default: false,
    },
    teacherModifiedAt: {
      type: Date,
    },
    teacherModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    originalFeedback: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
FeedbackSchema.index({ submission: 1, feedbackType: 1 });
FeedbackSchema.index({ student: 1, feedbackType: 1 });
FeedbackSchema.index({ assignment: 1, feedbackType: 1 });
FeedbackSchema.index({ student: 1, assignment: 1 });

const Feedback: Model<IFeedback> =
  mongoose.models.Feedback || mongoose.model<IFeedback>('Feedback', FeedbackSchema);

export default Feedback;
