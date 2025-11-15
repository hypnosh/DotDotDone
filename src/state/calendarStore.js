import { create } from 'zustand';

// Placeholder Zustand store for calendar state
const useCalendarStore = create((set) => ({
  currentDate: new Date(),
  viewMode: 'day', // 'day' | 'week' | 'month'
  isCalendarConnected: false,
  
  setCurrentDate: (date) => set({ currentDate: date }),
  
  setViewMode: (mode) => set({ viewMode: mode }),
  
  setCalendarConnected: (connected) => set({ isCalendarConnected: connected }),
  
  goToToday: () => set({ currentDate: new Date() }),
  
  goToNextPeriod: () => set((state) => {
    const newDate = new Date(state.currentDate);
    switch (state.viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() + 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
    }
    return { currentDate: newDate };
  }),
  
  goToPreviousPeriod: () => set((state) => {
    const newDate = new Date(state.currentDate);
    switch (state.viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() - 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
    }
    return { currentDate: newDate };
  })
}));

export default useCalendarStore;