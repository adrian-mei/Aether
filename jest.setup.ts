/* eslint-disable @typescript-eslint/no-explicit-any */
import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream } from 'stream/web';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as unknown as typeof global.TextDecoder;
global.ReadableStream = ReadableStream as unknown as typeof global.ReadableStream;

// Mock IDB Globals
global.IDBRequest = class {} as any;
global.IDBTransaction = class {} as any;
global.IDBKeyRange = class {} as any;
global.IDBDatabase = class {} as any;
global.IDBObjectStore = class {} as any;
global.IDBIndex = class {} as any;
global.IDBCursor = class {} as any;

// Mock IndexedDB
const indexedDB = {
  open: () => ({
    result: {
      objectStoreNames: {
        contains: () => false
      },
      createObjectStore: () => {},
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    onsuccess: () => {},
    onerror: () => {},
  }),
};
global.indexedDB = indexedDB as unknown as IDBFactory;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
