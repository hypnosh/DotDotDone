import React from 'react';

const DoScreen = () => {
  const fixedEvents = [
    { title: 'Team Standup', time: '9:00 AM', duration: '30 min' },
    { title: 'Client Meeting', time: '2:00 PM', duration: '1 hour' }
  ];

  const fuzzyTasks = [
    { title: 'Review emails', duration: '20 min' },
    { title: 'Deep work session', duration: '90 min' },
    { title: 'Exercise', duration: '45 min' }
  ];

  return (
    <div className="do-mode-container">
      <div className="do-section">
        <div className="section-header">
          <h2 className="section-title">Today's Fixed Events</h2>
        </div>
        <div className="events-grid">
          {fixedEvents.map((event, idx) => (
            <div key={idx} className="do-event-card">
              <div className="event-title">{event.title}</div>
              <div className="event-meta">{event.time} • {event.duration}</div>
              <button className="btn-start">View</button>
            </div>
          ))}
        </div>
      </div>

      <div className="do-section">
        <div className="section-header">
          <h2 className="section-title">Today's Fuzzy Tasks</h2>
        </div>
        <div className="events-grid">
          {fuzzyTasks.map((task, idx) => (
            <div key={idx} className="do-event-card fuzzy">
              <div className="event-title">{task.title}</div>
              <div className="event-meta">{task.duration}</div>
              <button className="btn-start">Start Pomodoro</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DoScreen;