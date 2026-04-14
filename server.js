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

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// ── SEND OTP CODE ─────────────────────────────────────────────
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
    console.error('Send code error:', err);
    res.json({ success: false, error: 'Failed to send code' });
  }
});

// ── VERIFY OTP CODE ───────────────────────────────────────────
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
    console.error('Verify code error:', err);
    res.json({ success: false, error: 'Verification failed. Please try again.' });
  }
});

// ── EMAIL TEMPLATES ───────────────────────────────────────────

function getEmailTemplate1(fname, lname) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f6f7fa;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">
    
    <!-- Header -->
    <div style="background:#2e4a7c;padding:32px 24px;text-align:center;">
      <div style="font-family:'Arial Black',sans-serif;font-size:28px;font-weight:800;color:#7cb342;letter-spacing:1px;">MAXSAVE</div>
      <div style="font-family:'Arial Black',sans-serif;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:1px;margin-top:4px;">INSURANCE</div>
      <div style="color:rgba(255,255,255,0.7);font-size:12px;margin-top:8px;letter-spacing:2px;">WHERE YOUR FAMILY'S SAFETY BEGINS</div>
    </div>

    <!-- Body -->
    <div style="padding:40px 32px;">
      <h1 style="color:#2e4a7c;font-size:24px;margin:0 0 20px;font-weight:700;">Thank You, ${fname}!</h1>
      
      <p style="color:#2c3550;font-size:16px;line-height:1.7;margin:0 0 20px;">
        We received your request for a final expense insurance quote. A licensed MaxSave agent will be calling you <strong>within the next 5 minutes</strong> to discuss your options.
      </p>

      <div style="background:#f0f9ff;border-left:4px solid #7cb342;padding:20px;margin:24px 0;border-radius:4px;">
        <p style="margin:0;color:#2e4a7c;font-size:15px;font-weight:600;">
          ✓ No medical exam required<br>
          ✓ Rates locked in for life<br>
          ✓ Coverage starts immediately<br>
          ✓ Plans from just $15/month
        </p>
      </div>

      <p style="color:#2c3550;font-size:16px;line-height:1.7;margin:0 0 20px;">
        If you have any questions in the meantime, feel free to call us directly at:
      </p>

      <div style="text-align:center;margin:32px 0;">
        <a href="tel:+18582277727" style="display:inline-block;background:#7cb342;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:8px;font-size:20px;font-weight:700;">
          📞 (858) 227-7727
        </a>
      </div>

      <p style="color:#2c3550;font-size:16px;line-height:1.7;margin:24px 0 0;">
        Talk soon,<br>
        <strong>Darlene Zoura</strong><br>
        <span style="color:#8a93aa;font-size:14px;">Senior Insurance Advisor at MaxSave</span>
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f6f7fa;padding:24px;text-align:center;border-top:1px solid #e8eaf0;">
      <p style="margin:0;color:#8a93aa;font-size:12px;line-height:1.6;">
        MaxSave Insurance · maxsavequote.com<br>
        © 2025 MaxSave Insurance. All rights reserved.
      </p>
    </div>

  </div>
