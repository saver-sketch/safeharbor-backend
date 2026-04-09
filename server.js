const express = require('express');
const twilio = require('twilio');
const cors = require('cors');
const sgMail = require('@sendgrid/mail');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const VERIFY_SID = process.env.TWILIO_VERIFY_SID;

// SendGrid setup
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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

// Send lead email via SendGrid + submit to DYL CRM
app.post('/submit-lead', async (req, res) => {
  try {
    // Extract all fields including address
    const { 
      fname, 
      lname, 
      phone, 
      email, 
      coverage, 
      age, 
      health, 
      smoker,
      dob
    } = req.body;
    
    // Get address fields with their special names
    const address = req.body['add-address'] || '';
    const city = req.body['add-field-city'] || '';
    const state = req.body['add-field-state'] || '';
    const zip = req.body['add-field-zip'] || '';

    // Send email via SendGrid
    const msg = {
      to: process.env.EMAIL_TO,
      from: 'leads@safeharborquote.com',
      subject: `🔔 New Lead: ${fname} ${lname} — MaxSave Insurance`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f6f7fa;padding:20px;border-radius:12px;">
          <div style="background:#0D2150;padding:24px;border-radius:10px 10px 0 0;text-align:center;">
            <h1 style="color:white;font-size:24px;margin:0;">🛡️ New MaxSave Lead</h1>
            <p style="color:rgba(255,255,255,0.7);margin:8px 0 0;">Submitted via MaxSave landing page</p>
          </div>
          <div style="background:white;padding:24px;border-radius:0 0 10px 10px;border:1px solid #e8eaf0;">
            <h2 style="color:#7cb342;font-size:18px;margin-bottom:16px;">📋 Lead Details</h2>
            <table style="width:100%;border-collapse:collapse;">
              <tr style="background:#f6f7fa;">
                <td style="padding:10px 14px;font-weight:700;color:#0D2150;width:40%;">Full Name</td>
                <td style="padding:10px 14px;color:#2c3550;">${fname} ${lname}</td>
              </tr>
              <tr>
                <td style="padding:10px 14px;font-weight:700;color:#0D2150;">Phone</td>
                <td style="padding:10px 14px;color:#2c3550;">${phone}</td>
              </tr>
              <tr style="background:#f6f7fa;">
                <td style="padding:10px 14px;font-weight:700;color:#0D2150;">Email</td>
                <td style="padding:10px 14px;color:#2c3550;">${email}</td>
              </tr>
              <tr>
                <td style="padding:10px 14px;font-weight:700;color:#0D2150;">Address</td>
                <td style="padding:10px 14px;color:#2c3550;">${address || 'N/A'}</td>
              </tr>
              <tr style="background:#f6f7fa;">
                <td style="padding:10px 14px;font-weight:700;color:#0D2150;">City, State Zip</td>
                <td style="padding:10px 14px;color:#2c3550;">${city}, ${state} ${zip}</td>
              </tr>
              <tr>
                <td style="padding:10px 14px;font-weight:700;color:#0D2150;">Date of Birth</td>
                <td style="padding:10px 14px;color:#2c3550;">${dob || 'N/A'}</td>
              </tr>
              <tr style="background:#f6f7fa;">
                <td style="padding:10px 14px;font-weight:700;color:#0D2150;">Age</td>
                <td style="padding:10px 14px;color:#2c3550;">${age}</td>
              </tr>
              <tr>
                <td style="padding:10px 14px;font-weight:700;color:#0D2150;">Coverage Amount</td>
                <td style="padding:10px 14px;color:#2c3550;">${coverage}</td>
              </tr>
              <tr style="background:#f6f7fa;">
                <td style="padding:10px 14px;font-weight:700;color:#0D2150;">Health Conditions</td>
                <td style="padding:10px 14px;color:#2c3550;">${health}</td>
              </tr>
              <tr>
                <td style="padding:10px 14px;font-weight:700;color:#0D2150;">Smoking Status</td>
                <td style="padding:10px 14px;color:#2c3550;">${smoker}</td>
              </tr>
            </table>
            <div style="margin-top:20px;padding:14px;background:#e8f5e9;border-left:4px solid #7cb342;border-radius:6px;">
              <p style="margin:0;color:#7cb342;font-weight:700;">⚡ Phone number verified via SMS</p>
            </div>
          </div>
          <p style="text-align:center;color:#8a93aa;font-size:12px;margin-top:16px;">MaxSave Insurance · maxsaveins.com</p>
        </div>
      `
    };

    await sgMail.send(msg);

    // Submit lead to DYL CRM with address fields
    const dylParams = new URLSearchParams();
    dylParams.append('d1-name', `${fname} ${lname}`);
    dylParams.append('d1-phone', phone);
    dylParams.append('d1-email', email);
    
    // ADD ADDRESS FIELDS TO DYL
    dylParams.append('add-address', address);
    dylParams.append('add-field-city', city);
    dylParams.append('add-field-state', state);
    dylParams.append('add-field-zip', zip);
    
    dylParams.append('d1-note', `DOB: ${dob || 'N/A'} | Age: ${age} | Coverage: ${coverage} | Health: ${health} | Smoker: ${smoker}`);
    dylParams.append('a0-1_1', '24191257238');
    dylParams.append('cmd-1_1', 'user_contact');
    dylParams.append('do-1_1', 'Submit');

    try {
      const dylRes = await axios.post('https://my.dyl.com/form/contact?id=24191257238', dylParams.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      console.log('DYL response:', dylRes.status, JSON.stringify(dylRes.data));
    } catch (dylErr) {
      console.error('DYL error:', dylErr.message);
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false, error: 'Failed to send email' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`MaxSave verification server running on port ${PORT}`));
