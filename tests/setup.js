/**
 * Jest test setup configuration
 * Sets up testing environment and global mocks
 */

import '@testing-library/jest-dom';

// Mock fetch globally
global.fetch = jest.fn();

// Mock console methods to reduce noise in tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
};

// Restore console for specific tests if needed
global.restoreConsole = () => {
  global.console = originalConsole;
};

// Mock window.location
delete window.location;
window.location = {
  href: 'http://localhost:3000',
  hostname: 'localhost',
  pathname: '/',
  search: '',
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn()
};

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Clean up after each test
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset fetch mock
  if (global.fetch.mockClear) {
    global.fetch.mockClear();
  }
  
  // Clear localStorage
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  
  // Reset window.location
  window.location.href = 'http://localhost:3000';
  window.location.hostname = 'localhost';
  window.location.pathname = '/';
  window.location.search = '';
});

// Global test helpers
global.createMockPopup = (overrides = {}) => ({
  id: 'test-popup-id',
  title: 'Test Popup',
  content: 'Test content',
  trigger_type: 'time_delay',
  trigger_value: '3000',
  position: 'center',
  shop_domain: 'testingstoresumeet.myshopify.com',
  is_active: true,
  created_at: new Date().toISOString(),
  ...overrides
});

global.mockApiResponse = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data))
});

global.mockApiError = (message = 'API Error', status = 400) => ({
  ok: false,
  status,
  json: () => Promise.resolve({ success: false, error: message }),
  text: () => Promise.resolve(JSON.stringify({ success: false, error: message }))
});

// Environment variables for tests
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://zsmoutzjhqjgjehaituw.supabase.co';
process.env.TEST_SHOP_DOMAIN = 'testingstoresumeet.myshopify.com';