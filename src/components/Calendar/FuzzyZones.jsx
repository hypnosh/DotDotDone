import React from 'react';
import FuzzyEventCard from '../Events/FuzzyEventCard';

const FuzzyZones = () => {
  const zones = [
    { 
      name: 'Morning', 
      className: 'morning', 
      events: [
        { title: 'Review emails', duration: '20 min' },
        { title: 'Plan day', duration: '15 min' }
      ]
    },
    { 
      name: 'Afternoon', 
      className: 'afternoon', 
      events: [
        { title: 'Deep work session', duration: '90 min' }
      ]
    },
    { 
      name: 'Evening', 
      className: 'evening', 
      events: [
        { title: 'Exercise', duration: '45 min' }
      ]
    },
    { 
      name: 'Night', 
      className: 'night', 
      events: [] 
    }
  ];

  return (
    <div className="fuzzy-zones">
      {zones.map((zone, idx) => (
        <div key={idx} className={`fuzzy-zone ${zone.className}`}>
          <div className="fuzzy-zone-header">
            <span className="zone-indicator"></span>
            {zone.name}
          </div>
          <div className="fuzzy-events-list">
            {zone.events.map((event, i) => (
              <FuzzyEventCard key={i} event={event} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FuzzyZones;