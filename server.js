// server.js

// 1) Load .env
require('dotenv').config();

// 2) Imports
const express    = require('express');
const bodyParser = require('body-parser');
const fs         = require('fs');
const path       = require('path');
const nodemailer = require('nodemailer');

// 3) Create app
const app = express();

// 4) Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/picture', express.static(path.join(__dirname, 'picture')));

// 5) Explicit root route (serves your form)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 6) File paths
const CSV_PATH     = path.join(__dirname, 'responses.csv');
const SUMMARY_PATH = path.join(__dirname, 'summary.json');

// 7) Ensure data files exist
if (!fs.existsSync(CSV_PATH)) {
  fs.writeFileSync(CSV_PATH, 'timestamp,name,response\n');
}
if (!fs.existsSync(SUMMARY_PATH)) {
  fs.writeFileSync(SUMMARY_PATH, JSON.stringify({ accepted: 0, declined: 0 }, null, 2));
}

// 8) Mailer setup
const transporter = nodemailer.createTransport({
  host:     process.env.SMTP_HOST,
  port:     +process.env.SMTP_PORT,
  secure:   process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// 9) RSVP endpoint
app.post('/rsvp', async (req, res) => {
  try {
    const { name, response } = req.body;
    const timestamp = new Date().toISOString();

    // Append to CSV
    const line = `"${timestamp}","${name.replace(/"/g, '""')}","${response}"\n`;
    fs.appendFileSync(CSV_PATH, line);

    // Update summary.json
    const summary = JSON.parse(fs.readFileSync(SUMMARY_PATH));
    if (response === 'accepted') summary.accepted++;
    else summary.declined++;
    fs.writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2));

    // Send notification email
    await transporter.sendMail({
      from:    process.env.SMTP_FROM,
      to:      process.env.MY_EMAIL,
      subject: `RSVP: ${name} — ${response}`,
      text:    `${name} has ${response} at ${timestamp}.\nTotals → Accepted: ${summary.accepted}, Declined: ${summary.declined}`
    });

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// 10) Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
