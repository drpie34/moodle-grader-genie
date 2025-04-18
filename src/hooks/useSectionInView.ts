import { useEffect, useRef, useState } from "react";

/**
 * Hook to track which section is currently in view using Intersection Observer.
 * @param sectionCount Number of sections to observe
 * @returns [currentSectionIndex, refs[]]
 */
export function useSectionInView(sectionCount: number): [number, React.RefObject<HTMLElement>[]] {
  const [currentSection, setCurrentSection] = useState(0);
  const refs = Array.from({ length: sectionCount }, () => useRef<HTMLElement>(null));

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    
    // Track which sections are intersecting and at what ratio
    const intersectionState = new Map<number, number>();
    
    // Function to determine the most visible section
    const updateCurrentSection = () => {
      if (intersectionState.size === 0) return;
      
      // Find the section with the highest intersection ratio
      let maxRatio = 0;
      let maxSection = 0;
      
      intersectionState.forEach((ratio, section) => {
        if (ratio > maxRatio) {
          maxRatio = ratio;
          maxSection = section;
        }
      });
      
      if (maxRatio > 0) {
        setCurrentSection(maxSection);
        console.log(`Section ${maxSection} is now the most visible (ratio: ${maxRatio.toFixed(3)})`);
        console.log(`Showing background image for section ${maxSection}`);
      }
    };
    
    refs.forEach((ref, idx) => {
      if (!ref.current) return;
      
      const observer = new window.IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          
          // Always log all intersection events for debugging
          console.log(`Section ${idx} intersection: ${entry.isIntersecting ? 'YES' : 'NO'}, ratio: ${entry.intersectionRatio.toFixed(3)}`);
          
          if (entry.isIntersecting) {
            // Store the intersection ratio
            intersectionState.set(idx, entry.intersectionRatio);
          } else {
            // If not intersecting anymore, remove from state
            intersectionState.delete(idx);
          }
          
          // Update which section should be current
          updateCurrentSection();
        },
        {
          // Multiple thresholds to detect various levels of visibility
          threshold: [0.01, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5],
          // Add rootMargin to detect sections slightly before they enter the viewport
          rootMargin: '0px 0px -10% 0px' // Negative bottom margin to trigger earlier
        }
      );
      
      observer.observe(ref.current);
      observers.push(observer);
    });
    
    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [currentSection, refs];
}
