import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserProgress {
  module1: number;
  module2: number;
  module3: number;
  module4: number;
  module5: number;
}

interface AppState {
  // UI State
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  
  // Progress State
  progress: UserProgress;
  setProgress: (progress: UserProgress) => void;
  updateModuleProgress: (module: number, value: number) => void;
  
  // Current Context
  currentModule: number | null;
  setCurrentModule: (module: number | null) => void;
  
  // Spreadsheet State
  currentSpreadsheetId: string | null;
  setCurrentSpreadsheetId: (id: string | null) => void;
  
  // Notebook State
  currentNotebookId: string | null;
  setCurrentNotebookId: (id: string | null) => void;
  
  // AI Tutor Context
  tutorContext: {
    module?: number;
    topic?: string;
    currentExercise?: string;
  };
  setTutorContext: (context: Partial<AppState['tutorContext']>) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // UI State
      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      
      // Progress State
      progress: {
        module1: 0,
        module2: 0,
        module3: 0,
        module4: 0,
        module5: 0,
      },
      setProgress: (progress) => set({ progress }),
      updateModuleProgress: (module, value) =>
        set((state) => ({
          progress: {
            ...state.progress,
            [`module${module}`]: Math.min(100, Math.max(0, value)),
          },
        })),
      
      // Current Context
      currentModule: null,
      setCurrentModule: (module) => set({ currentModule: module }),
      
      // Spreadsheet State
      currentSpreadsheetId: null,
      setCurrentSpreadsheetId: (id) => set({ currentSpreadsheetId: id }),
      
      // Notebook State
      currentNotebookId: null,
      setCurrentNotebookId: (id) => set({ currentNotebookId: id }),
      
      // AI Tutor Context
      tutorContext: {},
      setTutorContext: (context) =>
        set((state) => ({
          tutorContext: { ...state.tutorContext, ...context },
        })),
    }),
    {
      name: 'computing-portal-storage',
      partialize: (state) => ({
        progress: state.progress,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);

export default useAppStore;
