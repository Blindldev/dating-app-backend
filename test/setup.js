// Increase timeout for all tests
jest.setTimeout(10000);

// Suppress console logs during tests
global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}; 