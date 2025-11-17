import React from "react"

export default function FuzzyEventCard({ task, onOpen }) {
  return (
    <div className="fuzzy-card" onClick={() => onOpen && onOpen(task)}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 700 }}>{task.title}</div>
        <div style={{ fontSize: 12, color: "#666" }}>{task.remainingDuration}m</div>
      </div>

      <div style={{ marginTop: 6, fontSize: 13, color: "#666" }}>
        {task.description || "No description"}
      </div>

      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
        <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); onOpen && onOpen(task) }}>View</button>
      </div>
    </div>
  )
}
