import mongoose, { Schema, Document, Model } from 'mongoose';

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'mixed';
export type AssignmentStatus = 'draft' | 'published' | 'archived';

export interface IQuestion {
  id: string;
  question: string;
  type: 'mcq' | 'short_answer' | 'long_answer' | 'calculation';
  marks: number;
  markingScheme?: string;
  modelAnswer?: string;
  topic?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface IAssignment extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  subject: string;
  topic: string;
  grade: string;
  teacher: mongoose.Types.ObjectId;
  school: mongoose.Types.ObjectId;
  class: string;
  learningOutcomes: string[];
  questions: IQuestion[];
  totalMarks: number;
  dueDate?: Date;
  status: AssignmentStatus;
  difficulty: DifficultyLevel;
  knowledgeBasePdf?: string; // URL to uploaded knowledge base PDF
  allowDraftSubmissions: boolean;
  requiresApproval: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema({
  id: { type: String, required: true },
  question: { type: String, required: true },
  type: {
    type: String,
    enum: ['mcq', 'short_answer', 'long_answer', 'calculation'],
    default: 'short_answer',
  },
  marks: { type: Number, required: true, min: 1 },
  markingScheme: { type: String },
  modelAnswer: { type: String },
  topic: { type: String },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  },
});

const AssignmentSchema = new Schema<IAssignment>(
  {
    title: {
      type: String,
      required: [true, 'Assignment title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    topic: {
      type: String,
      required: [true, 'Topic is required'],
      trim: true,
    },
    grade: {
      type: String,
      required: [true, 'Grade level is required'],
      trim: true,
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    school: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    class: {
      type: String,
      required: [true, 'Class is required'],
      trim: true,
    },
    learningOutcomes: [{
      type: String,
      trim: true,
    }],
    questions: [QuestionSchema],
    totalMarks: {
      type: Number,
      required: true,
      min: 1,
      default: 100,
    },
    dueDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'mixed'],
      default: 'medium',
    },
    knowledgeBasePdf: {
      type: String,
    },
    allowDraftSubmissions: {
      type: Boolean,
      default: true,
    },
    requiresApproval: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
AssignmentSchema.index({ teacher: 1, status: 1 });
AssignmentSchema.index({ school: 1, class: 1, status: 1 });
AssignmentSchema.index({ subject: 1, topic: 1 });
AssignmentSchema.index({ dueDate: 1 });

const Assignment: Model<IAssignment> =
  mongoose.models.Assignment || mongoose.model<IAssignment>('Assignment', AssignmentSchema);

export default Assignment;
