// api/rsvp.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method Not Allowed');
  }

  const { name, response } = req.body || {};
  if (typeof name !== 'string' || !['accepted', 'declined'].includes(response)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const timestamp = new Date().toISOString();
  console.log(`RSVP → ${name} : ${response} @ ${timestamp}`);

  // Lazy‐load nodemailer so we don’t pay the cost on cold start if not used
  const nodemailer = await import('nodemailer').then(m => m.default);

  let transporter;
  try {
    transporter = nodemailer.createTransport({
      host:   'smtp.gmail.com',
      port:   587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER, // huutonau@gmail.com
        pass: process.env.SMTP_PASS  // your 16-char App Password
      }
    });
    // (Optional) verify only in development
    if (process.env.NODE_ENV !== 'production') {
      await transporter.verify();
      console.log('✅ Gmail SMTP verified');
    }
  } catch (err) {
    console.error('SMTP setup error:', err);
    return res.status(500).json({ error: 'Email setup failed' });
  }

  try {
    const info = await transporter.sendMail({
      from:    process.env.SMTP_FROM,   // huutonau@gmail.com
      to:      process.env.MY_EMAIL,    // huutonau@gmail.com
      subject: `RSVP: ${name} — ${response}`,
      text:    `${name} has ${response} your invite at ${timestamp}.`
    });
    console.log('📧 Email sent:', info.response);
    return res.status(200).json({ ok: true, timestamp });
  } catch (err) {
    console.error('Email send error:', err);
    return res.status(502).json({ error: 'Failed to send email' });
  }
}
