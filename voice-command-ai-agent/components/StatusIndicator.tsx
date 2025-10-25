import React from 'react';

interface StatusIndicatorProps {
  isListening: boolean;
  error: string | null;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ isListening, error }) => {
  let statusText = 'Idle';
  let colorClass = 'text-gray-400';

  if (error) {
    statusText = error;
    colorClass = 'text-yellow-400';
  } else if (isListening) {
    statusText = 'Listening...';
    colorClass = 'text-cyan-400';
  }

  return <p className={`text-2xl font-semibold ${colorClass}`}>{statusText}</p>;
};