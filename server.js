// server.js

// 1) Load environment variables
require('dotenv').config();

// 2) Imports
const express    = require('express');
const bodyParser = require('body-parser');
const fs         = require('fs');
const path       = require('path');
const nodemailer = require('nodemailer');
const ExcelJS    = require('exceljs');

// 3) Data file paths
const CSV_PATH     = path.join(__dirname, 'responses.csv');
const SUMMARY_PATH = path.join(__dirname, 'summary.json');
const XLSX_PATH    = path.join(__dirname, 'responses.xlsx');

// 4) Ensure CSV & JSON exist
if (!fs.existsSync(CSV_PATH)) {
  fs.writeFileSync(CSV_PATH, 'timestamp,name,response\n');
}
if (!fs.existsSync(SUMMARY_PATH)) {
  fs.writeFileSync(
    SUMMARY_PATH,
    JSON.stringify({ accepted: 0, declined: 0 }, null, 2)
  );
}

// 5) Ensure Excel workbook exists
async function ensureWorkbook() {
  const workbook = new ExcelJS.Workbook();
  if (fs.existsSync(XLSX_PATH)) {
    await workbook.xlsx.readFile(XLSX_PATH);
  } else {
    const acc = workbook.addWorksheet('Accepted');
    acc.addRow(['Timestamp', 'Name']);
    const dec = workbook.addWorksheet('Declined');
    dec.addRow(['Timestamp', 'Name']);
    await workbook.xlsx.writeFile(XLSX_PATH);
  }
}
ensureWorkbook().catch(console.error);

// 6) Create Express app
const app = express();

// 7) Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 8) Real SMTP transporter (Gmail App Password)
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,                       // e.g. smtp.gmail.com
  port:   parseInt(process.env.SMTP_PORT, 10),         // e.g. 587
  secure: process.env.SMTP_SECURE === 'true',          // false for 587
  auth: {
    user: process.env.SMTP_USER,                       // your Gmail address
    pass: process.env.SMTP_PASS                        // your 16-char App Password
  }
});

// Optional verify on startup
transporter.verify(err => {
  if (err) console.error('SMTP connection error:', err);
  else    console.log('✅ SMTP server is ready to send emails');
});

// 9) RSVP endpoint
app.post('/rsvp', async (req, res) => {
  try {
    const { name, response } = req.body;
    const timestamp = new Date().toISOString();

    // a) Append CSV
    const csvLine = `"${timestamp}","${name.replace(/"/g,'""')}","${response}"\n`;
    fs.appendFileSync(CSV_PATH, csvLine);

    // b) Update JSON totals
    const summary = JSON.parse(fs.readFileSync(SUMMARY_PATH));
    if (response === 'accepted') summary.accepted++;
    else summary.declined++;
    fs.writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2));

    // c) Log to Excel
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(XLSX_PATH);
    const sheetName = response === 'accepted' ? 'Accepted' : 'Declined';
    const sheet = workbook.getWorksheet(sheetName);
    sheet.addRow([timestamp, name]);
    await workbook.xlsx.writeFile(XLSX_PATH);

    // d) Send email notification
    const info = await transporter.sendMail({
      from:    process.env.SMTP_FROM,    // e.g. huutonau@gmail.com
      to:      process.env.MY_EMAIL,     // e.g. your inbox
      subject: `RSVP: ${name} — ${response}`,
      text:    `${name} has ${response} at ${timestamp}.\n` +
               `Totals → Accepted: ${summary.accepted}, Declined: ${summary.declined}`
    });
    console.log('📧 Email sent:', info.response);

    return res.sendStatus(200);
  } catch (err) {
    console.error('Error in /rsvp:', err);
    return res.sendStatus(500);
  }
});

// 10) Start server
const PORT = parseInt(process.env.PORT, 10) || 3000;
app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
