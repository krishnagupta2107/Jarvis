import React from 'react';
import './ScanlineOverlay.css';

export default function ScanlineOverlay() {
  return (
    <>
      <div className="scanlines"></div>
      <div className="vignette"></div>
      <div className="corner-brackets">
        <div className="bracket tl"></div>
        <div className="bracket tr"></div>
        <div className="bracket bl"></div>
        <div className="bracket br"></div>
      </div>
    </>
  );
}
