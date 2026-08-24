const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  try {
    const smtpHost = process.env.SMTP_HOST || process.env.MAILTRAP_HOST || (process.env.NODE_ENV === 'production' ? null : 'sandbox.smtp.mailtrap.io');
    const smtpPort = process.env.SMTP_PORT || process.env.MAILTRAP_PORT || 2525;
    const smtpUser = process.env.SMTP_USER || process.env.MAILTRAP_USER || (process.env.NODE_ENV === 'production' ? null : '7273b0585acc0c');
    const smtpPass = process.env.SMTP_PASS || process.env.MAILTRAP_PASS || (process.env.NODE_ENV === 'production' ? null : 'eae7bc7dcf0bea');

    if (!smtpHost || !smtpUser) {
      if (process.env.NODE_ENV === 'production') {
        console.warn('Email warning: SMTP credentials not configured in production environment. Email skipped.');
        return false;
      }
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost || 'sandbox.smtp.mailtrap.io',
      port: Number(smtpPort),
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // Define email options
    const mailOptions = {
      from: '"SAFWA System" <noreply@safwa.sa>',
      to: options.email,
      subject: options.subject,
      html: options.html,
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    // We do not throw the error to prevent the main flow (like registration) from crashing
    // if the email service fails temporarily.
    return false;
  }
};

module.exports = sendEmail;
