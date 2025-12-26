import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IExercise extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  exerciseId: string;
  module: 1 | 2 | 3 | 4 | 5;
  topic: string;
  type: 'notebook' | 'spreadsheet' | 'quiz' | 'coding';
  status: 'not_started' | 'in_progress' | 'completed' | 'needs_review';
  attempts: number;
  score?: number;
  maxScore?: number;
  feedback?: string;
  submittedAnswer?: object;
  timeSpent: number; // in seconds
  startedAt?: Date;
  completedAt?: Date;
  aiHelpUsed: number;
}

const ExerciseSchema = new Schema<IExercise>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    exerciseId: {
      type: String,
      required: true,
    },
    module: {
      type: Number,
      enum: [1, 2, 3, 4, 5],
      required: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['notebook', 'spreadsheet', 'quiz', 'coding'],
      required: true,
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'needs_review'],
      default: 'not_started',
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    score: {
      type: Number,
      min: 0,
    },
    maxScore: {
      type: Number,
      min: 0,
    },
    feedback: {
      type: String,
    },
    submittedAnswer: {
      type: Object,
    },
    timeSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    aiHelpUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user exercises
ExerciseSchema.index({ userId: 1, exerciseId: 1 }, { unique: true });
ExerciseSchema.index({ userId: 1, module: 1 });
ExerciseSchema.index({ userId: 1, status: 1 });

const Exercise: Model<IExercise> =
  mongoose.models.Exercise || mongoose.model<IExercise>('Exercise', ExerciseSchema);

export default Exercise;
