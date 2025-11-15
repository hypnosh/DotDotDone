import { useState } from 'react';

// Placeholder hook for Pomodoro timer
export const usePomodoro = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(25 * 60); // 25 minutes in seconds

  const startTimer = () => {
    // TODO: Implement timer logic
    setIsRunning(true);
    console.log('Start Pomodoro timer');
  };

  const pauseTimer = () => {
    // TODO: Implement pause logic
    setIsRunning(false);
    console.log('Pause Pomodoro timer');
  };

  const resetTimer = () => {
    // TODO: Implement reset logic
    setIsRunning(false);
    setTimeRemaining(25 * 60);
    console.log('Reset Pomodoro timer');
  };

  return {
    isRunning,
    timeRemaining,
    startTimer,
    pauseTimer,
    resetTimer
  };
};