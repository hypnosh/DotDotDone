import React from "react"
import { useCalendarStore } from "../../state/calendarStore"
import { useEventsStore } from "../../state/eventsStore"
import { minutesBetween } from "../../utils/date"

export default function TimeAxis() {
  const date = useCalendarStore(s => s.selectedDate)
  const fixed = useEventsStore(s => s.getFixedEventsForDate(date))
  // show timeline from 6am to 20pm
  const hours = Array.from({ length: 15 }).map((_, i) => 6 + i)

  return (
    <div className="card" style={{ minHeight: 600 }}>
      {hours.map(h => (
        <div key={h} style={{ marginBottom: 12 }}>
          <div className="section-title">{h}:00</div>

          {/* render events that overlap this hour */}
          {fixed.filter(evt => {
            const evtHour = new Date(evt.start).getHours()
            return evtHour === h || (new Date(evt.start).getHours() < h && new Date(evt.end).getHours() >= h)
          }).map(evt => (
            <div key={evt.id} className="fixed-card">
              <div style={{ fontWeight: 600 }}>
                {new Date(evt.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {" - "}
                {new Date(evt.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={{ fontSize: 13 }}>{evt.description || "Fixed event"}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