</body>
</html>
  `;
}

function getEmailTemplate2(fname, lname) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f6f7fa;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">
    
    <!-- Header -->
    <div style="background:#2e4a7c;padding:32px 24px;text-align:center;">
      <div style="font-family:'Arial Black',sans-serif;font-size:28px;font-weight:800;color:#7cb342;letter-spacing:1px;">MAXSAVE</div>
      <div style="font-family:'Arial Black',sans-serif;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:1px;margin-top:4px;">INSURANCE</div>
      <div style="color:rgba(255,255,255,0.7);font-size:12px;margin-top:8px;letter-spacing:2px;">WHERE YOUR FAMILY'S SAFETY BEGINS</div>
    </div>

    <!-- Body -->
    <div style="padding:40px 32px;">
      <h1 style="color:#2e4a7c;font-size:24px;margin:0 0 20px;font-weight:700;">We Tried to Reach You, ${fname}</h1>
      
      <p style="color:#2c3550;font-size:16px;line-height:1.7;margin:0 0 20px;">
        We called earlier about your final expense insurance quote, but we weren't able to connect.
      </p>

      <p style="color:#2c3550;font-size:16px;line-height:1.7;margin:0 0 20px;">
        <strong>Good news:</strong> Based on your information, we've found several affordable plans that can protect your family for as little as <strong>$15-$40 per month</strong>.
      </p>

      <div style="background:#fff5f5;border-left:4px solid #7cb342;padding:20px;margin:24px 0;border-radius:4px;">
        <p style="margin:0 0 12px;color:#2e4a7c;font-size:17px;font-weight:700;">
          Why Final Expense Insurance?
        </p>
        <p style="margin:0;color:#2c3550;font-size:15px;line-height:1.6;">
          The average funeral costs <strong>$9,600</strong>. Don't leave your loved ones with this burden. Lock in your rate today — it will never increase, even as you age.
        </p>
      </div>

      <p style="color:#2c3550;font-size:16px;line-height:1.7;margin:0 0 20px;">
        <strong>Call us back at your convenience:</strong>
      </p>

      <div style="text-align:center;margin:32px 0;">
        <a href="tel:+18582277727" style="display:inline-block;background:#7cb342;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:8px;font-size:20px;font-weight:700;">
          📞 (858) 227-7727
        </a>
      </div>

      <p style="color:#8a93aa;font-size:14px;line-height:1.6;margin:24px 0 0;text-align:center;">
        Available Monday-Friday, 9am-7pm EST<br>
        Saturday 10am-4pm EST
      </p>

      <p style="color:#2c3550;font-size:16px;line-height:1.7;margin:32px 0 0;">
        Looking forward to speaking with you,<br>
        <strong>Darlene Zoura</strong><br>
        <span style="color:#8a93aa;font-size:14px;">Senior Insurance Advisor at MaxSave</span>
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f6f7fa;padding:24px;text-align:center;border-top:1px solid #e8eaf0;">
      <p style="margin:0;color:#8a93aa;font-size:12px;line-height:1.6;">
        MaxSave Insurance · maxsavequote.com<br>
        © 2025 MaxSave Insurance. All rights reserved.
      </p>
    </div>

  </div>
</body>
</html>
  `;
}

function getEmailTemplate3(fname, lname) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f6f7fa;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">
    
    <!-- Header -->
    <div style="background:#2e4a7c;padding:32px 24px;text-align:center;">
      <div style="font-family:'Arial Black',sans-serif;font-size:28px;font-weight:800;color:#7cb342;letter-spacing:1px;">MAXSAVE</div>
      <div style="font-family:'Arial Black',sans-serif;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:1px;margin-top:4px;">INSURANCE</div>
      <div style="color:rgba(255,255,255,0.7);font-size:12px;margin-top:8px;letter-spacing:2px;">WHERE YOUR FAMILY'S SAFETY BEGINS</div>
    </div>

    <!-- Body -->
    <div style="padding:40px 32px;">
      <h1 style="color:#2e4a7c;font-size:24px;margin:0 0 20px;font-weight:700;">Your Personalized Quote is Ready, ${fname}</h1>
      
      <p style="color:#2c3550;font-size:16px;line-height:1.7;margin:0 0 20px;">
        It's been 24 hours since you requested your final expense insurance quote. We still have your information and we're ready to help protect your family.
      </p>

      <div style="background:#fff9e6;border:2px solid #7cb342;padding:24px;margin:24px 0;border-radius:8px;text-align:center;">
        <p style="margin:0 0 8px;color:#2e4a7c;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
          YOUR ESTIMATED MONTHLY RATE
        </p>
        <p style="margin:0 0 12px;color:#7cb342;font-size:40px;font-weight:800;line-height:1;">
          $15-$40/mo
        </p>
        <p style="margin:0;color:#2c3550;font-size:14px;">
          Based on your age and coverage needs
        </p>
      </div>

      <p style="color:#2c3550;font-size:16px;line-height:1.7;margin:0 0 20px;">
        <strong>Act now to lock in this rate.</strong> Rates increase with age, and waiting even a few months could cost you hundreds of dollars over the life of your policy.
      </p>

      <div style="background:#f0f9ff;border-left:4px solid #7cb342;padding:20px;margin:24px 0;border-radius:4px;">
        <p style="margin:0 0 12px;color:#2e4a7c;font-size:15px;font-weight:700;">
          What You Get:
        </p>
        <p style="margin:0;color:#2c3550;font-size:15px;line-height:1.7;">
          ✓ Guaranteed acceptance (ages 50-85)<br>
          ✓ No medical exam required<br>
          ✓ Coverage up to $35,000<br>
          ✓ Rate locked for life<br>
          ✓ Cash benefit paid directly to family
        </p>
      </div>

      <div style="text-align:center;margin:32px 0;">
        <a href="tel:+18582277727" style="display:inline-block;background:#7cb342;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:8px;font-size:20px;font-weight:700;">
          📞 Call Now: (858) 227-7727
        </a>
      </div>

      <p style="color:#2c3550;font-size:16px;line-height:1.7;margin:32px 0 0;">
        Ready to help when you are,<br>
        <strong>Darlene Zoura</strong><br>
        <span style="color:#8a93aa;font-size:14px;">Senior Insurance Advisor at MaxSave</span>
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f6f7fa;padding:24px;text-align:center;border-top:1px solid #e8eaf0;">
      <p style="margin:0;color:#8a93aa;font-size:12px;line-height:1.6;">
        MaxSave Insurance · maxsavequote.com<br>
        © 2025 MaxSave Insurance. All rights reserved.
      </p>
    </div>

  </div>
