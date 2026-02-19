import nodemailer from "nodemailer";

const createTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true", 
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    return {
      sendMail: async (mailOptions) => {
        console.log("\n📧 ========== EMAIL SENT ==========");
        console.log("To:", mailOptions.to);
        console.log("Subject:", mailOptions.subject);
        console.log("Body:", mailOptions.text || mailOptions.html);
        console.log("===================================\n");
        return { messageId: "dev-mode-" + Date.now() };
      },
    };
  }
};

export async function sendPasswordResetEmail({ to, username, resetUrl }) {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from:
        process.env.SMTP_FROM || '"SurgiPartner" <noreply@surgipartner.com>',
      to,
      subject: "Password Reset Request - SurgiPartner",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #004072;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .content {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background-color: #004072;
              color: white !important;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              font-size: 12px;
              color: #666;
            }
            .warning {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 12px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${username}</strong>,</p>
              
              <p>We received a request to reset your password for your SurgiPartner account.</p>
              
              <p>Click the button below to reset your password:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background-color: #f0f0f0; padding: 10px; border-radius: 4px;">
                ${resetUrl}
              </p>
              
              <div class="warning">
                <strong>Security Notice:</strong>
                <ul style="margin: 10px 0;">
                  <li>This link will expire in 1 hour</li>
                  <li>If you didn't request this reset, please ignore this email</li>
                  <li>Your password will remain unchanged</li>
                </ul>
              </div>
              
              <p>If you have any questions, please contact our support team.</p>
              
              <p>Best regards,<br><strong>SurgiPartner Team</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
              <p>&copy; ${new Date().getFullYear()} SurgiPartner. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hi ${username},

We received a request to reset your password for your SurgiPartner account.

Reset your password by clicking this link:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this reset, please ignore this email. Your password will remain unchanged.

Best regards,
SurgiPartner Team
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("✅ Password reset email sent:", info.messageId);

    // For Ethereal, log preview URL
    if (process.env.NODE_ENV !== "production") {
      console.log("📧 Preview URL:", nodemailer.getTestMessageUrl(info));
    }

    return info;
  } catch (error) {
    console.error("❌ Error sending password reset email:", error);
    throw error;
  }
}

export async function sendWelcomeEmail({ to, username }) {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from:
        process.env.SMTP_FROM || '"SurgiPartner" <noreply@surgipartner.com>',
      to,
      subject: "Welcome to SurgiPartner!",
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #004072; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1>Welcome to SurgiPartner!</h1>
            </div>
            <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
              <p>Hi <strong>${username}</strong>,</p>
              <p>Thank you for joining SurgiPartner! We're excited to have you on board.</p>
              <p>Your account has been successfully created and you can now access all features.</p>
              <p>If you have any questions, feel free to reach out to our support team.</p>
              <p>Best regards,<br><strong>SurgiPartner Team</strong></p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Welcome email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Error sending welcome email:", error);
    throw error;
  }
}
