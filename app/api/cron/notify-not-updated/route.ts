import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { isEffectivelyUpdated } from '@/lib/notes-date';

// Triggered weekly by Vercel Cron (see vercel.json). Posts a Discord message
// listing every active caretaker that is effectively "Not Updated" so it
// never depends on someone remembering to check the Caretakers page.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ error: 'DISCORD_WEBHOOK_URL is not set' }, { status: 500 });
  }

  const clients = await sql`
    SELECT name, client_code, notes, is_updated
    FROM clients
    WHERE status != 'inactive'
    ORDER BY name ASC
  `;

  const notUpdated = clients.filter((c: any) => !isEffectivelyUpdated(c));

  if (notUpdated.length === 0) {
    return NextResponse.json({ notified: false, count: 0 });
  }

  const lines = notUpdated.map((c: any) =>
    `• **${c.name}** (${c.client_code})${c.notes ? ` — last note ${c.notes}` : ' — no note yet'}`
  );

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [{
        title: '📋 Weekly Caretaker Update Reminder',
        description: `${notUpdated.length} caretaker(s) haven't been updated in the last week:\n\n${lines.join('\n')}`,
        color: 0xdc2626,
      }],
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: `Discord webhook failed: ${res.status}` }, { status: 502 });
  }

  return NextResponse.json({ notified: true, count: notUpdated.length });
}
