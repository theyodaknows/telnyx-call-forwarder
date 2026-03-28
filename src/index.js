const config = require('./config');
const express = require('express');
const morgan = require('morgan');
const webhooksRouter = require('./routes/webhooks');

const app = express();

app.use(express.json());
app.use(morgan('combined'));

app.use('/webhooks/voice', webhooksRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(config.port, () => {
  console.log(`Telnyx call forwarder listening on port ${config.port}`);
});

module.exports = app;
