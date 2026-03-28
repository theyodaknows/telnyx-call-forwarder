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

    switch (event_type) {
      case 'call.initiated':
        if (direction === 'incoming') {
          callHandler.handleIncomingCall(call_control_id);
        } else {
          console.log(`Outbound call initiated: ${call_control_id}, ignoring`);
        }
        break;

      case 'call.answered':
        if (client_state) {
          callHandler.bridgeCalls(call_control_id, client_state);
        } else {
          callHandler.dialMobile(call_control_id);
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
