const nodemailer = require('nodemailer');
const envs = require('../config/envs');

const transporter = nodemailer.createTransport({
  host: envs.smtpHost,
  port: envs.smtpPort,
  secure: envs.smtpPort === 465,
  auth: {
    user: envs.smtpUser,
    pass: envs.smtpPass
  }
});

async function sendOtp(to, otp) {
  console.log(`[Mailer] Sending OTP to ${to}, code: ${otp}`);
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

module.exports = { sendOtp };
