import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotebook extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  content: object; // Jupyter notebook JSON structure
  module: 1 | 2 | 3 | 4 | 5;
  topic?: string;
  isTemplate: boolean;
  createdBy: mongoose.Types.ObjectId;
  lastModified: Date;
  tags: string[];
}

const NotebookSchema = new Schema<INotebook>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notebook title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    content: {
      type: Object,
      required: true,
      default: {
        cells: [],
        metadata: {
          kernelspec: {
            display_name: 'Python 3',
            language: 'python',
            name: 'python3',
          },
        },
        nbformat: 4,
        nbformat_minor: 4,
      },
    },
    module: {
      type: Number,
      enum: [1, 2, 3, 4, 5],
      required: true,
    },
    topic: {
      type: String,
      trim: true,
    },
    isTemplate: {
      type: Boolean,
      default: false,
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
    tags: [{
      type: String,
      trim: true,
    }],
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
NotebookSchema.index({ userId: 1, module: 1 });
NotebookSchema.index({ isTemplate: 1, module: 1 });

const Notebook: Model<INotebook> =
  mongoose.models.Notebook || mongoose.model<INotebook>('Notebook', NotebookSchema);

export default Notebook;
