const express = require('express');
const router = express.Router();
const callHandler = require('../services/callHandler');

router.post('/', (req, res) => {
  res.sendStatus(200);

  try {
    const event_type = req.body.data.event_type;
    const payload = req.body.data.payload;
    const call_control_id = payload.call_control_id;
    const direction = payload.direction;
    const client_state = payload.client_state;

    console.log(`Event: ${event_type}, Direction: ${direction}, Call ID: ${call_control_id}`);

    switch (event_type) {
      case 'call.initiated':
        console.log(`call.initiated - direction: ${direction}, call_control_id: ${call_control_id}`);
        if (direction === 'incoming') {
          console.log(`Answering incoming call: ${call_control_id}`);
          callHandler.handleIncomingCall(call_control_id).catch(err => {
            console.error(`Error answering call ${call_control_id}:`, err.message);
          });
        } else if (direction === 'outgoing') {
          console.log(`Outbound call initiated: ${call_control_id}, ignoring`);
        } else {
          console.log(`Unknown direction "${direction}" for call ${call_control_id}, not answering`);
        }
        break;

      case 'call.answered':
        if (client_state) {
          callHandler.bridgeCalls(call_control_id, client_state).catch(err => {
            console.error(`Error bridging calls for ${call_control_id}:`, err.message);
          });
        } else {
          callHandler.dialMobile(call_control_id).catch(err => {
            console.error(`Error dialing mobile from ${call_control_id}:`, err.message);
          });
        }
        break;

      case 'call.bridged':
        console.log('Calls bridged successfully');
        break;

      case 'call.hangup':
        console.log(`Call ended: ${call_control_id}`);
        break;

      default:
        console.log(`Unhandled event: ${event_type}`);
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
  }
});

module.exports = router;
