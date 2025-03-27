// Mock global objects that are available in Cloudflare Workers
// but not in Node.js

// Mock fetch
global.fetch = jest.fn();

// Mock crypto
global.crypto = {
  randomUUID: jest.fn(),
  getRandomValues: jest.fn(),
  subtle: {
    digest: jest.fn(),
  },
};

// Mock Headers, Response, and URL
global.Headers = jest.fn().mockImplementation(() => ({
  append: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
}));

global.Response = jest.fn().mockImplementation((body, init) => ({
  body,
  status: init?.status || 200,
  headers: init?.headers || {},
}));

global.Request = jest.fn().mockImplementation((url, init) => ({
  url,
  method: init?.method || 'GET',
  headers: init?.headers || new Headers(),
  json: jest.fn(),
}));

global.URL = jest.fn().mockImplementation((url) => ({
  toString: () => url,
  pathname: '/path',
  searchParams: {
    get: jest.fn(),
    append: jest.fn(),
  },
}));

// Mock TextEncoder and TextDecoder
global.TextEncoder = jest.fn().mockImplementation(() => ({
  encode: jest.fn().mockReturnValue(new Uint8Array()),
}));

global.TextDecoder = jest.fn().mockImplementation(() => ({
  decode: jest.fn().mockReturnValue(''),
}));

// Mock btoa and atob
global.btoa = jest.fn().mockImplementation((str) => Buffer.from(str).toString('base64'));
global.atob = jest.fn().mockImplementation((str) => Buffer.from(str, 'base64').toString());

// Mock KVNamespace
global.KVNamespace = jest.fn().mockImplementation(() => ({
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

// Mock D1Database
global.D1Database = jest.fn().mockImplementation(() => ({
  prepare: jest.fn().mockReturnValue({
    bind: jest.fn().mockReturnThis(),
    first: jest.fn(),
    all: jest.fn(),
    run: jest.fn(),
  }),
  batch: jest.fn(),
  exec: jest.fn(),
}));
