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
  school?: string;
  schoolId?: string;
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
