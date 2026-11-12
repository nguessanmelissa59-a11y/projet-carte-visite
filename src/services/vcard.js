window.VCardApp = window.VCardApp || {};

window.VCardApp.VCardService = (function () {
  const { normalizeUrl } = window.VCardApp.UrlCodec;

  function escapeValue(val) {
    if (!val) return '';
    return String(val)
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .trim();
  }

  function generateVCardString(dataObj, includePhotoBase64 = true) {
    const firstName = (dataObj.firstName || '').trim();
    const lastName = (dataObj.lastName || '').trim();
    const fullName = `${firstName} ${lastName}`.trim() || 'Contact';
    const jobTitle = (dataObj.jobTitle || '').trim();
    const org = (dataObj.organization || '').trim();
    const phone = (dataObj.phone || '').trim();
    const whatsapp = (dataObj.whatsapp || '').trim();
    const email = (dataObj.email || '').trim();
    const location = (dataObj.location || '').trim();
    const linkedin = normalizeUrl(dataObj.linkedinUrl);
    const portfolio = normalizeUrl(dataObj.portfolioUrl);
    const bio = (dataObj.bio || '').trim();

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

    if (includePhotoBase64 && dataObj.photoBase64) {
      const rawB64 = dataObj.photoBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
      if (rawB64) lines.push(`PHOTO;ENCODING=b;TYPE=JPEG:${rawB64}`);
    } else if (dataObj.photoUrl) {
      lines.push(`PHOTO;VALUE=URI:${dataObj.photoUrl}`);
    }

    lines.push('END:VCARD');
    return lines.join('\r\n') + '\r\n';
  }

  function downloadVCard(dataObj, onComplete) {
    const vcardContent = generateVCardString(dataObj, true);
    const safeFirst = (dataObj.firstName || 'Contact').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeLast = (dataObj.lastName || '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${safeFirst}${safeLast ? '_' + safeLast : ''}.vcf`;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (isIOS) {
      // Safari iOS opens native "Add to Contacts" sheet directly with data URI
      const dataUri = 'data:text/vcard;charset=utf-8,' + encodeURIComponent(vcardContent);
      const link = document.createElement('a');
      link.href = dataUri;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const blob = new Blob([vcardContent], { type: 'text/vcard;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    }

    if (typeof onComplete === 'function') {
      onComplete(fileName);
    }
  }

  return {
    generateVCardString,
    downloadVCard
  };
})();

