const envs = require("../config/envs");

async function sendOtp(to, otp) {
  try {
    console.log(`[Mailer] Sending OTP to ${to}`);

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": envs.brevoApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          email: envs.brevoSenderEmail,
          name: envs.brevoSenderName,
        },

        to: [
          {
            email: to,
          },
        ],

        subject: "Your Password Reset Code",

        htmlContent: `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:20px">

              <h2>Password Reset</h2>

              <p>
                Use the verification code below to reset your password.
                This code will expire in 10 minutes.
              </p>

              <div style="
                background:#f5f5f5;
                padding:20px;
                text-align:center;
                border-radius:8px;
                margin:25px 0;
              ">
                <span style="
                  font-size:34px;
                  letter-spacing:8px;
                  font-weight:bold;
                  color:#E63946;
                ">
                  ${otp}
                </span>
              </div>

              <p>
                If you didn't request this email, ignore it.
              </p>

              <hr>

              <small>
                Smart QR Ordering System
              </small>

          </div>
          `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Mailer] Brevo Error:", errorText);
      throw new Error(errorText);
    }

    const result = await response.json();

    console.log("========================================");
    console.log("[Mailer] Email Sent Successfully");
    console.log(result);
    console.log("========================================");

    return true;
  } catch (err) {
    console.error("========================================");
    console.error("[Mailer] Email Sending Failed");
    console.error(err);
    console.error("========================================");
     console.log("[Brevo Key Exists]", envs.brevoApiKey ? "YES" : "NO");

     console.log("[Brevo Key Start]", envs.brevoApiKey?.substring(0, 10));
     console.log("Brevo key loaded:", !!envs.brevoApiKey);
     console.log("Brevo key prefix:", envs.brevoApiKey?.substring(0, 15));
     console.log("Brevo key length:", envs.brevoApiKey?.length);
     console.log("Sender email:", envs.brevoSenderEmail);

    throw err;
  }
}

async function sendTrialExpiryNotification(to, restaurantName, daysRemaining) {
  try {
    console.log(`[Mailer] Sending Trial Expiry Notification to ${to} (${daysRemaining} days remaining)`);

    const isExpired = daysRemaining <= 0;
    const subject = isExpired 
      ? `Your 14-day free trial has expired - ${restaurantName}`
      : `Important: Your free trial ends in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''} - ${restaurantName}`;

    const htmlContent = `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:20px;line-height:1.6;color:#2B2D42;">
        <h2>${isExpired ? 'Trial Expired' : 'Trial Ending Soon'}</h2>
        <p>Dear ${restaurantName} Owner,</p>
        <p>
          ${isExpired 
            ? `Your 14-day free trial for <strong>${restaurantName}</strong> has expired. Access to your POS terminal, kitchen dashboard, QR ordering, and reports has been suspended.`
            : `This is a reminder that your 14-day free trial for <strong>${restaurantName}</strong> will expire in <strong>${daysRemaining} day${daysRemaining > 1 ? 's' : ''}</strong>.`
          }
        </p>
        <div style="background:#f9f9f9;padding:15px;border-radius:8px;margin:20px 0;border:1px solid #eee;">
          <strong>Restaurant Name:</strong> ${restaurantName}<br>
          <strong>Status:</strong> ${isExpired ? 'Expired' : 'Active (Free Trial)'}<br>
          <strong>Days Remaining:</strong> ${isExpired ? '0' : daysRemaining}
        </div>
        <p>
          To ensure uninterrupted access to your QR ordering and POS terminal, please upgrade to our premium plan.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:30px 0;">
        <small style="color:#999;">Smart QR Ordering System Support Team</small>
      </div>
    `;

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": envs.brevoApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          email: envs.brevoSenderEmail,
          name: envs.brevoSenderName,
        },
        to: [{ email: to }],
        subject,
        htmlContent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Mailer] Brevo Error:", errorText);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[Mailer] Trial Notification Email Failed:", err.message);
    return false;
  }
}

module.exports = {
  sendOtp,
  sendTrialExpiryNotification
};
