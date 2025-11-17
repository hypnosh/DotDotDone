import React from "react"
import { useEventsStore } from "../../state/eventsStore"

/**
 * EventModal - simple view/edit/delete modal for both fuzzy & fixed events.
 * For now this is a UI stub. Editing will call eventsStore update functions.
 */

export default function EventModal({ open, onClose, item }) {
  const updateFuzzy = useEventsStore(s => s.updateFuzzyTask)
  const deleteFuzzy = useEventsStore(s => s.deleteFuzzyTask)
  const updateFixed = useEventsStore(s => s.updateFixedEvent)
  const deleteFixed = useEventsStore(s => s.deleteFixedEvent)

  if (!open || !item) return null

  const isFuzzy = item.type === "fuzzy"

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="card" style={{ width: 520 }}>
        <h3>{isFuzzy ? "Fuzzy Event" : "Fixed Event"}</h3>

        <div>
          <div style={{ fontWeight: 700 }}>{item.title}</div>
          <div style={{ color: "#666", marginTop: 8 }}>{isFuzzy ? `${item.remainingDuration}m left of ${item.totalDuration}m` : `${new Date(item.start).toLocaleString()}`}</div>
          <div style={{ marginTop: 10 }}>{item.description}</div>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          {isFuzzy ? (
            <>
              <button className="btn-primary" onClick={() => {
                const newTitle = prompt("Edit title", item.title)
                if (newTitle) updateFuzzy(item.id, item.date, { title: newTitle })
              }}>Edit</button>

              <button className="btn-danger" onClick={() => { deleteFuzzy(item.id, item.date); onClose() }}>Delete</button>
            </>
          ) : (
            <>
              <button className="btn-primary" onClick={() => {
                const newDesc = prompt("Edit description", item.description)
                if (newDesc) updateFixed(item.id, item.date, { description: newDesc })
              }}>Edit</button>

              <button className="btn-danger" onClick={() => { deleteFixed(item.id, item.date); onClose() }}>Delete</button>
            </>
          )}
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
