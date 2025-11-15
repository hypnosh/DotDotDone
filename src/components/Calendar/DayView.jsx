import React from 'react';
import FuzzyZones from './FuzzyZones';
import TimeAxis from './TimeAxis';

const DayView = () => {
  return (
    <div className="day-view-container">
      <FuzzyZones />
      <TimeAxis />
    </div>
  );
};

export default DayView;