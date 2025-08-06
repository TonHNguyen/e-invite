// api/rsvp.js
import { writeFileSync, existsSync, appendFileSync, readFileSync } from 'fs';
import { join } from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const { name, response } = req.body;
    const ts = new Date().toISOString();

    // Paths (ephemeral on Vercel)
    const csvPath = join(process.cwd(), 'responses.csv');
    const jsonPath = join(process.cwd(), 'summary.json');

    // 1) CSV
    if (!existsSync(csvPath)) {
      writeFileSync(csvPath, 'timestamp,name,response\n');
    }
    appendFileSync(csvPath, `"${ts}","${name}","${response}"\n`);

    // 2) JSON totals
    if (!existsSync(jsonPath)) {
      writeFileSync(jsonPath, JSON.stringify({ accepted: 0, declined: 0 }));
    }
    const summary = JSON.parse(readFileSync(jsonPath));
    summary[response]++;
    writeFileSync(jsonPath, JSON.stringify(summary));

    // 3) (Optional) Email – requires setting env vars in Vercel dashboard
    // import nodemailer, createTransport using process.env.SMTP_*, then:
    // await transporter.sendMail({ from, to, subject, text });

    return res.status(200).json({ ok: true, summary });
  } catch (err) {
    console.error('❌ Function error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
