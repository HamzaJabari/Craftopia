const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // 1. Create a Transporter (The service that sends mail)
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // 2. Define the email options
  const mailOptions = {
    from: `"Craftopia Support" <${process.env.EMAIL_USER}>`, // Sender address
    to: options.email, // Receiver address
    subject: options.subject, // Subject line
    text: options.message, // Plain text body
    // html: options.message // You can use HTML if you want fancy emails later
  };

  // 3. Send the email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;