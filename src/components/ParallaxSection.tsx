import React, { useEffect } from "react";
import { ParallaxBanner } from 'react-scroll-parallax';

interface ParallaxSectionProps {
  imgSrc: string;
  alt: string;
  title: string;
  text: string;
  overlayGradient: string;
  align: "left" | "right";
}

const ParallaxSection = React.forwardRef<HTMLElement, ParallaxSectionProps>(
  ({ imgSrc, alt, title, text, overlayGradient, align }, ref) => {
    // NYT-style parallax (sticky card with scroll progression)
    return (
      <section
        ref={ref}
        className="relative w-full min-h-[400vh] overflow-hidden"
        style={{
          backgroundImage: `url(${imgSrc})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Optional overlay gradient */}
        {overlayGradient && (
          <div className={`absolute inset-0 bg-gradient-to-br ${overlayGradient} pointer-events-none z-0`} />
        )}
        
        {/* Sticky container that holds the card in place while scrolling */}
        <div className="sticky top-0 h-screen w-full flex items-center justify-center z-10">
          {/* Content card that stays centered */}
          <div 
            className={`flex items-center ${align === "right" ? "justify-end" : "justify-start"} w-full max-w-7xl mx-auto px-6 md:px-20`}
          >
            <div
              className={`rounded-3xl shadow-2xl p-10 md:p-20 max-w-2xl md:max-w-3xl animate-fade-in
                ${align === "right" ? "ml-auto text-right" : "mr-auto text-left"}
                bg-white/90 backdrop-blur-md
              `}
              style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)' }}
            >
              <h3 className="text-3xl md:text-5xl font-extrabold text-indigo-900 mb-6">
                {title}
              </h3>
              <p className="text-2xl md:text-3xl text-gray-700 font-medium">
                {text}
              </p>
            </div>
          </div>
        </div>
        
        {/* Progress indicators - styled as small dots instead of dashes */}
        <div className="sticky bottom-8 left-0 right-0 flex justify-center gap-4 z-20">
          <div className="w-2 h-2 rounded-full bg-white opacity-70"></div>
          <div className="w-2 h-2 rounded-full bg-white opacity-70"></div>
          <div className="w-2 h-2 rounded-full bg-white opacity-70"></div>
        </div>
      </section>
    );
  }
);

export default ParallaxSection;
