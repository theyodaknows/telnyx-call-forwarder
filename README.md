# Telnyx Call Forwarder

## Overview

A Node.js/Express app that receives inbound call webhooks from Telnyx, automatically answers the call, dials out to mobile number +19094131530, and bridges both legs so audio flows bidirectionally — displaying SIP number 909-515-5550 as the Caller ID on the mobile phone. Deployed on Railway.

## Prerequisites

- Telnyx account with a Call Control Connection set up
- A SIP number (909-515-5550) assigned to the connection
- Railway account for deployment
- Node.js 20+ for local development

## Telnyx Setup Instructions

1. Create a Call Control Connection in the [Telnyx Mission Control portal](https://portal.telnyx.com)
2. Assign the SIP number (909-515-5550) to the connection
3. Set the webhook URL to `https://<railway-domain>/webhooks/voice`
4. Note the **Connection ID** and **API Key** from the portal

## Local Development

```bash
cp .env.example .env   # then fill in your values
npm install
npm run dev
```

To expose your local server to Telnyx:

```bash
ngrok http 3000
```

Copy the ngrok HTTPS URL (e.g. `https://abc123.ngrok.io`) and set it as the webhook URL in the Telnyx portal: `https://abc123.ngrok.io/webhooks/voice`

## Railway Deployment

1. Connect your GitHub repo to a new Railway project
2. Set all environment variables in the Railway dashboard (see [Environment Variables](#environment-variables) below)
3. Railway auto-detects Node.js and runs `npm start` — no Dockerfile needed
4. Copy the Railway-assigned domain URL from the project settings
5. Update the Telnyx webhook URL to `https://<railway-domain>/webhooks/voice`

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `PORT` | Server port (Railway sets this automatically) | `3000` |
| `TELNYX_API_KEY` | Telnyx v2 API key | `KEY01...` |
| `TELNYX_CONNECTION_ID` | Call Control Connection ID | `1234567890` |
| `TELNYX_SIP_NUMBER` | SIP number to show as Caller ID | `+19095155550` |
| `MOBILE_NUMBER` | Mobile number to forward calls to | `+19094131530` |
| `TELNYX_PUBLIC_KEY` | Telnyx public key for webhook verification | *(from Telnyx portal)* |

## Testing

Run the test suite:

```bash
npm test
```

This runs both unit and integration tests.

### Manual E2E Test Procedure

1. Start the app locally: `npm run dev`
2. Start ngrok: `ngrok http 3000`
3. Set the ngrok HTTPS URL as the webhook in the Telnyx portal
4. Call the Telnyx SIP number from any phone
5. Verify: mobile (909-413-1530) rings
6. Verify: Caller ID on mobile shows **909-515-5550**
7. Answer the mobile; verify two-way audio works
8. Hang up either side; verify clean teardown in logs
