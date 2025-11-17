import { create } from 'zustand'
import { nanoid } from "nanoid"

/**
 * eventsStore
 * - fuzzyTasks: { "YYYY-MM-DD": [fuzzyTask, ...] }
 * - fixedEvents: { "YYYY-MM-DD": [fixedEvent, ...] }
 *
 * fuzzyTask schema (see spec):
 * {
 *   id, type:"fuzzy", title, description, date,
 *   totalDuration, remainingDuration, priority, zone,
 *   slices: [{id, start, end, duration, gcalId}],
 *   createdAt, updatedAt
 * }
 *
 * fixedEvent schema:
 * {
 *   id, type:"fixed", date, start, end, duration, fuzzyParentId?, gcalId?
 * }
 */

const getDateKey = (dateStr) => dateStr

export const useEventsStore = create((set, get) => ({
  fuzzyTasks: {},   // keyed by date
  fixedEvents: {},  // keyed by date

  // ********** BASE HELPERS **********
  _ensureFuzzyKey(date) {
    const fuzzyTasks = { ...get().fuzzyTasks }
    if (!fuzzyTasks[date]) fuzzyTasks[date] = []
    set({ fuzzyTasks })
  },

  _ensureFixedKey(date) {
    const fixedEvents = { ...get().fixedEvents }
    if (!fixedEvents[date]) fixedEvents[date] = []
    set({ fixedEvents })
  },

  // ********** FUZZY TASKS **********
  addFuzzyTask(task) {
    // task must include date, title, totalDuration etc.
    const id = task.id || nanoid()
    const date = getDateKey(task.date)
    const newTask = {
      id,
      type: "fuzzy",
      title: task.title || "Untitled",
      description: task.description || "",
      date,
      totalDuration: task.totalDuration || 25,
      remainingDuration: task.remainingDuration ?? (task.totalDuration || 25),
      priority: task.priority || "medium",
      zone: task.zone || "morning",
      slices: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    const fuzzyTasks = { ...get().fuzzyTasks }
    if (!fuzzyTasks[date]) fuzzyTasks[date] = []
    fuzzyTasks[date] = [...fuzzyTasks[date], newTask]
    set({ fuzzyTasks })
    return newTask
  },

  updateFuzzyTask(id, date, patch) {
    const fuzzyTasks = { ...get().fuzzyTasks }
    if (!fuzzyTasks[date]) return
    fuzzyTasks[date] = fuzzyTasks[date].map(t => t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t)
    set({ fuzzyTasks })
  },

  deleteFuzzyTask(id, date) {
    const fuzzyTasks = { ...get().fuzzyTasks }
    if (!fuzzyTasks[date]) return
    fuzzyTasks[date] = fuzzyTasks[date].filter(t => t.id !== id)
    set({ fuzzyTasks })
  },

  // ********** SLICES (micro sessions) **********
  addSliceToFuzzyTask(taskId, date, slice) {
    // slice: { start, end, duration, gcalId? }
    const fuzzyTasks = { ...get().fuzzyTasks }
    if (!fuzzyTasks[date]) return null
    const idx = fuzzyTasks[date].findIndex(t => t.id === taskId)
    if (idx === -1) return null

    const task = { ...fuzzyTasks[date][idx] }
    const sliceObj = {
      id: slice.id || nanoid(),
      start: slice.start,
      end: slice.end,
      duration: slice.duration,
      gcalId: slice.gcalId || null
    }
    task.slices = [...(task.slices || []), sliceObj]
    task.remainingDuration = Math.max(0, (task.remainingDuration ?? task.totalDuration) - slice.duration)
    task.updatedAt = Date.now()

    fuzzyTasks[date] = [
      ...fuzzyTasks[date].slice(0, idx),
      task,
      ...fuzzyTasks[date].slice(idx + 1)
    ]
    set({ fuzzyTasks })
    return sliceObj
  },

  // ********** COMPLETE A FUZZY TASK **********
  completeFuzzyTask(taskId, date) {
    // mark as complete: remove from fuzzyTasks and add final completion fixed event
    const fuzzyTasks = { ...get().fuzzyTasks }
    const fixedEvents = { ...get().fixedEvents }
    if (!fuzzyTasks[date]) return null
    const idx = fuzzyTasks[date].findIndex(t => t.id === taskId)
    if (idx === -1) return null
    const task = fuzzyTasks[date][idx]

    // remove task
    fuzzyTasks[date] = fuzzyTasks[date].filter(t => t.id !== taskId)
    set({ fuzzyTasks })

    // add final completion fixed event (zero-length marker) --- can be adjusted
    const completionEvent = {
      id: nanoid(),
      type: "fixed",
      date,
      start: Date.now(),
      end: Date.now(),
      duration: 0,
      fuzzyParentId: taskId,
      description: `Completed via DotDotDone: ${task.title}`,
      gcalId: null,
      createdAt: Date.now()
    }
    if (!fixedEvents[date]) fixedEvents[date] = []
    fixedEvents[date] = [...fixedEvents[date], completionEvent]
    set({ fixedEvents })

    return completionEvent
  },

  // ********** FIXED EVENTS **********
  addFixedEvent(evt) {
    const id = evt.id || nanoid()
    const date = getDateKey(evt.date)
    const newEvt = {
      id,
      type: "fixed",
      date,
      start: evt.start,
      end: evt.end,
      duration: evt.duration || Math.round((evt.end - evt.start) / 60000),
      fuzzyParentId: evt.fuzzyParentId || null,
      description: evt.description || evt.title || "",
      gcalId: evt.gcalId || null,
      createdAt: Date.now()
    }
    const fixedEvents = { ...get().fixedEvents }
    if (!fixedEvents[date]) fixedEvents[date] = []
    fixedEvents[date] = [...fixedEvents[date], newEvt]
    set({ fixedEvents })
    return newEvt
  },

  updateFixedEvent(id, date, patch) {
    const fixedEvents = { ...get().fixedEvents }
    if (!fixedEvents[date]) return
    fixedEvents[date] = fixedEvents[date].map(e => e.id === id ? { ...e, ...patch } : e)
    set({ fixedEvents })
  },

  deleteFixedEvent(id, date) {
    const fixedEvents = { ...get().fixedEvents }
    if (!fixedEvents[date]) return
    fixedEvents[date] = fixedEvents[date].filter(e => e.id !== id)
    set({ fixedEvents })
  },

  // ********** UTIL **********
  getFuzzyTasksForDate(date) {
    return (get().fuzzyTasks[date] || []).slice()
  },

  getFixedEventsForDate(date) {
    return (get().fixedEvents[date] || []).slice()
  }
}))