import React from "react"
import FuzzyZones from "./FuzzyZones"
import TimeAxis from "./TimeAxis"
import { useCalendarStore } from "../../state/calendarStore"
import { useEventsStore } from "../../state/eventsStore"

export default function DayView() {
  const selectedDate = useCalendarStore(s => s.selectedDate)
  const fuzzy = useEventsStore(s => s.getFuzzyTasksForDate(selectedDate))
  const fixed = useEventsStore(s => s.getFixedEventsForDate(selectedDate))

  return (
    <div className="grid-2" style={{ padding: 16 }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Fuzzy Tasks — {selectedDate}</h2>
          <div>
            <button className="btn-secondary" onClick={() => {
              // placeholder add quick fuzzy
              const title = prompt("Fuzzy task title?")
              if (!title) return
              useEventsStore.getState().addFuzzyTask({ date: selectedDate, title })
            }}>+ Add Fuzzy</button>
          </div>
        </div>

        <FuzzyZones />
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Fixed Timeline</h2>
          <div>
            <button className="btn-secondary" onClick={() => {
              // add a quick fixed event
              const startStr = prompt("Start time (HH:MM)")
              if (!startStr) return
              const [hh, mm] = startStr.split(":").map(Number)
              const date = new Date(selectedDate + "T00:00:00")
              date.setHours(hh, mm, 0, 0)
              const end = new Date(date.getTime() + 30 * 60000)
              useEventsStore.getState().addFixedEvent({
                date: selectedDate,
                start: date.getTime(),
                end: end.getTime(),
                description: "Quick fixed event"
              })
            }}>+ Add Fixed</button>
          </div>
        </div>

        <TimeAxis />
      </div>
    </div>
  )
}
