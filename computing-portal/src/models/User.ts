import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

// Profile types with hierarchy
export type UserProfile = 'student' | 'teacher' | 'admin' | 'super_admin';

// Approval status for new registrations
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ISavedConfiguration {
  theme?: string;
  language?: string;
  notifications?: boolean;
  dashboardLayout?: object;
  [key: string]: any;
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  email?: string;
  password: string;
  name: string;
  profile: UserProfile;
  school: mongoose.Types.ObjectId | null;
  schoolName?: string; // Denormalized for quick access
  class: string;
  level: string;
  savedConfiguration: ISavedConfiguration;
  approvalStatus: ApprovalStatus;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  progress: {
    module1: number;
    module2: number;
    module3: number;
    module4: number;
    module5: number;
  };
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [50, 'Username cannot exceed 50 characters'],
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true, // Allows multiple null values
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    profile: {
      type: String,
      enum: ['student', 'teacher', 'admin', 'super_admin'],
      default: 'student',
      required: true,
    },
    school: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      default: null,
    },
    schoolName: {
      type: String,
      trim: true,
    },
    class: {
      type: String,
      trim: true,
      default: '',
    },
    level: {
      type: String,
      trim: true,
      default: '',
    },
    savedConfiguration: {
      type: Schema.Types.Mixed,
      default: {},
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
    },
    lastLogin: {
      type: Date,
    },
    progress: {
      module1: { type: Number, default: 0, min: 0, max: 100 },
      module2: { type: Number, default: 0, min: 0, max: 100 },
      module3: { type: Number, default: 0, min: 0, max: 100 },
      module4: { type: Number, default: 0, min: 0, max: 100 },
      module5: { type: Number, default: 0, min: 0, max: 100 },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
UserSchema.index({ school: 1, class: 1 });
UserSchema.index({ school: 1, profile: 1 });
UserSchema.index({ approvalStatus: 1 });
UserSchema.index({ profile: 1, school: 1 });

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Static method to hash password (for password resets)
UserSchema.statics.hashPassword = async function (password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
