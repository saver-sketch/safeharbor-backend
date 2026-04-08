const express = require('express');
const twilio = require('twilio');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const VERIFY_SID = process.env.TWILIO_VERIFY_SID;

// Send verification code via Twilio Verify
app.post('/send-code', async (req, res) => {
  try {
    let { phone } = req.body;
    phone = phone.replace(/\D/g, '');
    if (phone.length === 10) phone = '+1' + phone;
    else if (phone.length === 11) phone = '+' + phone;
    else phone = '+' + phone;

    await client.verify.v2.services(VERIFY_SID)
      .verifications.create({ to: phone, channel: 'sms' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false, error: 'Failed to send code' });
  }
});

// Verify the code
app.post('/verify-code', async (req, res) => {
  try {
    let { phone, code } = req.body;
    phone = phone.replace(/\D/g, '');
    if (phone.length === 10) phone = '+1' + phone;
    else if (phone.length === 11) phone = '+' + phone;
    else phone = '+' + phone;

    const check = await client.verify.v2.services(VERIFY_SID)
      .verificationChecks.create({ to: phone, code });
    if (check.status === 'approved') {
      res.json({ success: true });
    } else {
      res.json({ success: false, error: 'Incorrect code. Please try again.' });
    }
  } catch (err) {
    console.error(err);
    res.json({ success: false, error: 'Verification failed. Please try again.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SafeHarbor verification server running on port ${PORT}`));
