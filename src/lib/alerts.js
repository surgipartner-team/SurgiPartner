import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export async function sendSecurityAlert(userId, eventType, metadata) {
  const user = await getUserById(userId);
  
  const alertMessages = {
    'IP_CHANGE': 'New login from a different IP address',
    'DEVICE_CHANGE': 'Login from a new device detected',
    'SUSPICIOUS_ACTIVITY': 'Suspicious activity detected on your account',
    'PASSWORD_CHANGE': 'Your password was changed',
    'TWO_FACTOR_DISABLED': 'Two-factor authentication was disabled'
  };
  
  await transporter.sendMail({
    from: '"SurgiPartner Security" <security@surgipartner.com>',
    to: user.email,
    subject: `Security Alert: ${alertMessages[eventType]}`,
    html: `
      <h2>Security Alert</h2>
      <p>Hi ${user.username},</p>
      <p>${alertMessages[eventType]}</p>
      <p><strong>Details:</strong></p>
      <ul>
        <li>Time: ${new Date().toLocaleString()}</li>
        <li>IP Address: ${metadata.ipAddress}</li>
        <li>Location: ${metadata.location || 'Unknown'}</li>
      </ul>
      <p>If this wasn't you, please secure your account immediately.</p>
      <a href="https://yourdomain.com/security">Review Security Settings</a>
    `
  });
}