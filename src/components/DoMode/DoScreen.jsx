import React from "react"
import { useCalendarStore } from "../../state/calendarStore"
import { useEventsStore } from "../../state/eventsStore"
import PomodoroModal from "./PomodoroModal"
import { usePomodoroStore } from "../../state/pomodoroStore"

export default function DoScreen() {
  const selectedDate = useCalendarStore(s => s.selectedDate)
  const fuzzy = useEventsStore(s => s.getFuzzyTasksForDate(selectedDate))
  const fixed = useEventsStore(s => s.getFixedEventsForDate(selectedDate))
  const pomodoroState = usePomodoroStore(s => ({ activeTaskId: s.activeTaskId, status: s.status }))

  return (
    <div style={{ padding: 16 }}>
      <h2>Do Mode — {selectedDate}</h2>

      <div style={{ display: "grid", gap: 12 }}>
        <div className="card">
          <h3 className="section-title">Today's Fixed Events (read-only)</h3>
          {fixed.length === 0 && <div className="muted">No fixed events</div>}
          {fixed.map(f => (
            <div key={f.id} className="fixed-card">{new Date(f.start).toLocaleTimeString()} - {f.description || "Fixed event"}</div>
          ))}
        </div>

        <div className="card">
          <h3 className="section-title">Today's Fuzzy Tasks (actionable)</h3>
          {fuzzy.length === 0 && <div className="muted">No fuzzy tasks</div>}
          {fuzzy.map(t => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{t.title}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{t.remainingDuration}m left • {t.totalDuration}m est</div>
              </div>
              <div>
                <button className="btn-primary" onClick={() => {
                  // open pomodoro for this task
                  const modalEvent = new CustomEvent("dotdotdone:openPomodoro", { detail: { taskId: t.id, date: selectedDate } })
                  window.dispatchEvent(modalEvent)
                }}>
                  Start
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <PomodoroModal />
    </div>
  )
}
