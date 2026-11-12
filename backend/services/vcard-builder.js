function normalizeUrl(url) {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function escapeValue(val) {
  if (!val) return '';
  return String(val)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .trim();
}

function buildVCard30(card) {
  const firstName = (card.firstName || '').trim();
  const lastName = (card.lastName || '').trim();
  const fullName = `${firstName} ${lastName}`.trim() || 'Contact';
  const jobTitle = (card.jobTitle || '').trim();
  const org = (card.organization || '').trim();
  const phone = (card.phone || '').trim();
  const whatsapp = (card.whatsapp || '').trim();
  const email = (card.email || '').trim();
  const location = (card.location || '').trim();
  const linkedin = normalizeUrl(card.linkedinUrl);
  const portfolio = normalizeUrl(card.portfolioUrl);
  const bio = (card.bio || '').trim();

  // RFC 2426 mandates CRLF (\r\n) line endings
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N;CHARSET=UTF-8:${escapeValue(lastName)};${escapeValue(firstName)};;;`,
    `FN;CHARSET=UTF-8:${escapeValue(fullName)}`
  ];

  if (org) lines.push(`ORG;CHARSET=UTF-8:${escapeValue(org)}`);
  if (jobTitle) lines.push(`TITLE;CHARSET=UTF-8:${escapeValue(jobTitle)}`);
  if (phone) lines.push(`TEL;TYPE=CELL,VOICE:${phone}`);
  if (whatsapp && whatsapp !== phone) lines.push(`TEL;TYPE=MSG,CELL:${whatsapp}`);
  if (email) lines.push(`EMAIL;TYPE=PREF,INTERNET:${email}`);
  if (location) lines.push(`ADR;TYPE=WORK;CHARSET=UTF-8:;;${escapeValue(location)};;;;`);

  if (linkedin) {
    lines.push(`URL;TYPE=LinkedIn:${linkedin}`);
    lines.push(`ITEM1.URL:${linkedin}`);
    lines.push('ITEM1.X-ABLabel:LinkedIn');
  }
  if (portfolio) {
    lines.push(`URL;TYPE=Portfolio:${portfolio}`);
    lines.push(`ITEM2.URL:${portfolio}`);
    lines.push('ITEM2.X-ABLabel:Portfolio');
  }
  if (bio) lines.push(`NOTE;CHARSET=UTF-8:${escapeValue(bio)}`);

  if (card.photoBase64) {
    const rawB64 = String(card.photoBase64).replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
    if (rawB64) lines.push(`PHOTO;ENCODING=b;TYPE=JPEG:${rawB64}`);
  } else if (card.photoUrl) {
    lines.push(`PHOTO;VALUE=URI:${card.photoUrl}`);
  }

  lines.push('END:VCARD');
  return lines.join('\r\n') + '\r\n';
}

module.exports = {
  buildVCard30
};

