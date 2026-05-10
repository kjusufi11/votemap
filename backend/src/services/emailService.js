// src/services/emailService.js
// Resend-backed email delivery for VoteMatch alerts.
// Requires RESEND_API_KEY env var and a verified sender domain.
// Domain verification: resend.com/domains → add votematch.app → add DNS records.

const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM   = process.env.EMAIL_FROM || 'alerts@votematch.app';
const BASE   = 'https://votematch.app';

// ── HTML templates ────────────────────────────────────────────────────────────

function baseLayout(content, unsubscribeUrl) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VoteMatch</title></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:32px 16px">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e5ea">
  <tr><td style="padding:24px 32px 0;border-bottom:1px solid #f0f0f5">
    <span style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#6366f1;font-weight:600;font-family:monospace">VoteMatch</span>
  </td></tr>
  <tr><td style="padding:28px 32px">${content}</td></tr>
  <tr><td style="padding:16px 32px;border-top:1px solid #f0f0f5;background:#fafafa">
    <p style="margin:0;font-size:11px;color:#999;line-height:1.6">
      You're receiving this because you have vote alerts enabled on VoteMatch.<br>
      <a href="${unsubscribeUrl}" style="color:#999;text-decoration:underline">Unsubscribe</a> · <a href="${BASE}/survey" style="color:#999;text-decoration:underline">Update preferences</a>
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function voteAlertHtml({ politician, vote, domainLabel, unsubscribeUrl }) {
  const isYes     = vote.position === 'Yes';
  const voteColor = isYes ? '#16a34a' : '#dc2626';
  const voteBg    = isYes ? '#f0fdf4' : '#fef2f2';
  const voteBorder = isYes ? '#bbf7d0' : '#fecaca';
  const voteWord  = isYes ? 'Voted YES' : 'Voted NO';

  const description = vote.description || vote.question || 'Vote recorded';
  const dateStr = vote.vote_date
    ? new Date(vote.vote_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';

  const content = `
    <p style="margin:0 0 4px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#999;font-family:monospace">${domainLabel} · ${dateStr}</p>
    <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#1a1a2e;line-height:1.25">${politician.title} ${politician.full_name}</h1>

    <div style="background:${voteBg};border:1px solid ${voteBorder};border-radius:8px;padding:16px 20px;margin-bottom:24px">
      <p style="margin:0 0 8px;font-size:13px;color:#666;line-height:1.5">${description}</p>
      <p style="margin:0;font-size:17px;font-weight:700;color:${voteColor}">${voteWord}</p>
    </div>

    <a href="${BASE}/politician/${politician.id}" style="display:inline-block;background:#1a1a2e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:14px;font-weight:500">See full voting record →</a>
  `;

  return baseLayout(content, unsubscribeUrl);
}

function upcomingVoteHtml({ bill, domainLabel, chamber, unsubscribeUrl }) {
  const content = `
    <p style="margin:0 0 4px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#999;font-family:monospace">Upcoming · ${domainLabel}</p>
    <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#1a1a2e;line-height:1.25">New legislation in the ${chamber === 'senate' ? 'Senate' : 'House'}</h1>

    <div style="background:#f8f8ff;border:1px solid #e0e0ff;border-radius:8px;padding:16px 20px;margin-bottom:24px">
      ${bill.number ? `<p style="margin:0 0 4px;font-size:11px;color:#999;font-family:monospace">${bill.number}</p>` : ''}
      <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#1a1a2e;line-height:1.4">${bill.title}</p>
      ${bill.latestAction ? `<p style="margin:0;font-size:12px;color:#666">${bill.latestAction}</p>` : ''}
    </div>

    <a href="${BASE}/upcoming" style="display:inline-block;background:#1a1a2e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:14px;font-weight:500">See all upcoming bills →</a>
  `;

  return baseLayout(content, unsubscribeUrl);
}

// ── Send functions ─────────────────────────────────────────────────────────────

async function sendVoteAlert(to, data) {
  const subject = `${data.politician.title} ${data.politician.full_name} voted on ${data.domainLabel}`;
  const html = voteAlertHtml(data);

  if (!resend) {
    console.log(`[email] DEV — would send to ${to}: ${subject}`);
    return;
  }

  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

async function sendUpcomingAlert(to, data) {
  const subject = `New ${data.domainLabel} legislation to watch`;
  const html = upcomingVoteHtml(data);

  if (!resend) {
    console.log(`[email] DEV — would send to ${to}: ${subject}`);
    return;
  }

  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

module.exports = { sendVoteAlert, sendUpcomingAlert };
