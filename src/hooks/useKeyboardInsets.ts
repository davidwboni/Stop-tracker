/**
 * useKeyboardInsets Hook
 * Android-first keyboard handling with visual viewport support
 * Ensures inputs stay visible when keyboard appears
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface KeyboardInsets {
  keyboardHeight: number;
  isKeyboardVisible: boolean;
  scrollInputIntoView: (element: HTMLElement | null) => void;
}

/**
 * Custom hook to handle keyboard insets on Android
 * Uses visualViewport API for accurate keyboard height detection
 */
export function useKeyboardInsets(): KeyboardInsets {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    // Check if visualViewport is supported (modern browsers)
    if (!window.visualViewport) {
      return;
    }

    const handleViewportResize = () => {
      // Cancel any pending animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        const viewport = window.visualViewport!;
        const windowHeight = window.innerHeight;
        const viewportHeight = viewport.height;

        // Calculate keyboard height
        // When keyboard appears, viewport height decreases
        const calculatedKeyboardHeight = Math.max(0, windowHeight - viewportHeight - viewport.offsetTop);

        // Consider keyboard visible if height > 150px (threshold for mobile keyboards)
        const keyboardVisible = calculatedKeyboardHeight > 150;

        setKeyboardHeight(calculatedKeyboardHeight);
        setIsKeyboardVisible(keyboardVisible);
      });
    };

    // Listen to viewport resize events
    window.visualViewport.addEventListener('resize', handleViewportResize);
    window.visualViewport.addEventListener('scroll', handleViewportResize);

    // Initial check
    handleViewportResize();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.visualViewport?.removeEventListener('resize', handleViewportResize);
      window.visualViewport?.removeEventListener('scroll', handleViewportResize);
    };
  }, []);

  /**
   * Scrolls an input element into view, accounting for keyboard height
   * @param element The HTML element to scroll into view (typically an input)
   */
  const scrollInputIntoView = useCallback((element: HTMLElement | null) => {
    if (!element) return;

    // Add a small delay to let the keyboard animation start
    setTimeout(() => {
      const rect = element.getBoundingClientRect();
      const viewport = window.visualViewport;

      if (!viewport) {
        // Fallback to standard scrollIntoView
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
        return;
      }

      // Calculate the visible area accounting for keyboard
      const visibleHeight = viewport.height;
      const elementTop = rect.top + window.scrollY;
      const elementHeight = rect.height;

      // Target position: center the element in the visible viewport
      // Add padding to ensure it's not too close to keyboard
      const padding = 20;
      const targetY = elementTop - (visibleHeight / 2) + (elementHeight / 2) - padding;

      // Smooth scroll to the calculated position
      window.scrollTo({
        top: Math.max(0, targetY),
        behavior: 'smooth'
      });
    }, 100);
  }, []);

  return {
    keyboardHeight,
    isKeyboardVisible,
    scrollInputIntoView,
  };
}

export default useKeyboardInsets;
