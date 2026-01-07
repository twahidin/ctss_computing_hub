import mongoose, { Schema, Document, Model } from 'mongoose';
import { UserProfile } from './User';

export interface IFunctionData {
  description?: string;
  icon?: string;
  route?: string;
  category?: string;
  settings?: object;
  uploadedData?: {
    fileName?: string;
    fileType?: string;
    uploadedAt?: Date;
    uploadedBy?: mongoose.Types.ObjectId;
    data?: any;
  }[];
  [key: string]: any;
}

export interface IFunction extends Document {
  _id: mongoose.Types.ObjectId;
  functionName: string;
  functionCode: string; // Unique identifier for the function
  functionData: IFunctionData;
  // Which profiles can access this function by default
  profileFunctionList: UserProfile[];
  isActive: boolean;
  isSystemFunction: boolean; // System functions cannot be deleted by admins
  createdAt: Date;
  updatedAt: Date;
}

const FunctionSchema = new Schema<IFunction>(
  {
    functionName: {
      type: String,
      required: [true, 'Function name is required'],
      trim: true,
    },
    functionCode: {
      type: String,
      required: [true, 'Function code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    functionData: {
      description: String,
      icon: String,
      route: String,
      category: String,
      settings: Schema.Types.Mixed,
      uploadedData: [{
        fileName: String,
        fileType: String,
        uploadedAt: Date,
        uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        data: Schema.Types.Mixed,
      }],
    },
    profileFunctionList: {
      type: [String],
      enum: ['student', 'teacher', 'admin', 'super_admin'],
      default: ['student', 'teacher', 'admin', 'super_admin'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isSystemFunction: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
FunctionSchema.index({ functionCode: 1 });
FunctionSchema.index({ isActive: 1 });
FunctionSchema.index({ profileFunctionList: 1 });

const Function: Model<IFunction> =
  mongoose.models.Function || mongoose.model<IFunction>('Function', FunctionSchema);

export default Function;

