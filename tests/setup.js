// Test setup file
const request = require('supertest');
const app = require('../server.js');

global.request = request(app);

// Mock console methods in tests to avoid noise
const originalConsole = global.console;
beforeEach(() => {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  };
});

afterEach(() => {
  global.console = originalConsole;
});
