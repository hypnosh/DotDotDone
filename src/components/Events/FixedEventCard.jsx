import React from 'react';

const FixedEventCard = ({ event }) => {
  return (
    <div className="fixed-event-card">
      <div className="event-title">{event.title}</div>
      <div className="event-meta" style={{opacity: 0.9}}>
        {event.time}
      </div>
    </div>
  );
};

export default FixedEventCard;