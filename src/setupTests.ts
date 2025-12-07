import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock navigator.vibrate if not available
if (!navigator.vibrate) {
  Object.defineProperty(navigator, 'vibrate', {
    writable: true,
    value: () => true,
  });
}

// Mock visualViewport for keyboard tests
if (!window.visualViewport) {
  Object.defineProperty(window, 'visualViewport', {
    writable: true,
    value: {
      height: 800,
      width: 400,
      offsetTop: 0,
      offsetLeft: 0,
      pageTop: 0,
      pageLeft: 0,
      scale: 1,
      addEventListener: () => {},
      removeEventListener: () => {},
    },
  });
}
