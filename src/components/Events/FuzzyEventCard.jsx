import React from 'react';

const FuzzyEventCard = ({ event }) => {
  return (
    <div className="fuzzy-event-card">
      <div className="event-title">{event.title}</div>
      <div className="event-meta">{event.duration || '30 min'}</div>
    </div>
  );
};

export default FuzzyEventCard;