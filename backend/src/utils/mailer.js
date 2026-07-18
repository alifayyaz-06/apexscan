const nodemailer = require('nodemailer');
const envs = require('../config/envs');

let transporter = null;

if (!envs.resendApiKey) {
  transporter = nodemailer.createTransport({
    host: envs.smtpHost,
    port: envs.smtpPort,
    secure: envs.smtpPort === 465,
    auth: {
      user: envs.smtpUser,
      pass: envs.smtpPass
    }
  });

  // Verify SMTP connection on startup to log errors clearly in Render logs
  transporter.verify((error, success) => {
    if (error) {
      console.error('[Mailer] SMTP verification failed:', error.message);
    } else {
      console.log('[Mailer] SMTP server connection successful and ready to send emails.');
    }
  });
} else {
  console.log('[Mailer] Resend API Key detected. Using Resend HTTPS service instead of SMTP.');
}

async function sendOtp(to, otp) {
  if (envs.resendApiKey) {
    console.log(`[Mailer] Sending OTP to ${to} via Resend HTTP API, code: ${otp}`);
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${envs.resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Smart Ordering <onboarding@resend.dev>', // Free onboarding domain
        to: [to],
        subject: 'Your Password Reset Code',
        html: `
          <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #2B2D42; margin-bottom: 8px;">Password Reset</h2>
            <p style="color: #555; font-size: 14px;">Use the code below to reset your password. It expires in 10 minutes.</p>
            <div style="background: #f4f4f4; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #E63946;">${otp}</span>
            </div>
            <p style="color: #888; font-size: 12px;">If you didn't request this, ignore this email.</p>
          </div>
        `
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[Mailer] Resend email send failed:', data);
      throw new Error(data.message || 'Resend email send failed');
    }
    console.log('[Mailer] Resend email sent successfully:', data.id);
  } else {
    console.log(`[Mailer] Sending OTP to ${to} via SMTP, code: ${otp}`);
    await transporter.sendMail({
      from: `"Smart Ordering" <${envs.smtpUser}>`,
      to,
      subject: 'Your Password Reset Code',
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #2B2D42; margin-bottom: 8px;">Password Reset</h2>
          <p style="color: #555; font-size: 14px;">Use the code below to reset your password. It expires in 10 minutes.</p>
          <div style="background: #f4f4f4; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #E63946;">${otp}</span>
          </div>
          <p style="color: #888; font-size: 12px;">If you didn't request this, ignore this email.</p>
        </div>
      `
    });
  }
}

module.exports = { sendOtp };
