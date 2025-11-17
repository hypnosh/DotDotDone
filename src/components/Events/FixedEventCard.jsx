import React from "react"

export default function FixedEventCard({ evt, onView }) {
  return (
    <div className="fixed-card" onClick={() => onView && onView(evt)}>
      <div style={{ fontWeight: 700 }}>
        {new Date(evt.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {evt.description || "Fixed"}
      </div>
    </div>
  )
}
