import React from 'react';

// Placeholder component for event modal
const EventModal = ({ event, onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Event Details</h2>
        <p>Modal component placeholder</p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default EventModal;