const { test, mock } = require('node:test');
const assert = require('node:assert');
const Module = require('module');

// Set env vars before any requires touch config.js
process.env.TELNYX_API_KEY = 'test-key';
process.env.TELNYX_CONNECTION_ID = 'test-conn-id';
process.env.TELNYX_SIP_NUMBER = '+19095155550';
process.env.MOBILE_NUMBER = '+19094131530';

// Build mock telnyx client
const mockAnswerFn = mock.fn(async () => ({ data: {} }));
const mockDialFn = mock.fn(async () => ({ data: { call_control_id: 'outbound-123' } }));
const mockBridgeFn = mock.fn(async () => ({ data: {} }));

const mockTelnyx = {
  calls: {
    actions: {
      answer: mockAnswerFn,
      bridge: mockBridgeFn,
    },
    dial: mockDialFn,
  },
};

// Override Module._load so require('telnyx') returns our mock factory
const originalLoad = Module._load;
Module._load = function (request, ...args) {
  if (request === 'telnyx') {
    return () => mockTelnyx;
  }
  return originalLoad.call(this, request, ...args);
};

const callHandler = require('../src/services/callHandler');

// Restore immediately after callHandler is loaded
Module._load = originalLoad;

test('handleIncomingCall calls answer with correct callControlId', async () => {
  mockAnswerFn.mock.resetCalls();
  await callHandler.handleIncomingCall('ctrl-abc');
  assert.strictEqual(mockAnswerFn.mock.calls.length, 1);
  assert.strictEqual(mockAnswerFn.mock.calls[0].arguments[0], 'ctrl-abc');
});

test('dialMobile calls dial with correct params and correct Base64 client_state', async () => {
  mockDialFn.mock.resetCalls();
  await callHandler.dialMobile('inbound-ctrl-id');
  assert.strictEqual(mockDialFn.mock.calls.length, 1);
  const args = mockDialFn.mock.calls[0].arguments[0];
  assert.strictEqual(args.to, process.env.MOBILE_NUMBER);
  assert.strictEqual(args.from, process.env.TELNYX_SIP_NUMBER);
  assert.strictEqual(args.connection_id, process.env.TELNYX_CONNECTION_ID);
  // Decode and verify client_state contains bridgeId
  const decoded = JSON.parse(Buffer.from(args.client_state, 'base64').toString('utf8'));
  assert.strictEqual(decoded.bridgeId, 'inbound-ctrl-id');
});

test('bridgeCalls decodes client_state and calls bridge with correct bridgeId', async () => {
  mockBridgeFn.mock.resetCalls();
  const clientState = Buffer.from(JSON.stringify({ bridgeId: 'inbound-ctrl-id' })).toString('base64');
  await callHandler.bridgeCalls('outbound-ctrl-id', clientState);
  assert.strictEqual(mockBridgeFn.mock.calls.length, 1);
  assert.strictEqual(mockBridgeFn.mock.calls[0].arguments[0], 'outbound-ctrl-id');
  assert.strictEqual(
    mockBridgeFn.mock.calls[0].arguments[1].call_control_id_to_bridge_with,
    'inbound-ctrl-id'
  );
});

test('bridgeCalls rejects if client_state is not valid Base64 JSON', async () => {
  // 'abc' decodes to non-JSON bytes, causing JSON.parse to throw SyntaxError
  await assert.rejects(
    callHandler.bridgeCalls('ctrl-id', 'abc'),
    (err) => err instanceof SyntaxError
  );
});
