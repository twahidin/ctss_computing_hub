import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISchool extends Document {
  _id: mongoose.Types.ObjectId;
  schoolName: string;
  schoolCode: string; // Unique identifier for the school
  listOfClasses: string[];
  listOfLevels: string[];
  listAccessibleFunctions: mongoose.Types.ObjectId[]; // References to Function collection
  isActive: boolean;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SchoolSchema = new Schema<ISchool>(
  {
    schoolName: {
      type: String,
      required: [true, 'School name is required'],
      trim: true,
      unique: true,
    },
    schoolCode: {
      type: String,
      required: [true, 'School code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    listOfClasses: {
      type: [String],
      default: [],
      validate: {
        validator: function (v: string[]) {
          return Array.isArray(v);
        },
        message: 'Classes must be an array',
      },
    },
    listOfLevels: {
      type: [String],
      default: [],
      validate: {
        validator: function (v: string[]) {
          return Array.isArray(v);
        },
        message: 'Levels must be an array',
      },
    },
    listAccessibleFunctions: {
      type: [Schema.Types.ObjectId],
      ref: 'Function',
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    address: {
      type: String,
      trim: true,
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    contactPhone: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
SchoolSchema.index({ schoolCode: 1 });
SchoolSchema.index({ isActive: 1 });

const School: Model<ISchool> =
  mongoose.models.School || mongoose.model<ISchool>('School', SchoolSchema);

export default School;

