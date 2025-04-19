import React from 'react';

/**
 * A subtle downward arrow that fades in as the user scrolls from the header,
 * and fades out as the first card ("the dreaded stack") reaches the center.
 * The arrow is intended to be positioned absolutely over the first parallax background.
 */
const ScrollFadeArrow: React.FC = () => (
  <div
    id="scroll-fade-arrow"
    className="pointer-events-none fixed left-1/2 bottom-8 z-50 -translate-x-1/2"
    style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.08))' }}
  >
    <svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M19 10v18M19 28l-7-7M19 28l7-7"
        stroke="#fff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
    </svg>
  </div>
);

export default ScrollFadeArrow;
