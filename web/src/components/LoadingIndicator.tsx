import React from 'react';

interface LoadingIndicatorProps {
  message: string;
  progress?: number; // 0-100
}

export function LoadingIndicator({ message, progress }: LoadingIndicatorProps) {
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p className="loading-message">
        {message}
        <span className="blinking-dot"></span>
      </p>
      {progress !== undefined && (
        <>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="progress-text">{progress}% complete</p>
        </>
      )}
    </div>
  );
}
