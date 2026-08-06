const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  try {
    console.log('Sending email with user:', process.env.MAILTRAP_USER);
    // Create a transporter using Mailtrap credentials
    const transporter = nodemailer.createTransport({
      host: process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io',
      port: process.env.MAILTRAP_PORT || 2525,
      auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASS,
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
