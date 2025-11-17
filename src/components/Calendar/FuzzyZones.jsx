import React from "react"
import { useCalendarStore } from "../../state/calendarStore"
import { useEventsStore } from "../../state/eventsStore"

const ZONES = ["morning", "afternoon", "evening", "night"]

export default function FuzzyZones() {
  const date = useCalendarStore(s => s.selectedDate)
  const fuzzy = useEventsStore(s => s.getFuzzyTasksForDate(date))

  // group by zone
  const byZone = ZONES.reduce((acc, z) => {
    acc[z] = fuzzy.filter(t => t.zone === z)
    return acc
  }, {})

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {ZONES.map(z => (
        <div key={z} className="zone-card">
          <h3 style={{ textTransform: "capitalize", marginTop: 0 }}>{z}</h3>
          {(byZone[z] || []).length === 0 && <div className="muted">No tasks</div>}
          {(byZone[z] || []).map(t => (
            <div key={t.id} className="fuzzy-card">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontWeight: 600 }}>{t.title}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{t.remainingDuration}m</div>
              </div>
              {t.slices && t.slices.length > 0 && (
                <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
                  Slices: {t.slices.length} • {Math.max(0, t.totalDuration - t.remainingDuration)}m logged
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
