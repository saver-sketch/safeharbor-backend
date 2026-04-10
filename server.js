const express = require('express');
const twilio = require('twilio');
const cors = require('cors');
const sgMail = require('@sendgrid/mail');
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
    const { fname, lname, phone, email, coverage, age, health, smoker, forWho } = req.body;

    // Send email via SendGrid
    const msg = {
      to: process.env.EMAIL_TO,
      from: 'leads@safeharborquote.com',
      subject: `🔔 New Lead: ${fname} ${lname} — SafeHarbor Insurance`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f6f7fa;padding:20px;border-radius:12px;">
          <div style="background:#0D2150;padding:24px;border-radius:10px 10px 0 0;text-align:center;">
            <h1 style="color:white;font-size:24px;margin:0;">🛡️ New SafeHarbor Lead</h1>
            <p style="color:rgba(255,255,255,0.7);margin:8px 0 0;">Submitted via SafeHarbor landing page</p>
          </div>
          <div style="background:white;padding:24px;border-radius:0 0 10px 10px;border:1px solid #e8eaf0;">
            <h2 style="color:#B8102A;font-size:18px;margin-bottom:16px;">📋 Lead Details</h2>
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
                <td style="padding:10px 14px;font-weight:700;color:#0D2150;">Coverage For</td>
                <td style="padding:10px 14px;color:#2c3550;">${forWho}</td>
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
            <div style="margin-top:20px;padding:14px;background:#fff0f2;border-left:4px solid #B8102A;border-radius:6px;">
              <p style="margin:0;color:#B8102A;font-weight:700;">⚡ Phone number verified via SMS</p>
            </div>
          </div>
          <p style="text-align:center;color:#8a93aa;font-size:12px;margin-top:16px;">SafeHarbor Insurance · safeharborquote.com</p>
        </div>
      `
    };

    await sgMail.send(msg);

    // Submit lead to DYL CRM
    const axios = require('axios');
    const dylParams = new URLSearchParams();
    dylParams.append('d1-name', `${fname} ${lname}`);
    dylParams.append('d1-phone', phone);
    dylParams.append('d1-email', email);
    dylParams.append('d1-note', `Coverage For: ${forWho} | Age: ${age} | Coverage: ${coverage} | Health: ${health} | Smoker: ${smoker}`);
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

// Send lead email
app.post('/submit-lead', async (req, res) => {
  try {
    const { fname, lname, phone, email, coverage, age, health, smoker, forWho } = req.body;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO,
      subject: `🔔 New Lead: ${fname} ${lname} — SafeHarbor Insurance`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f6f7fa;padding:20px;border-radius:12px;">
          <div style="background:#0D2150;padding:24px;border-radius:10px 10px 0 0;text-align:center;">
            <h1 style="color:white;font-size:24px;margin:0;">🛡️ New SafeHarbor Lead</h1>
            <p style="color:rgba(255,255,255,0.7);margin:8px 0 0;">Submitted via safeharbor landing page</p>
          </div>
          <div style="background:white;padding:24px;border-radius:0 0 10px 10px;border:1px solid #e8eaf0;">
            <h2 style="color:#B8102A;font-size:18px;margin-bottom:16px;">📋 Lead Details</h2>
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
                <td style="padding:10px 14px;font-weight:700;color:#0D2150;">Coverage For</td>
                <td style="padding:10px 14px;color:#2c3550;">${forWho}</td>
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
            <div style="margin-top:20px;padding:14px;background:#fff0f2;border-left:4px solid #B8102A;border-radius:6px;">
              <p style="margin:0;color:#B8102A;font-weight:700;">⚡ Phone number has been verified via SMS</p>
            </div>
          </div>
          <p style="text-align:center;color:#8a93aa;font-size:12px;margin-top:16px;">SafeHarbor Insurance · safeharborinsuranceusa@gmail.com</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false, error: 'Failed to send email' });
  }
});

// ── HEYGEN VIDEO GENERATION ──────────────────────────────────
const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;

const SCRIPTS = {
  1: {
    title: 'Burial Cost Shock',
    text: `The average burial in America costs over $9,600. And most families have no idea how they're going to pay for it. At MaxSave Insurance we specialize in final expense and burial coverage. Plans start at just $15 a month. No medical exam. Guaranteed approval for ages 50 to 85. Don't leave your family scrambling. Visit safeharborquote.com for your free burial coverage quote today.`
  },
  2: {
    title: 'Family Burden Story',
    text: `When my mother passed away, we were heartbroken. But on top of the grief, we were hit with a $12,000 funeral bill we had no way to pay. We didn't want to burden each other but we had no choice. That experience changed my life. Now I help families avoid that exact situation through final expense life insurance. It's specifically designed to cover burial costs, funeral expenses, and final medical bills. Plans start at just $15 a month. No medical exam required. Guaranteed coverage for ages 50 to 85. Visit safeharborquote.com — because your family deserves peace of mind.`
  },
  3: {
    title: 'What Is Burial Insurance',
    text: `Do you know what burial insurance is? It's a type of final expense life insurance designed specifically to cover your funeral and burial costs when you pass away. Your family receives a tax-free cash payment they can use for the funeral home, casket, headstone, cremation, or any other final expenses. No medical exam. No health questions. Coverage guaranteed for ages 50 to 85. Plans from just $15 a month. Your rate is locked in forever — it will never go up. Learn more at safeharborquote.com`
  },
  4: {
    title: 'Health Conditions No Problem',
    text: `Have diabetes? Heart disease? COPD? You can still get final expense burial insurance. At MaxSave Insurance we offer guaranteed issue burial coverage — that means absolutely no health questions asked and no one gets turned down. Whether you're 50 or 85, whether you're healthy or not, we have a plan for you. Coverage from $5,000 to $35,000. Rates as low as $15 a month. Your family will receive the full benefit tax-free when the time comes. Get your free quote at safeharborquote.com`
  },
  5: {
    title: 'Cremation Coverage',
    text: `Did you know the average cremation in America now costs between $2,000 and $5,000? And traditional burial can cost $10,000 or more. Final expense insurance is the most affordable way to make sure those costs are covered so your family doesn't have to worry. At MaxSave Insurance plans start at just $15 a month. No medical exam. Instant approval. Ages 50 to 85. Whether you choose burial or cremation — we've got you covered. Visit safeharborquote.com today.`
  },
  6: {
    title: 'Rate Lock Urgency',
    text: `Here's something most people don't know about final expense burial insurance — the younger you are when you sign up, the lower your rate is locked in forever. Every year you wait means a higher monthly payment for life. At MaxSave Insurance you can lock in your burial coverage today starting at just $15 a month. No medical exam. Guaranteed approval ages 50 to 85. Your rate will never go up no matter how old you get or if your health changes. Lock in your rate now at safeharborquote.com`
  },
  7: {
    title: 'Seniors Testimonial Style',
    text: `If you're between 50 and 85 years old, I want to talk to you about something important — final expense insurance. This isn't regular life insurance. It's specifically designed to cover your burial, funeral, and end of life costs so your children and grandchildren don't have to worry about paying for it. Coverage from $5,000 to $35,000. No medical exam. Guaranteed acceptance. Plans as low as $15 a month. Give your family the gift of peace of mind. Get your free quote at safeharborquote.com`
  },
  8: {
    title: 'Funeral Home Cost Breakdown',
    text: `Let me break down what a funeral actually costs in America today. Funeral home services — $2,500. Casket — $2,400. Burial plot — $1,500. Headstone — $1,500. Total — nearly $10,000. Does your family have $10,000 ready? Most don't. That's why final expense burial insurance exists. At MaxSave Insurance we provide affordable coverage starting at $15 a month so your family never has to face that burden. No medical exam. Guaranteed approval ages 50 to 85. Get covered today at safeharborquote.com`
  }
};

