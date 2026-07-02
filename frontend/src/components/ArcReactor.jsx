import React from 'react';
import './ArcReactor.css';

// state can be 'standby', 'listening', 'processing', 'speaking', 'error'
export default function ArcReactor({ state = 'standby' }) {
  return (
    <div className={`arc-reactor-container ${state}`}>
      <div className="arc-core"></div>
      <div className="arc-ring ring-1"></div>
      <div className="arc-ring ring-2"></div>
      <div className="arc-ring ring-3"></div>
    </div>
  );
}
