// server.js

// 1) Load .env
require('dotenv').config();

// 2) Imports
const express    = require('express');
const bodyParser = require('body-parser');
const fs         = require('fs');
const path       = require('path');
const nodemailer = require('nodemailer');
const ExcelJS    = require('exceljs');

// 3) Paths for data files
const CSV_PATH     = path.join(__dirname, 'responses.csv');
const SUMMARY_PATH = path.join(__dirname, 'summary.json');
const XLSX_PATH    = path.join(__dirname, 'responses.xlsx');

// 4) Ensure CSV & JSON exist
if (!fs.existsSync(CSV_PATH)) {
  fs.writeFileSync(CSV_PATH, 'timestamp,name,response\n');
}
if (!fs.existsSync(SUMMARY_PATH)) {
  fs.writeFileSync(SUMMARY_PATH, JSON.stringify({ accepted: 0, declined: 0 }, null, 2));
}

// 5) Ensure Excel workbook exists with two sheets
async function ensureWorkbook() {
  const workbook = new ExcelJS.Workbook();
  if (fs.existsSync(XLSX_PATH)) {
    await workbook.xlsx.readFile(XLSX_PATH);
  } else {
    const accSheet = workbook.addWorksheet('Accepted');
    accSheet.addRow(['Timestamp', 'Name']);
    const decSheet = workbook.addWorksheet('Declined');
    decSheet.addRow(['Timestamp', 'Name']);
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

// 8) Mailer setup (Ethereal for dev—replace with real SMTP when ready)
let transporter;
nodemailer.createTestAccount().then(testAccount => {
  transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
  console.log('Using Ethereal SMTP for email previews');
}).catch(console.error);

// 9) RSVP endpoint
app.post('/rsvp', async (req, res) => {
  try {
    const { name, response } = req.body;
    const timestamp = new Date().toISOString();

    // 9a) Append to CSV
    const line = `"${timestamp}","${name.replace(/"/g,'""')}","${response}"\n`;
    fs.appendFileSync(CSV_PATH, line);

    // 9b) Update summary.json
    const summary = JSON.parse(fs.readFileSync(SUMMARY_PATH));
    if (response === 'accepted') summary.accepted++;
    else summary.declined++;
    fs.writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2));

    // 9c) Append to Excel
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(XLSX_PATH);
    const sheet = workbook.getWorksheet(response === 'accepted' ? 'Accepted' : 'Declined');
    sheet.addRow([timestamp, name]);
    await workbook.xlsx.writeFile(XLSX_PATH);

    // 9d) Send (test) email and log preview URL
    const info = await transporter.sendMail({
      from:    `"RSVP Bot" <no-reply@example.com>`,
      to:      process.env.MY_EMAIL,
      subject: `RSVP: ${name} — ${response}`,
      text:    `${name} has ${response} at ${timestamp}.\nTotals → Accepted: ${summary.accepted}, Declined: ${summary.declined}`
    });
    console.log('Preview email URL:', nodemailer.getTestMessageUrl(info));

    return res.sendStatus(200);
  } catch (err) {
    console.error('Error in /rsvp:', err);
    return res.sendStatus(500);
  }
});

// 10) Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