// Get available avatars
app.get('/heygen/avatars', async (req, res) => {
  try {
    const axios = require('axios');
    const response = await axios.get('https://api.heygen.com/v2/avatars', {
      headers: { 'X-Api-Key': HEYGEN_API_KEY }
    });
    const avatars = response.data.data.avatars || [];
    res.json({ success: true, avatars });
  } catch (err) {
    console.error('HeyGen avatars error:', err.message);
    res.json({ success: false, error: err.message });
  }
});

// Generate videos
app.post('/heygen/generate', async (req, res) => {
  try {
    const axios = require('axios');
    const { scripts } = req.body;

    // Get avatars
    const avatarRes = await axios.get('https://api.heygen.com/v2/avatars', {
      headers: { 'X-Api-Key': HEYGEN_API_KEY }
    });
    const avatars = avatarRes.data.data.avatars || [];

    // Get voices
    const voiceRes = await axios.get('https://api.heygen.com/v2/voices', {
      headers: { 'X-Api-Key': HEYGEN_API_KEY }
    });
    const voices = voiceRes.data.data.voices || [];

    console.log(`Found ${avatars.length} avatars and ${voices.length} voices`);

    const jobs = [];

    for (let i = 0; i < scripts.length; i++) {
      const scriptNum = scripts[i];
      const script = SCRIPTS[scriptNum];
      if (!script) continue;

      const avatar = avatars[i % avatars.length];
      const voice = voices[i % voices.length];

      console.log(`Generating script ${scriptNum} with avatar: ${avatar.avatar_id}, voice: ${voice.voice_id}`);

      const payload = {
        video_inputs: [{
          character: {
            type: 'avatar',
            avatar_id: avatar.avatar_id,
            avatar_style: 'normal'
          },
          voice: {
            type: 'text',
            input_text: script.text,
            voice_id: voice.voice_id,
            speed: 1.0
          },
          background: {
            type: 'color',
            value: '#ffffff'
          }
        }],
        dimension: { width: 1080, height: 1920 }
      };

      try {
        const videoRes = await axios.post('https://api.heygen.com/v2/video/generate', payload, {
          headers: { 'X-Api-Key': HEYGEN_API_KEY, 'Content-Type': 'application/json' }
        });
        console.log(`Script ${scriptNum} response:`, JSON.stringify(videoRes.data));

        jobs.push({
          script_num: scriptNum,
          title: script.title,
          video_id: videoRes.data.data.video_id,
          avatar_name: avatar.avatar_name,
          voice_name: voice.name || voice.language,
          status: 'processing'
        });
      } catch (videoErr) {
        console.error(`Script ${scriptNum} error:`, videoErr.response?.data || videoErr.message);
        jobs.push({
          script_num: scriptNum,
          title: script.title,
          video_id: null,
          error: videoErr.response?.data?.message || videoErr.message,
          status: 'failed'
        });
      }
    }

    res.json({ success: true, jobs });
  } catch (err) {
    console.error('HeyGen generate error:', err.response?.data || err.message);
    res.json({ success: false, error: err.response?.data?.message || err.message });
  }
});

// Check video status
app.get('/heygen/status/:videoId', async (req, res) => {
  try {
    const axios = require('axios');
    const { videoId } = req.params;
    const response = await axios.get(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
      headers: { 'X-Api-Key': HEYGEN_API_KEY }
    });
    const data = response.data.data;
    res.json({
      status: data.status,
      progress: data.progress || 0,
      video_url: data.video_url || null
    });
  } catch (err) {
    console.error('HeyGen status error:', err.message);
    res.json({ success: false, error: err.message });
  }
});
// ────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SafeHarbor verification server running on port ${PORT}`));
