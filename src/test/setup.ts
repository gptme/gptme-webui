import '@testing-library/jest-dom';


// More complete matchMedia mock
window.matchMedia = (query: string): MediaQueryList => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
});

// Don't mock fetch - we want to use the real server

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock console.error to catch React warnings
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  // Filter out React Router future flag warnings
  if (args[0]?.includes?.('React Router Future Flag Warning')) {
    return;
  }
  originalConsoleError(...args);
};
