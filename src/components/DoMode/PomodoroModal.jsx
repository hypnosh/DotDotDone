import React from 'react';

// Placeholder component for Pomodoro modal
const PomodoroModal = ({ task, onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Pomodoro Timer</h2>
        <p>Timer component placeholder</p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default PomodoroModal;