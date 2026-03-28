require('dotenv').config();

const required = [
  'TELNYX_API_KEY',
  'TELNYX_CONNECTION_ID',
  'TELNYX_SIP_NUMBER',
  'MOBILE_NUMBER',
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}`
  );
}

module.exports = Object.freeze({
  port: process.env.PORT || 3000,
  telnyxApiKey: process.env.TELNYX_API_KEY,
  telnyxConnectionId: process.env.TELNYX_CONNECTION_ID,
  telnyxSipNumber: process.env.TELNYX_SIP_NUMBER,
  mobileNumber: process.env.MOBILE_NUMBER,
  telnyxPublicKey: process.env.TELNYX_PUBLIC_KEY,
});