</body>
</html>
  `;
}

function getEmailTemplate4(fname, lname) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f6f7fa;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">
    
    <!-- Header -->
    <div style="background:#7cb342;padding:32px 24px;text-align:center;">
      <div style="font-family:'Arial Black',sans-serif;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:1px;">FINAL REMINDER</div>
      <div style="color:rgba(255,255,255,0.9);font-size:14px;margin-top:8px;">Your MaxSave quote expires in 48 hours</div>
    </div>

    <!-- Body -->
    <div style="padding:40px 32px;">
      <h1 style="color:#2e4a7c;font-size:24px;margin:0 0 20px;font-weight:700;">${fname}, Don't Wait Until It's Too Late</h1>
      
      <p style="color:#2c3550;font-size:16px;line-height:1.7;margin:0 0 20px;">
        This is your last chance to lock in your final expense insurance rate at the price we quoted.
      </p>

      <div style="background:#fff0f0;border:2px solid #d32f2f;padding:24px;margin:24px 0;border-radius:8px;">
        <p style="margin:0 0 12px;color:#d32f2f;font-size:16px;font-weight:700;">
          ⚠️ What happens if you wait:
        </p>
        <p style="margin:0;color:#2c3550;font-size:15px;line-height:1.7;">
          • Your rate increases with every birthday<br>
          • Health changes could disqualify you<br>
          • Your family inherits funeral debt<br>
          • Peace of mind slips away
        </p>
      </div>

      <p style="color:#2c3550;font-size:16px;line-height:1.7;margin:0 0 20px;">
        The average American funeral costs <strong>$9,600</strong>. That's a heavy burden for your loved ones to carry during an already difficult time.
      </p>

      <p style="color:#2c3550;font-size:16px;line-height:1.7;margin:0 0 20px;">
        For as little as <strong>$15-$40 per month</strong>, you can ensure your family never has to worry about these costs.
      </p>

      <div style="background:#f0f9ff;border-left:4px solid #7cb342;padding:20px;margin:24px 0;border-radius:4px;">
        <p style="margin:0;color:#2e4a7c;font-size:15px;font-weight:700;margin-bottom:12px;">
          This is YOUR last chance to:
        </p>
        <p style="margin:0;color:#2c3550;font-size:15px;line-height:1.7;">
          ✓ Lock in your current rate forever<br>
          ✓ Get guaranteed acceptance (no medical exam)<br>
          ✓ Protect your family from financial burden<br>
          ✓ Gain peace of mind today
        </p>
      </div>

      <div style="text-align:center;margin:32px 0;">
        <a href="tel:+18582277727" style="display:inline-block;background:#d32f2f;color:#ffffff;text-decoration:none;padding:18px 48px;border-radius:8px;font-size:22px;font-weight:700;">
          📞 CALL NOW: (858) 227-7727
        </a>
        <p style="margin:12px 0 0;color:#d32f2f;font-size:14px;font-weight:700;">
          Quote expires in 48 hours
        </p>
      </div>

      <p style="color:#2c3550;font-size:16px;line-height:1.7;margin:32px 0 0;">
        Don't let this opportunity pass,<br>
        <strong>Darlene Zoura</strong><br>
        <span style="color:#8a93aa;font-size:14px;">Senior Insurance Advisor at MaxSave</span><br>
        <span style="color:#8a93aa;font-size:14px;">(858) 227-7727</span>
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f6f7fa;padding:24px;text-align:center;border-top:1px solid #e8eaf0;">
      <p style="margin:0;color:#8a93aa;font-size:12px;line-height:1.6;">
        MaxSave Insurance · maxsavequote.com<br>
        © 2025 MaxSave Insurance. All rights reserved.
      </p>
      <p style="margin:12px 0 0;color:#8a93aa;font-size:11px;">
        Don't want to receive these emails? <a href="#" style="color:#8a93aa;">Unsubscribe</a>
      </p>
    </div>

  </div>
</body>
</html>
  `;
}

