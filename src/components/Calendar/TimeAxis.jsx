import React from 'react';
import FixedEventCard from '../Events/FixedEventCard';

const TimeAxis = () => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const sampleEvents = [
    { time: '9:00 AM', title: 'Team Standup', hour: 9 },
    { time: '2:00 PM', title: 'Client Meeting', hour: 14 },
    { time: '4:30 PM', title: 'Project Review', hour: 16 }
  ];

  return (
    <div className="timeline-container">
      <div className="timeline">
        {hours.map((hour) => {
          const event = sampleEvents.find(e => e.hour === hour);
          return (
            <div key={hour} className="time-slot">
              <span className="time-label">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </span>
              {event && <FixedEventCard event={event} />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimeAxis;