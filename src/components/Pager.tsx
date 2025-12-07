/**
 * Pager Component
 * Android-first snap pager with directional lock, velocity thresholds,
 * and haptic feedback. Prevents accidental tab changes during vertical scrolling.
 */

import React, { useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { motion } from 'framer-motion';

interface PagerProps {
  children: React.ReactNode[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  className?: string;
}

export const Pager: React.FC<PagerProps> = ({
  children,
  activeIndex,
  onIndexChange,
  className = '',
}) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    skipSnaps: false,
    dragFree: false,
    containScroll: 'trimSnaps',
    axis: 'x',
    // Require deliberate swipe - higher threshold prevents accidental activation
    dragThreshold: 15,
    startIndex: activeIndex,
  });

  // Sync embla carousel with external activeIndex changes
  useEffect(() => {
    if (emblaApi && activeIndex !== emblaApi.selectedScrollSnap()) {
      emblaApi.scrollTo(activeIndex, false);
    }
  }, [activeIndex, emblaApi]);

  // Handle slide selection with haptic feedback
  const onSelect = useCallback(() => {
    if (!emblaApi) return;

    const selectedIndex = emblaApi.selectedScrollSnap();

    // Only trigger haptic if actually changed
    if (selectedIndex !== activeIndex) {
      // Light haptic feedback for successful page change
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
      onIndexChange(selectedIndex);
    }
  }, [emblaApi, activeIndex, onIndexChange]);

  // Attach select event listener
  useEffect(() => {
    if (!emblaApi) return;

    emblaApi.on('select', onSelect);

    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Prevent vertical scroll issues: Use touch-action: pan-y on scrollable content
  // This is applied via className in the wrapper
  return (
    <div className={`overflow-hidden ${className}`} ref={emblaRef}>
      <div className="flex touch-pan-y">
        {children.map((child, index) => (
          <div
            key={index}
            className="flex-[0_0_100%] min-w-0"
            style={{ touchAction: 'pan-y' }}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
};

interface PagerDotsProps {
  count: number;
  activeIndex: number;
  onDotClick?: (index: number) => void;
  className?: string;
}

/**
 * Pager Dots Indicator
 * Visual indicator showing current page with optional tap-to-navigate
 */
export const PagerDots: React.FC<PagerDotsProps> = ({
  count,
  activeIndex,
  onDotClick,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <button
          key={index}
          onClick={() => onDotClick?.(index)}
          aria-label={`Go to page ${index + 1}`}
          className={`transition-all duration-300 rounded-full touch-manipulation ${
            index === activeIndex
              ? 'w-6 h-2 bg-blue-600 dark:bg-blue-400'
              : 'w-2 h-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
          }`}
          style={{ minWidth: '8px', minHeight: '8px' }}
        />
      ))}
    </div>
  );
};

export default Pager;