// ── SUBMIT LEAD WITH EMAIL SEQUENCE ───────────────────────────
app.post('/submit-lead', async (req, res) => {
  try {
    const {
      fname, lname, phone, email,
      address, city, state, zip,
      dob, age, coverage, health, smoker
    } = req.body;

    // ── SEND IMMEDIATE EMAIL (Email #1) ──────────────────────────────────
    const immediateEmail = {
      to: email,
      from: 'darlene@maxsavequote.com',
      replyTo: 'darlene@maxsavequote.com',
      subject: `Your MaxSave Final Expense Quote - We're Calling You Now!`,
      html: getEmailTemplate1(fname, lname)
    };

    try {
      await sgMail.send(immediateEmail);
      console.log('Email #1 (immediate) sent successfully to:', email);
    } catch (emailErr) {
      console.error('Email #1 error:', emailErr.message);
    }

    // ── SCHEDULE EMAIL #2 (2 hours later) ────────────────────────────────
    setTimeout(async () => {
      const email2 = {
        to: email,
        from: 'darlene@maxsavequote.com',
        replyTo: 'darlene@maxsavequote.com',
        subject: `We tried to reach you about your final expense quote`,
        html: getEmailTemplate2(fname, lname)
      };

      try {
        await sgMail.send(email2);
        console.log('Email #2 (2hr) sent successfully to:', email);
      } catch (err) {
        console.error('Email #2 error:', err.message);
      }

    }, 2 * 60 * 60 * 1000); // 2 hours

    // ── SCHEDULE EMAIL #3 (24 hours later) ───────────────────────────────
    setTimeout(async () => {
      const email3 = {
        to: email,
        from: 'darlene@maxsavequote.com',
        replyTo: 'darlene@maxsavequote.com',
        subject: `Your personalized MaxSave quote is ready, ${fname}`,
        html: getEmailTemplate3(fname, lname)
      };

      try {
        await sgMail.send(email3);
        console.log('Email #3 (24hr) sent successfully to:', email);
      } catch (err) {
        console.error('Email #3 error:', err.message);
      }

    }, 24 * 60 * 60 * 1000); // 24 hours

    // ── SCHEDULE EMAIL #4 (3 days later) ─────────────────────────────────
    setTimeout(async () => {
      const email4 = {
        to: email,
        from: 'darlene@maxsavequote.com',
        replyTo: 'darlene@maxsavequote.com',
        subject: `Final reminder: Your MaxSave quote expires in 48 hours`,
        html: getEmailTemplate4(fname, lname)
      };

      try {
        await sgMail.send(email4);
        console.log('Email #4 (3 days) sent successfully to:', email);
      } catch (err) {
        console.error('Email #4 error:', err.message);
      }

    }, 3 * 24 * 60 * 60 * 1000); // 3 days

    // ── SEND TO YOUR INBOX (Internal notification) ────────────────────────
    const internalEmail = {
      to: process.env.EMAIL_TO,
      from: 'darlene@maxsavequote.com',
      subject: `🔔 New Lead: ${fname} ${lname} — MaxSave Insurance`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f6f7fa;padding:20px;border-radius:12px;">
          <div style="background:#2e4a7c;padding:24px;border-radius:10px 10px 0 0;text-align:center;">
            <h1 style="color:white;font-size:24px;margin:0;">🛡️ New MaxSave Lead</h1>
            <p style="color:rgba(255,255,255,0.7);margin:8px 0 0;">Submitted via maxsavequote.com</p>
          </div>
          <div style="background:white;padding:24px;border-radius:0 0 10px 10px;border:1px solid #e8eaf0;">
            <h2 style="color:#7cb342;font-size:18px;margin-bottom:16px;">📋 Lead Details</h2>
            <table style="width:100%;border-collapse:collapse;">
              <tr style="background:#f6f7fa;">
                <td style="padding:10px 14px;font-weight:700;color:#2e4a7c;width:40%;">Full Name</td>
                <td style="padding:10px 14px;color:#2c3550;">${fname} ${lname}</td>
              </tr>
              <tr>
                <td style="padding:10px 14px;font-weight:700;color:#2e4a7c;">Phone</td>
                <td style="padding:10px 14px;color:#2c3550;">${phone}</td>
              </tr>
              <tr style="background:#f6f7fa;">
                <td style="padding:10px 14px;font-weight:700;color:#2e4a7c;">Email</td>
                <td style="padding:10px 14px;color:#2c3550;">${email}</td>
              </tr>
              <tr>
                <td style="padding:10px 14px;font-weight:700;color:#2e4a7c;">Address</td>
                <td style="padding:10px 14px;color:#2c3550;">${address || ''}, ${city || ''}, ${state || ''} ${zip || ''}</td>
              </tr>
              <tr style="background:#f6f7fa;">
                <td style="padding:10px 14px;font-weight:700;color:#2e4a7c;">Date of Birth</td>
                <td style="padding:10px 14px;color:#2c3550;">${dob || ''}</td>
              </tr>
              <tr>
                <td style="padding:10px 14px;font-weight:700;color:#2e4a7c;">Age</td>
                <td style="padding:10px 14px;color:#2c3550;">${age || ''}</td>
              </tr>
              <tr style="background:#f6f7fa;">
                <td style="padding:10px 14px;font-weight:700;color:#2e4a7c;">Coverage Amount</td>
                <td style="padding:10px 14px;color:#2c3550;">${coverage || ''}</td>
              </tr>
              <tr>
                <td style="padding:10px 14px;font-weight:700;color:#2e4a7c;">Health Conditions</td>
                <td style="padding:10px 14px;color:#2c3550;">${health || ''}</td>
              </tr>
              <tr style="background:#f6f7fa;">
                <td style="padding:10px 14px;font-weight:700;color:#2e4a7c;">Smoking Status</td>
                <td style="padding:10px 14px;color:#2c3550;">${smoker || ''}</td>
              </tr>
            </table>
            <div style="margin-top:20px;padding:14px;background:#f0fff4;border-left:4px solid #7cb342;border-radius:6px;">
              <p style="margin:0;color:#7cb342;font-weight:700;">📧 Automated email follow-up sequence activated (4 emails over 3 days)</p>
            </div>
          </div>
          <p style="text-align:center;color:#8a93aa;font-size:12px;margin-top:16px;">MaxSave Insurance · maxsavequote.com</p>
        </div>
      `
    };

    await sgMail.send(internalEmail);
    console.log('Internal notification email sent');

    // ── DYL CRM SUBMISSION ──────────────────────────────────
    const dylParams = new URLSearchParams();
    dylParams.append('d1-name', `${fname} ${lname}`);
    dylParams.append('d1-phone', phone);
    dylParams.append('d1-email', email);
    dylParams.append('d1-address', address || '');
    dylParams.append('d1-city', city || '');
    dylParams.append('d1-state', state || '');
    dylParams.append('d1-zip', zip || '');
    dylParams.append('d1-note', `DOB: ${dob || ''} | Age: ${age || ''} | Coverage: ${coverage || ''} | Health: ${health || ''} | Smoker: ${smoker || ''}`);
    dylParams.append('a0-1_1', '24191257238');
    dylParams.append('cmd-1_1', 'user_contact');
    dylParams.append('do-1_1', 'Submit');

    try {
      const dylRes = await axios.post(
        'https://my.dyl.com/form/contact?id=24191257238',
        dylParams.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      console.log('DYL response:', dylRes.status, JSON.stringify(dylRes.data));
    } catch (dylErr) {
      console.error('DYL error:', dylErr.message);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Submit lead error:', err);
    res.json({ success: false, error: 'Failed to submit lead' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`MaxSave server with email follow-up sequence running on port ${PORT}`));
