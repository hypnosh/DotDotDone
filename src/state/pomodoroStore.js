import create from "zustand"

/**
 * pomodoroStore
 * - tracks the active slice/session
 * - does NOT perform side-effects like saving slices or syncing to GCal.
 *   It exposes events which UI or hooks can call to persist via eventsStore or usePomodoro hook.
 */

export const usePomodoroStore = create((set, get) => ({
  activeTaskId: null,
  activeDate: null,
  startTime: null,     // epoch ms
  elapsedMs: 0,
  status: "idle",      // idle | running | paused

  startSession(taskId, date) {
    set({
      activeTaskId: taskId,
      activeDate: date,
      startTime: Date.now(),
      elapsedMs: 0,
      status: "running"
    })
  },

  tick(ms) {
    // minimal tick to update elapsedMs; UI should call periodically
    set(state => ({ elapsedMs: state.elapsedMs + ms }))
  },

  pauseSession() {
    set(state => ({ status: "paused" }))
  },

  resumeSession() {
    set(state => ({ status: "running" }))
  },

  abandonSession() {
    set({
      activeTaskId: null,
      activeDate: null,
      startTime: null,
      elapsedMs: 0,
      status: "idle"
    })
  },

  // mark the end of a slice WITHOUT persisting it here; return slice data
  endSliceAndReset() {
    const { activeTaskId, activeDate, startTime, elapsedMs } = get()
    if (!activeTaskId || !startTime) return null
    const end = Date.now()
    const durationMin = Math.max(1, Math.round(elapsedMs / 60000))
    const slice = {
      id: `slice_${Date.now()}`,
      start: startTime,
      end,
      duration: durationMin
    }

    // reset
    set({
      activeTaskId: null,
      activeDate: null,
      startTime: null,
      elapsedMs: 0,
      status: "idle"
    })

    return { slice, date: activeDate, taskId: activeTaskId }
  }
}))
