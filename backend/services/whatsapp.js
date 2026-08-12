/**
 * WhatsApp delivery via Twilio, with wa.me deep-link fallback for labs.
 */
const { generateWhatsAppReport } = require('./whatsappReport');

let twilioClient = null;

function getTwilio() {
  if (twilioClient) return twilioClient;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (sid && token && process.env.WHATSAPP_ENABLED === 'true') {
    try {
      twilioClient = require('twilio')(sid, token);
    } catch {
      twilioClient = null;
    }
  }
  return twilioClient;
}

function toWaMeLink(phone, text) {
  const digits = String(phone || '').replace(/[^\d]/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

async function sendWhatsAppReport(user, foundVulns, extras = {}) {
  const report = generateWhatsAppReport({
    fullName: user.full_name || user.fullName,
    academicId: user.academic_id || user.academicId,
    found: foundVulns,
    hiddenFound: extras.hiddenFound || 0,
    chainCount: extras.chainCount || 0,
    falsePositives: extras.falsePositives || 0,
  });

  const to = user.phone_number || user.phoneNumber;
  const deepLink = toWaMeLink(to, report.fullText);

  const record = {
    userId: user.id,
    to,
    report,
    findingsCount: (foundVulns || []).length,
    score: report.numericScore,
    status: 'queued',
    channel: null,
    deepLink,
    createdAt: new Date().toISOString(),
  };

  if (!user.whatsapp_opt_in && !user.whatsappOptIn) {
    record.status = 'opt_in_required';
    record.message = 'Enable WhatsApp notifications on your account first.';
    return record;
  }

  if ((foundVulns || []).length === 0) {
    record.status = 'empty';
    record.message =
      'No findings recorded yet. Trigger issues while logged in (check Network → X-Vuln-Flag), then send again.';
    return record;
  }

  const client = getTwilio();
  if (client && to) {
    try {
      const msg = await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_FROM,
        to: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
        body: report.fullText,
      });
      record.status = 'sent';
      record.channel = 'twilio';
      record.sid = msg.sid;
      record.message = 'Report sent to WhatsApp via Twilio.';
      return record;
    } catch (err) {
      record.status = 'failed';
      record.channel = 'twilio';
      record.error = err.message;
      record.message = `Twilio send failed: ${err.message}. Use the WhatsApp link below.`;
      return record;
    }
  }

  // Lab default: no Twilio — give student a one-tap WhatsApp share link
  record.status = 'ready_to_share';
  record.channel = 'wa.me';
  record.message =
    'Automatic WhatsApp API is not configured. Open the link below on your phone to send the report in WhatsApp.';
  return record;
}

module.exports = { sendWhatsAppReport, generateWhatsAppReport, toWaMeLink };
