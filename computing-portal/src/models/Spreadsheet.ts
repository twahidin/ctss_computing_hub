import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISpreadsheet extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  data: object[]; // FortuneSheet data structure
  module: 3; // Spreadsheets are Module 3
  topic?: string;
  isTemplate: boolean;
  isExercise: boolean;
  exerciseConfig?: {
    instructions: string;
    expectedFormulas?: { cell: string; formula: string }[];
    expectedValues?: { cell: string; value: any }[];
    hints?: string[];
    maxAttempts?: number;
  };
  createdBy: mongoose.Types.ObjectId;
  lastModified: Date;
  tags: string[];
}

const SpreadsheetSchema = new Schema<ISpreadsheet>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Spreadsheet title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    data: {
      type: [Object],
      required: true,
      default: [
        {
          name: 'Sheet1',
          celldata: [],
          config: {},
        },
      ],
    },
    module: {
      type: Number,
      default: 3,
      immutable: true,
    },
    topic: {
      type: String,
      trim: true,
    },
    isTemplate: {
      type: Boolean,
      default: false,
    },
    isExercise: {
      type: Boolean,
      default: false,
    },
    exerciseConfig: {
      instructions: String,
      expectedFormulas: [
        {
          cell: String,
          formula: String,
        },
      ],
      expectedValues: [
        {
          cell: String,
          value: Schema.Types.Mixed,
        },
      ],
      hints: [String],
      maxAttempts: Number,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastModified: {
      type: Date,
      default: Date.now,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
SpreadsheetSchema.index({ userId: 1 });
SpreadsheetSchema.index({ isTemplate: 1 });
SpreadsheetSchema.index({ isExercise: 1 });

const Spreadsheet: Model<ISpreadsheet> =
  mongoose.models.Spreadsheet ||
  mongoose.model<ISpreadsheet>('Spreadsheet', SpreadsheetSchema);

export default Spreadsheet;
