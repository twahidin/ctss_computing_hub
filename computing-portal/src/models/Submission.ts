import mongoose, { Schema, Document, Model } from 'mongoose';

export type SubmissionType = 'draft' | 'final';
export type SubmissionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'approved' | 'returned';

export interface ISubmission extends Document {
  _id: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  assignment: mongoose.Types.ObjectId;
  submissionType: SubmissionType;
  pdfUrl: string;
  pdfFileName: string;
  extractedText?: string;
  parsedData?: Record<string, any>;
  status: SubmissionStatus;
  errorMessage?: string;
  // Marks (populated after marking)
  marksAwarded?: number;
  marksTotal?: number;
  percentage?: number;
  grade?: string;
  // Teacher approval
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  teacherComments?: string;
  marksAdjusted?: boolean;
  adjustedMarks?: number;
  // Return to student
  returnedAt?: Date;
  returnedPdfUrl?: string;
  // Timestamps
  submittedAt: Date;
  feedbackGeneratedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubmissionSchema = new Schema<ISubmission>(
  {
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
    submissionType: {
      type: String,
      enum: ['draft', 'final'],
      required: true,
      default: 'draft',
    },
    pdfUrl: {
      type: String,
      required: [true, 'PDF URL is required'],
    },
    pdfFileName: {
      type: String,
      required: [true, 'PDF filename is required'],
    },
    extractedText: {
      type: String,
    },
    parsedData: {
      type: Schema.Types.Mixed,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'approved', 'returned'],
      default: 'pending',
      index: true,
    },
    errorMessage: {
      type: String,
    },
    marksAwarded: {
      type: Number,
      min: 0,
    },
    marksTotal: {
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
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    teacherComments: {
      type: String,
      maxlength: [2000, 'Teacher comments cannot exceed 2000 characters'],
    },
    marksAdjusted: {
      type: Boolean,
      default: false,
    },
    adjustedMarks: {
      type: Number,
      min: 0,
    },
    returnedAt: {
      type: Date,
    },
    returnedPdfUrl: {
      type: String,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    feedbackGeneratedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
SubmissionSchema.index({ student: 1, assignment: 1 });
SubmissionSchema.index({ assignment: 1, status: 1 });
SubmissionSchema.index({ student: 1, submissionType: 1 });
SubmissionSchema.index({ status: 1, submittedAt: -1 });

// Compound index for teacher views
SubmissionSchema.index({ assignment: 1, submissionType: 1, status: 1 });

const Submission: Model<ISubmission> =
  mongoose.models.Submission || mongoose.model<ISubmission>('Submission', SubmissionSchema);

export default Submission;
