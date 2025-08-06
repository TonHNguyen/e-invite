// api/rsvp.js
import { google } from 'googleapis';

// Pull your sheet ID and service‐account JSON from env
const SPREADSHEET_ID = process.env.SHEET_ID;
const SA_JSON        = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

async function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: SA_JSON.client_email,
    key:   SA_JSON.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  await auth.authorize();
  return google.sheets({ version: 'v4', auth });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }
  const { name, response } = req.body || {};
  if (!name || !['accepted','declined'].includes(response)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const timestamp = new Date().toISOString();
  let sheets;
  try {
    sheets = await getSheetsClient();
  } catch (err) {
    console.error('Sheets auth error:', err);
    return res.status(500).json({ error: 'Sheets auth failed' });
  }

  // 1) Append the row to columns A–C
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'A:C',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[timestamp, name, response]]
      }
    });
  } catch (err) {
    console.error('Sheets append error:', err);
    return res.status(502).json({ error: 'Failed to append row' });
  }

  // 2) Read back all responses to compute totals
  let data;
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'A2:C'   // skip header row
    });
    data = result.data.values || [];
  } catch (err) {
    console.error('Sheets read error:', err);
    return res.status(502).json({ error: 'Failed to read rows' });
  }

  // 3) Tally
  const totals = data.reduce(
    (t, row) => {
      if (row[2] === 'accepted') t.accepted++;
      else if (row[2] === 'declined') t.declined++;
      return t;
    },
    { accepted: 0, declined: 0 }
  );

  return res.status(200).json({
    ok: true,
    timestamp,
    totals,
    totalResponses: data.length
  });
}
