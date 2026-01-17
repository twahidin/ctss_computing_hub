import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  // UI State
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  
  // Spreadsheet State
  currentSpreadsheetId: string | null;
  setCurrentSpreadsheetId: (id: string | null) => void;
  
  // Notebook State
  currentNotebookId: string | null;
  setCurrentNotebookId: (id: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // UI State
      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      
      // Spreadsheet State
      currentSpreadsheetId: null,
      setCurrentSpreadsheetId: (id) => set({ currentSpreadsheetId: id }),
      
      // Notebook State
      currentNotebookId: null,
      setCurrentNotebookId: (id) => set({ currentNotebookId: id }),
    }),
    {
      name: 'computing-portal-storage',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);

export default useAppStore;
