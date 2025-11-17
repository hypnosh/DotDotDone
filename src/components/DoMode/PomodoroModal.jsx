import React, { useEffect, useState } from "react"
import { usePomodoro } from "../../hooks/usePomodoro"
import { usePomodoroStore } from "../../state/pomodoroStore"
import { useEventsStore } from "../../state/eventsStore"

/**
 * PomodoroModal listens for a window event to open:
 * window.dispatchEvent(new CustomEvent("dotdotdone:openPomodoro", { detail: { taskId, date } }))
 *
 * This avoids prop-threading for this placeholder.
 */

export default function PomodoroModal() {
  const [open, setOpen] = useState(false)
  const [context, setContext] = useState(null) // { taskId, date }
  const { start, pause, resume, pauseAndLog, finishTaskEarly, abandon, tick } = usePomodoro()
  const pomState = usePomodoroStore(s => ({ status: s.status, elapsedMs: s.elapsedMs, startTime: s.startTime }))
  const [timerInterval, setTimerInterval] = useState(null)
  const [elapsedDisplay, setElapsedDisplay] = useState(0)
  const eventsStore = useEventsStore()

  useEffect(() => {
    function handler(e) {
      setContext(e.detail)
      setOpen(true)
    }
    window.addEventListener("dotdotdone:openPomodoro", handler)
    return () => window.removeEventListener("dotdotdone:openPomodoro", handler)
  }, [])

  useEffect(() => {
    if (pomState.status === "running") {
      if (!timerInterval) {
        const id = setInterval(() => {
          tick(1000)
        }, 1000)
        setTimerInterval(id)
      }
    } else {
      if (timerInterval) {
        clearInterval(timerInterval)
        setTimerInterval(null)
      }
    }
  }, [pomState.status])

  // update elapsed display
  useEffect(() => {
    setElapsedDisplay(Math.max(0, Math.round((pomState.elapsedMs || 0) / 1000)))
  }, [pomState.elapsedMs])

  if (!open || !context) return null

  const task = eventsStore.getFuzzyTasksForDate(context.date).find(t => t.id === context.taskId)

  const elapsedMin = Math.max(0, Math.round((pomState.elapsedMs || 0) / 60000))

  return (
    <div style={{
      position: "fixed", inset: 0, display: "flex",
      alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)"
    }}>
      <div className="card" style={{ width: 420, textAlign: "center" }}>
        <h3>{task?.title || "Working..."}</h3>

        <div style={{ margin: "20px 0" }}>
          <div style={{
            width: 140, height: 140, borderRadius: "50%",
            margin: "0 auto", background: "#ff6b6b"
          }} />
          <div style={{ marginTop: 12, fontSize: 14, color: "#333" }}>
            Elapsed: {elapsedMin} min
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          {pomState.status !== "running" && (
            <button className="btn-primary" onClick={() => start(context.taskId, context.date)}>Start</button>
          )}
          {pomState.status === "running" && (
            <button className="btn-secondary" onClick={() => pause()}>Pause</button>
          )}

          {pomState.status === "paused" && (
            <>
              <button className="btn-primary" onClick={() => resume()}>Resume</button>
              <button className="btn-secondary" onClick={async () => {
                await pauseAndLog()
                setOpen(false)
                setContext(null)
              }}>Pause & Log</button>

              <button className="btn-primary" onClick={async () => {
                await finishTaskEarly()
                setOpen(false)
                setContext(null)
              }}>Finish Task</button>

              <button className="btn-danger" onClick={() => {
                abandon()
                setOpen(false)
                setContext(null)
              }}>Abandon</button>
            </>
          )}

          {pomState.status === "running" && (
            <button className="btn-danger" onClick={() => {
              // if running and user clicks abandon: we pause then decide:
              pause()
              // UI will transition into paused state allowing further choice
            }}>Abandon</button>
          )}

        </div>

        <div style={{ marginTop: 12 }}>
          <button className="btn-secondary" onClick={() => { setOpen(false); setContext(null) }}>Close</button>
        </div>
      </div>
    </div>
  )
}
