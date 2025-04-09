import '@testing-library/jest-dom';

// Mock Vite's import.meta.env
declare global {
  interface Window {
    import: {
      meta: {
        env: {
          MODE: string;
          BASE_URL: string;
          PROD: boolean;
          DEV: boolean;
          SSR: boolean;
          VITE_API_URL: string;
        };
      };
    };
  }
}

window.import = {
  meta: {
    env: {
      MODE: 'test',
      BASE_URL: '/',
      PROD: false,
      DEV: true,
      SSR: false,
      VITE_API_URL: 'http://127.0.0.1:5700',
    },
  },
} as any;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
