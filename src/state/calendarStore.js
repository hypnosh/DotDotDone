import create from "zustand"
import { formatISO } from "../utils/date"

/**
 * calendarStore
 * holds selected date and view
 */
export const useCalendarStore = create(set => ({
  selectedDate: formatISO(new Date()), // YYYY-MM-DD
  view: "day", // day | week | month

  setSelectedDate(dateStr) {
    set({ selectedDate: dateStr })
  },

  setView(view) {
    set({ view })
  }
}))
