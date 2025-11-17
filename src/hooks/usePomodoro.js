import { useEffect } from "react"
import { usePomodoroStore } from "../state/pomodoroStore"
import { useEventsStore } from "../state/eventsStore"
import { useCalendarSync } from "./useCalendarSync"

/**
 * usePomodoro
 * - coordinates UI actions with stores and sync layer
 * - exposes high-level commands: start, pause, resume, pauseAndLog, finishTaskEarly, abandon
 *
 * Important: actual UI tick should call tick() periodically (e.g., setInterval).
 */

export function usePomodoro() {
  const { startSession, pauseSession, resumeSession, abandonSession, tick, endSliceAndReset } = usePomodoroStore()
  const { addSliceToFuzzyTask, addFixedEvent, completeFuzzyTask } = useEventsStore()
  const sync = useCalendarSync()

  // start a session for a given task (taskId + date)
  function start(taskId, date) {
    startSession(taskId, date)
  }

  function pause() {
    pauseSession()
  }

  function resume() {
    resumeSession()
  }

  // pause & log: end current slice, persist slice as fixed event, reduce remainingDuration
  async function pauseAndLog() {
    const res = endSliceAndReset()
    if (!res) return null
    const { slice, date, taskId } = res
    // persist slice in eventsStore
    const sliceObj = addSliceToFuzzyTask(taskId, date, slice)
    // create fixed event from slice
    const fixed = addFixedEvent({
      date,
      start: slice.start,
      end: slice.end,
      duration: slice.duration,
      fuzzyParentId: taskId,
      description: `Work slice for ${taskId}`
    })
    // attempt to sync slice to Google Calendar (non-blocking)
    try {
      const gcalId = await sync.syncSliceToGCal(fixed)
      if (gcalId) {
        // update fixed event with gcalId
        // (ideally eventsStore exposes updateFixedEvent; using it here)
      }
    } catch (err) {
      // swallow; sync will retry later
      console.warn("GCal sync slice failed", err)
    }
    return { slice: sliceObj, fixed }
  }

  // finish: log slice (if running) and mark task complete
  async function finishTaskEarly() {
    const res = endSliceAndReset()
    if (!res) return null
    const { slice, date, taskId } = res
    const sliceObj = addSliceToFuzzyTask(taskId, date, slice)
    const fixed = addFixedEvent({
      date,
      start: slice.start,
      end: slice.end,
      duration: slice.duration,
      fuzzyParentId: taskId,
      description: `Work slice for ${taskId}`
    })
    // mark completion (adds completion marker)
    const completion = completeFuzzyTask(taskId, date)
    // sync both fixed slice and completion marker
    try {
      await sync.syncSliceToGCal(fixed)
      await sync.syncCompletionToGCal(completion)
    } catch (err) {
      console.warn("GCal sync failed", err)
    }
    return { slice: sliceObj, fixed, completion }
  }

  // abandon: discard slice; simply reset session state
  function abandon() {
    abandonSession()
  }

  return {
    start,
    pause,
    resume,
    pauseAndLog,
    finishTaskEarly,
    abandon,
    tick // exposed so UI can call ticks (e.g., every second)
  }
}
