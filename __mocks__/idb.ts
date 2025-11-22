export const openDB = jest.fn().mockResolvedValue({
  add: jest.fn(),
  getAll: jest.fn().mockResolvedValue([]),
  clear: jest.fn(),
  count: jest.fn().mockResolvedValue(0),
});
