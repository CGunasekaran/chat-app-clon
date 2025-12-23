import nodemailer from "nodemailer";

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function sendOTPEmail(email: string, otp: string) {
  try {
    // Always log the OTP (for dev and production without email)
    console.log(`\n🔐 OTP for ${email}: ${otp}\n`);

    // Skip actual email sending if credentials not configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log("⚠️  Email credentials not configured. OTP logged above.");
      return { success: true, message: "OTP logged (no email configured)" };
    }

    const info = await transporter.sendMail({
      from: `"Chat App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify Your Email - Chat App",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .otp-box { background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
              .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Email Verification</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>Thank you for registering with Chat App! To complete your registration, please use the following One-Time Password (OTP):</p>
                <div class="otp-box">
                  <div class="otp-code">${otp}</div>
                </div>
                <p><strong>This OTP is valid for 10 minutes.</strong></p>
                <p>If you didn't request this verification, please ignore this email.</p>
                <p>Best regards,<br>Chat App Team</p>
              </div>
              <div class="footer">
                <p>This is an automated email. Please do not reply.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send verification email");
  }
}

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
) {
  try {
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;

    // Always log the reset link
    console.log(`\n🔑 Password Reset for ${email}`);
    console.log(`Reset Link: ${resetUrl}\n`);

    // Skip actual email sending if credentials not configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log(
        "⚠️  Email credentials not configured. Reset link logged above."
      );
      return { success: true, message: "Reset link logged (no email configured)" };
    }

    const info = await transporter.sendMail({
      from: `"Chat App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Reset Your Password - Chat App",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button-box { text-align: center; margin: 30px 0; }
              .reset-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Reset Request</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>We received a request to reset your password for your Chat App account.</p>
                <div class="button-box">
                  <a href="${resetUrl}" class="reset-button">Reset Password</a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
                <div class="warning">
                  <p><strong>⚠️ Important:</strong></p>
                  <ul>
                    <li>This link is valid for 1 hour</li>
                    <li>If you didn't request this reset, please ignore this email</li>
                    <li>Your password won't change until you click the link above and create a new one</li>
                  </ul>
                </div>
                <p>Best regards,<br>Chat App Team</p>
              </div>
              <div class="footer">
                <p>This is an automated email. Please do not reply.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw new Error("Failed to send password reset email");
  }
}
