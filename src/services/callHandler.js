const Telnyx = require('telnyx');
const config = require('../config');

const telnyx = Telnyx(config.telnyxApiKey);

async function handleIncomingCall(callControlId) {
  console.log(`Answering inbound call: ${callControlId}`);
  return telnyx.calls.actions.answer(callControlId, {});
}

async function dialMobile(inboundCallControlId) {
  const clientState = Buffer.from(
    JSON.stringify({ bridgeId: inboundCallControlId })
  ).toString('base64');

  console.log(`Dialing mobile: ${config.mobileNumber} from ${config.telnyxSipNumber}`);
  return telnyx.calls.dial({
    connection_id: config.telnyxConnectionId,
    to: config.mobileNumber,
    from: config.telnyxSipNumber,
    client_state: clientState,
    timeout_secs: 30,
  });
}

async function bridgeCalls(outboundCallControlId, clientState64) {
  const decoded = JSON.parse(Buffer.from(clientState64, 'base64').toString('utf8'));
  const bridgeId = decoded.bridgeId;

  console.log(`Bridging outbound ${outboundCallControlId} to inbound ${bridgeId}`);
  return telnyx.calls.actions.bridge(outboundCallControlId, {
    call_control_id_to_bridge_with: bridgeId,
  });
}

module.exports = { handleIncomingCall, dialMobile, bridgeCalls };
