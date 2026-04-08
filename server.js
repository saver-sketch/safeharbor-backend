const express = require('express');
const plivo = require('plivo');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const client = new plivo.Client(
  process.env.PLIVO_AUTH_ID,
  process.env.PLIVO_AUTH_TOKEN
);

// Temporary code storage
const codeSessions = {};

// Send verification code
app.post('/send-code', async (req, res) => {
  try {
    let { phone } = req.body;
    // Ensure phone has +1 country code
    phone = phone.replace(/\D/g, '');
    if (phone.length === 10) phone = '+1' + phone;
    else if (phone.length === 11) phone = '+' + phone;
    else phone = '+' + phone;

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    codeSessions[phone] = {
      code,
      expires: Date.now() + 5 * 60 * 1000 // 5 minutes
    };

    await client.messages.create(
      process.env.PLIVO_PHONE,
      phone,
      `Your SafeHarbor Insurance verification code is: ${code}`
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false, error: 'Failed to send code' });
  }
});

// Verify the code
app.post('/verify-code', (req, res) => {
  try {
    let { phone, code } = req.body;
    // Ensure phone has +1 country code
    phone = phone.replace(/\D/g, '');
    if (phone.length === 10) phone = '+1' + phone;
    else if (phone.length === 11) phone = '+' + phone;
    else phone = '+' + phone;

    const session = codeSessions[phone];

    if (!session) {
      return res.json({ success: false, error: 'No code found. Please request a new one.' });
    }
    if (Date.now() > session.expires) {
      delete codeSessions[phone];
      return res.json({ success: false, error: 'Code expired. Please request a new one.' });
    }
    if (session.code !== code) {
      return res.json({ success: false, error: 'Incorrect code. Please try again.' });
    }

    delete codeSessions[phone];
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false, error: 'Verification failed. Please try again.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SafeHarbor verification server running on port ${PORT}`));
