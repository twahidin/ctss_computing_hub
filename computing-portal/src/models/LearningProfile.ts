import mongoose, { Schema, Document, Model } from 'mongoose';

export type AbilityLevel = 'below_grade' | 'at_grade' | 'above_grade';

export interface ITopicPerformance {
  topic: string;
  subject: string;
  totalAttempts: number;
  correctAttempts: number;
  averageScore: number;
  lastAttemptDate: Date;
  trend: 'improving' | 'stable' | 'declining';
  strengthLevel: 'weak' | 'developing' | 'proficient' | 'strong';
}

export interface ISubjectPerformance {
  subject: string;
  averageScore: number;
  totalAssignments: number;
  completedAssignments: number;
  topics: ITopicPerformance[];
  lastActivityDate: Date;
}

export interface ILearningProfile extends Document {
  _id: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  school: mongoose.Types.ObjectId;
  // Overall metrics
  overallAbilityLevel: AbilityLevel;
  abilityLevelSetBy?: mongoose.Types.ObjectId;
  abilityLevelUpdatedAt?: Date;
  // Subject performance
  subjectPerformance: ISubjectPerformance[];
  // Recent grades (last 10)
  recentGrades: {
    assignmentId: mongoose.Types.ObjectId;
    subject: string;
    topic: string;
    percentage: number;
    grade: string;
    date: Date;
  }[];
  // Strengths and weaknesses
  strongTopics: string[];
  weakTopics: string[];
  // Learning recommendations
  recommendations: {
    type: 'review' | 'practice' | 'challenge';
    topic: string;
    subject: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
    createdAt: Date;
  }[];
  // Engagement metrics
  totalSubmissions: number;
  draftSubmissions: number;
  finalSubmissions: number;
  averageResponseTime?: number; // Days between assignment and submission
  // Calculated proficiency (computed)
  calculatedProficiency?: Record<string, any>;
  proficiencyUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TopicPerformanceSchema = new Schema({
  topic: { type: String, required: true },
  subject: { type: String, required: true },
  totalAttempts: { type: Number, default: 0 },
  correctAttempts: { type: Number, default: 0 },
  averageScore: { type: Number, default: 0, min: 0, max: 100 },
  lastAttemptDate: { type: Date },
  trend: {
    type: String,
    enum: ['improving', 'stable', 'declining'],
    default: 'stable',
  },
  strengthLevel: {
    type: String,
    enum: ['weak', 'developing', 'proficient', 'strong'],
    default: 'developing',
  },
});

const SubjectPerformanceSchema = new Schema({
  subject: { type: String, required: true },
  averageScore: { type: Number, default: 0, min: 0, max: 100 },
  totalAssignments: { type: Number, default: 0 },
  completedAssignments: { type: Number, default: 0 },
  topics: [TopicPerformanceSchema],
  lastActivityDate: { type: Date },
});

const LearningProfileSchema = new Schema<ILearningProfile>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    school: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    overallAbilityLevel: {
      type: String,
      enum: ['below_grade', 'at_grade', 'above_grade'],
      default: 'at_grade',
    },
    abilityLevelSetBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    abilityLevelUpdatedAt: {
      type: Date,
    },
    subjectPerformance: [SubjectPerformanceSchema],
    recentGrades: [{
      assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment' },
      subject: { type: String },
      topic: { type: String },
      percentage: { type: Number },
      grade: { type: String },
      date: { type: Date },
    }],
    strongTopics: [{ type: String }],
    weakTopics: [{ type: String }],
    recommendations: [{
      type: {
        type: String,
        enum: ['review', 'practice', 'challenge'],
      },
      topic: { type: String },
      subject: { type: String },
      reason: { type: String },
      priority: {
        type: String,
        enum: ['high', 'medium', 'low'],
      },
      createdAt: { type: Date, default: Date.now },
    }],
    totalSubmissions: { type: Number, default: 0 },
    draftSubmissions: { type: Number, default: 0 },
    finalSubmissions: { type: Number, default: 0 },
    averageResponseTime: { type: Number },
    calculatedProficiency: { type: Schema.Types.Mixed },
    proficiencyUpdatedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Indexes
LearningProfileSchema.index({ student: 1 });
LearningProfileSchema.index({ school: 1, overallAbilityLevel: 1 });
LearningProfileSchema.index({ 'subjectPerformance.subject': 1 });

// Virtual for calculating overall average
LearningProfileSchema.virtual('overallAverage').get(function () {
  if (!this.subjectPerformance || this.subjectPerformance.length === 0) return 0;
  const total = this.subjectPerformance.reduce((sum, sp) => sum + sp.averageScore, 0);
  return total / this.subjectPerformance.length;
});

const LearningProfile: Model<ILearningProfile> =
  mongoose.models.LearningProfile || mongoose.model<ILearningProfile>('LearningProfile', LearningProfileSchema);

export default LearningProfile;
