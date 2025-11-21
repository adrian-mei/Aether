import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream } from 'stream/web';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as unknown as typeof global.TextDecoder;
global.ReadableStream = ReadableStream as unknown as typeof global.ReadableStream;
