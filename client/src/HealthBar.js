// HealthBar.js
import React from 'react';

const HealthBar = ({ percentage }) => {
  return (
    <div className="health-bar-container">
      <div className="health-bar" style={{ width: `${percentage}%` }} />
    </div>
  );
};

export default HealthBar;
