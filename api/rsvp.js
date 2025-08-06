// api/rsvp.js
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  // Parse and validate payload
  const { name, response } = req.body || {};
  if (typeof name !== 'string' || !['accepted', 'declined'].includes(response)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  // Timestamp for email/text
  const timestamp = new Date().toISOString();
  console.log(`RSVP received → ${name} : ${response} @ ${timestamp}`);

  // Set up your SMTP transporter (configured via Vercel env vars)
  let transporter;
  try {
    transporter = nodemailer.createTransport({
      host:     process.env.SMTP_HOST,
      port:     Number(process.env.SMTP_PORT),
      secure:   process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Optional: verify connection (comment out in production for speed)
  } catch (err) {
    console.error('✉️  SMTP configuration error:', err);
    return res.status(500).json({ error: 'Email setup failed' });
  }

  // Send the notification email
  try {
    const info = await transporter.sendMail({
      from:    process.env.SMTP_FROM,     // e.g. huutonau@gmail.com
      to:      process.env.MY_EMAIL,      // where you want to receive RSVPs
      subject: `RSVP: ${name} — ${response}`,
      text:    `${name} has ${response} your invite at ${timestamp}.`
    });
    console.log('📧 Email sent:', info.response);
  } catch (err) {
    console.error('✉️  Email send error:', err);
    return res.status(502).json({ error: 'Failed to send email' });
  }

  // All done
  return res.status(200).json({
    ok: true,
    message: `Thanks ${name}, your ${response} has been recorded.`,
    timestamp
  });
}
