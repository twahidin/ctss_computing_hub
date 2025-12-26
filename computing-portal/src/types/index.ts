import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    role: string;
    studentId: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      studentId: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    studentId: string;
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
