const { test, mock, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const path = require('path');
const Module = require('module');

// Set env vars before any requires touch config.js
process.env.TELNYX_API_KEY = 'test-key';
process.env.TELNYX_CONNECTION_ID = 'test-conn';
process.env.TELNYX_SIP_NUMBER = '+19095155550';
process.env.MOBILE_NUMBER = '+19094131530';

// Build mock callHandler
const mockHandleIncomingCall = mock.fn(async () => {});
const mockDialMobile = mock.fn(async () => {});
const mockBridgeCalls = mock.fn(async () => {});

const mockCallHandler = {
  handleIncomingCall: mockHandleIncomingCall,
  dialMobile: mockDialMobile,
  bridgeCalls: mockBridgeCalls,
};

// Resolve absolute path so we can intercept regardless of relative require strings
const callHandlerAbsPath = path.resolve(__dirname, '../src/services/callHandler.js');

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  // Intercept telnyx in case any required module tries to load it
  if (request === 'telnyx') {
    return () => ({
      calls: {
        actions: { answer: async () => {}, bridge: async () => {} },
        dial: async () => {},
      },
    });
  }
  // Intercept callHandler by resolving to its absolute path
  let resolved;
  try {
    resolved = Module._resolveFilename(request, parent, isMain);
  } catch (_) {
    return originalLoad.call(this, request, parent, isMain);
  }
  if (resolved === callHandlerAbsPath) {
    return mockCallHandler;
  }
  return originalLoad.call(this, request, parent, isMain);
};

const express = require('express');
const webhooksRouter = require('../src/routes/webhooks');

// Restore after our modules are loaded
Module._load = originalLoad;

const testApp = express();
testApp.use(express.json());
testApp.use('/webhooks/voice', webhooksRouter);

let server;
let port;

before(
  () =>
    new Promise((resolve) => {
      server = http.createServer(testApp);
      server.listen(0, () => {
        port = server.address().port;
        resolve();
      });
    })
);

after(
  () =>
    new Promise((resolve) => {
      server.close(resolve);
    })
);

function makeRequest(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      {
        port,
        path: '/webhooks/voice',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => resolve({ statusCode: res.statusCode, body: responseBody }));
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function makeWebhookBody(eventType, direction, clientState) {
  const payload = {
    call_control_id: 'ctrl-test-123',
    direction: direction || 'incoming',
  };
  if (clientState !== undefined) {
    payload.client_state = clientState;
  }
  return { data: { event_type: eventType, payload } };
}

test('call.initiated incoming returns 200 and calls handleIncomingCall', async () => {
  mockHandleIncomingCall.mock.resetCalls();
  const result = await makeRequest(makeWebhookBody('call.initiated', 'incoming'));
  assert.strictEqual(result.statusCode, 200);
  assert.strictEqual(mockHandleIncomingCall.mock.calls.length, 1);
  assert.strictEqual(mockHandleIncomingCall.mock.calls[0].arguments[0], 'ctrl-test-123');
});

test('call.initiated outgoing returns 200 and does NOT call handleIncomingCall', async () => {
  mockHandleIncomingCall.mock.resetCalls();
  const result = await makeRequest(makeWebhookBody('call.initiated', 'outgoing'));
  assert.strictEqual(result.statusCode, 200);
  assert.strictEqual(mockHandleIncomingCall.mock.calls.length, 0);
});

test('call.answered with client_state returns 200 and calls bridgeCalls', async () => {
  mockBridgeCalls.mock.resetCalls();
  mockDialMobile.mock.resetCalls();
  const clientState = Buffer.from(JSON.stringify({ bridgeId: 'inbound-id' })).toString('base64');
  const result = await makeRequest(makeWebhookBody('call.answered', 'incoming', clientState));
  assert.strictEqual(result.statusCode, 200);
  assert.strictEqual(mockBridgeCalls.mock.calls.length, 1);
  assert.strictEqual(mockDialMobile.mock.calls.length, 0);
});

test('call.answered without client_state returns 200 and does NOT call dialMobile', async () => {
  mockDialMobile.mock.resetCalls();
  mockBridgeCalls.mock.resetCalls();
  const result = await makeRequest(makeWebhookBody('call.answered', 'incoming'));
  assert.strictEqual(result.statusCode, 200);
  assert.strictEqual(mockDialMobile.mock.calls.length, 0);
  assert.strictEqual(mockBridgeCalls.mock.calls.length, 0);
});

test('call.hangup returns 200', async () => {
  const result = await makeRequest(makeWebhookBody('call.hangup', 'incoming'));
  assert.strictEqual(result.statusCode, 200);
});

test('call.bridged returns 200', async () => {
  const result = await makeRequest(makeWebhookBody('call.bridged', 'incoming'));
  assert.strictEqual(result.statusCode, 200);
});

test('unknown event type returns 200', async () => {
  const result = await makeRequest(makeWebhookBody('call.unknown_event', 'incoming'));
  assert.strictEqual(result.statusCode, 200);
});

test('malformed body (missing data field) returns 200 without crashing', async () => {
  const result = await makeRequest({ notdata: 'something' });
  assert.strictEqual(result.statusCode, 200);
});
