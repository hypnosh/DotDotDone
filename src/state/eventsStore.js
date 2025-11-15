import { create } from 'zustand';

// Placeholder Zustand store for events
const useEventsStore = create((set) => ({
  events: [],
  selectedEvent: null,
  
  setEvents: (events) => set({ events }),
  
  addEvent: (event) => set((state) => ({
    events: [...state.events, event]
  })),
  
  updateEvent: (id, updates) => set((state) => ({
    events: state.events.map(event => 
      event.id === id ? { ...event, ...updates } : event
    )
  })),
  
  deleteEvent: (id) => set((state) => ({
    events: state.events.filter(event => event.id !== id)
  })),
  
  selectEvent: (event) => set({ selectedEvent: event }),
  
  clearSelection: () => set({ selectedEvent: null })
}));

export default useEventsStore;