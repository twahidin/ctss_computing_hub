import 'next-auth';

// Profile types matching the User model
export type UserProfile = 'student' | 'teacher' | 'admin' | 'super_admin';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

declare module 'next-auth' {
  interface User {
    id: string;
    username: string;
    profile: UserProfile;
    school?: string;
    schoolId?: string;
    class?: string;
    level?: string;
    approvalStatus: ApprovalStatus;
  }

  interface Session {
    user: {
      id: string;
      email?: string;
      name: string;
      username: string;
      profile: UserProfile;
      school?: string;
      schoolId?: string;
      class?: string;
      level?: string;
      approvalStatus: ApprovalStatus;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    username: string;
    profile: UserProfile;
    school?: string;
    schoolId?: string;
    class?: string;
    level?: string;
    approvalStatus: ApprovalStatus;
  }
}

// Syllabus Module Types
export interface Module {
  id: number;
  name: string;
  description: string;
  topics: Topic[];
  color: string;
  icon: string;
}

export interface Topic {
  id: string;
  name: string;
  learningOutcomes: string[];
  exercises: ExerciseInfo[];
}

export interface ExerciseInfo {
  id: string;
  title: string;
  type: 'notebook' | 'spreadsheet' | 'quiz' | 'coding';
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number; // in minutes
}

// Spreadsheet Types
export interface SpreadsheetData {
  name: string;
  celldata: CellData[];
  config?: object;
}

export interface CellData {
  r: number; // row
  c: number; // column
  v: {
    v?: any; // original value
    m?: string; // display value
    f?: string; // formula
    ct?: object; // cell type
    bg?: string; // background color
    fc?: string; // font color
    ff?: string; // font family
    fs?: number; // font size
    bl?: number; // bold
    it?: number; // italic
  };
}

// Chat Types
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface ChatContext {
  module?: number;
  topic?: string;
  currentExercise?: string;
  codeSnippet?: string;
  spreadsheetContext?: string;
}

// Progress Types
export interface ModuleProgress {
  module1: number;
  module2: number;
  module3: number;
  module4: number;
  module5: number;
}

export interface StudentStats {
  totalExercises: number;
  completedExercises: number;
  averageScore: number;
  totalTimeSpent: number;
  streakDays: number;
}

// Admin Types
export interface UserManagement {
  users: UserListItem[];
  pendingApprovals: UserListItem[];
}

export interface UserListItem {
  _id: string;
  username: string;
  name: string;
  email?: string;
  profile: UserProfile;
  school?: string; // ObjectId from database
  schoolId?: string; // Alternative field name
  schoolName?: string; // Denormalized school name
  class?: string;
  level?: string;
  approvalStatus: ApprovalStatus;
  createdAt: string;
  lastLogin?: string;
}

export interface SchoolData {
  _id: string;
  schoolName: string;
  schoolCode: string;
  listOfClasses: string[];
  listOfLevels: string[];
  listAccessibleFunctions: string[];
  isActive: boolean;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface FunctionData {
  _id: string;
  functionName: string;
  functionCode: string;
  functionData: {
    description?: string;
    icon?: string;
    route?: string;
    category?: string;
    settings?: object;
    uploadedData?: {
      fileName?: string;
      fileType?: string;
      uploadedAt?: string;
      uploadedBy?: string;
      data?: any;
    }[];
  };
  profileFunctionList: UserProfile[];
  isActive: boolean;
  isSystemFunction: boolean;
}

// Permission helpers
export const PROFILE_HIERARCHY: Record<UserProfile, number> = {
  student: 1,
  teacher: 2,
  admin: 3,
  super_admin: 4,
};

export function canManageUser(actorProfile: UserProfile, targetProfile: UserProfile): boolean {
  return PROFILE_HIERARCHY[actorProfile] > PROFILE_HIERARCHY[targetProfile];
}

export function canResetPassword(actorProfile: UserProfile, targetProfile: UserProfile): boolean {
  // Super admin can reset anyone's password except other super admins
  if (actorProfile === 'super_admin') {
    return targetProfile !== 'super_admin';
  }
  // Admin can reset teacher and student passwords
  if (actorProfile === 'admin') {
    return targetProfile === 'teacher' || targetProfile === 'student';
  }
  // Teacher can only reset student passwords
  if (actorProfile === 'teacher') {
    return targetProfile === 'student';
  }
  return false;
}

export function canApproveUser(actorProfile: UserProfile, targetProfile: UserProfile): boolean {
  // Super admin and admin can approve anyone below them
  if (actorProfile === 'super_admin') {
    return targetProfile !== 'super_admin';
  }
  if (actorProfile === 'admin') {
    return targetProfile === 'teacher' || targetProfile === 'student';
  }
  // Teachers can only approve students in their class
  if (actorProfile === 'teacher') {
    return targetProfile === 'student';
  }
  return false;
}

// Assignment System Types
export type AssignmentStatus = 'draft' | 'published' | 'archived';
export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'mixed';
export type SubmissionType = 'draft' | 'final';
export type SubmissionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'approved' | 'returned';
export type FeedbackType = 'draft' | 'final';
export type AbilityLevel = 'below_grade' | 'at_grade' | 'above_grade';

export interface AssignmentQuestion {
  id: string;
  question: string;
  type: 'mcq' | 'short_answer' | 'long_answer' | 'calculation';
  marks: number;
  markingScheme?: string;
  modelAnswer?: string;
  topic?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface AssignmentData {
  _id: string;
  title: string;
  description?: string;
  subject: string;
  topic: string;
  grade: string;
  teacher: string;
  school: string;
  class: string;
  learningOutcomes: string[];
  questions: AssignmentQuestion[];
  totalMarks: number;
  dueDate?: string;
  status: AssignmentStatus;
  difficulty: DifficultyLevel;
  knowledgeBasePdf?: string;
  allowDraftSubmissions: boolean;
  requiresApproval: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionFeedback {
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

export interface FeedbackData {
  _id: string;
  submission: string;
  student: string;
  assignment: string;
  feedbackType: FeedbackType;
  overallFeedback: string;
  overallStrengths: string[];
  overallImprovements: string[];
  questionFeedback: QuestionFeedback[];
  totalMarksAwarded?: number;
  totalMarksPossible?: number;
  percentage?: number;
  grade?: string;
  topicScores?: Record<string, { awarded: number; possible: number; percentage: number }>;
  teacherModified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionData {
  _id: string;
  student: string | { _id: string; username: string; name: string };
  assignment: string | AssignmentData;
  submissionType: SubmissionType;
  pdfUrl: string;
  pdfFileName: string;
  status: SubmissionStatus;
  marksAwarded?: number;
  marksTotal?: number;
  percentage?: number;
  grade?: string;
  approvedBy?: string;
  approvedAt?: string;
  teacherComments?: string;
  returnedAt?: string;
  submittedAt: string;
  feedbackGeneratedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LearningProfileData {
  _id: string;
  student: string;
  school: string;
  overallAbilityLevel: AbilityLevel;
  subjectPerformance: {
    subject: string;
    averageScore: number;
    totalAssignments: number;
    completedAssignments: number;
    topics: {
      topic: string;
      subject: string;
      totalAttempts: number;
      correctAttempts: number;
      averageScore: number;
      trend: 'improving' | 'stable' | 'declining';
      strengthLevel: 'weak' | 'developing' | 'proficient' | 'strong';
    }[];
  }[];
  recentGrades: {
    assignmentId: string;
    subject: string;
    topic: string;
    percentage: number;
    grade: string;
    date: string;
  }[];
  strongTopics: string[];
  weakTopics: string[];
  totalSubmissions: number;
  draftSubmissions: number;
  finalSubmissions: number;
}

export interface TeacherAssignmentSummary {
  assignment: AssignmentData;
  totalStudents: number;
  submittedCount: number;
  pendingCount: number;
  gradedCount: number;
  approvedCount: number;
  averageScore?: number;
  submissions: SubmissionData[];
}
