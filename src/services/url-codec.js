window.VCardApp = window.VCardApp || {};

window.VCardApp.UrlCodec = (function () {
  function normalizeUrl(url) {
    if (!url) return '';
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }

  function formatCleanDomain(url) {
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./, '') + (u.pathname !== '/' ? u.pathname : '');
    } catch {
      return url;
    }
  }

  function encodeStateToParam(dataObj, includeInlinePhoto = false) {
    const compact = {
      f: (dataObj.firstName || '').trim(),
      l: (dataObj.lastName || '').trim(),
      j: (dataObj.jobTitle || '').trim(),
      o: (dataObj.organization || '').trim(),
      p: (dataObj.phone || '').trim(),
      w: (dataObj.whatsapp || '').trim(),
      e: (dataObj.email || '').trim(),
      loc: (dataObj.location || '').trim(),
      li: normalizeUrl(dataObj.linkedinUrl),
      po: normalizeUrl(dataObj.portfolioUrl),
      b: (dataObj.bio || '').trim(),
      u: (dataObj.photoUrl || '').trim(),
      t: dataObj.theme || 'indigo',
      a: dataObj.autoDownload ? 1 : 0
    };

    if (includeInlinePhoto && dataObj.photoBase64 && !compact.u) {
      compact.img = dataObj.photoBase64;
    }

    Object.keys(compact).forEach((k) => {
      if (compact[k] === '' || compact[k] === null || compact[k] === undefined) {
        delete compact[k];
      }
    });

    const jsonStr = JSON.stringify(compact);
    if (window.LZString) {
      return 'lz_' + window.LZString.compressToEncodedURIComponent(jsonStr);
    }
    return 'b64_' + btoa(unescape(encodeURIComponent(jsonStr)));
  }

  function decodeParamToState(rawParam) {
    if (!rawParam) return null;
    try {
      let jsonStr = '';
      if (rawParam.startsWith('lz_') && window.LZString) {
        jsonStr = window.LZString.decompressFromEncodedURIComponent(rawParam.slice(3));
      } else if (rawParam.startsWith('b64_')) {
        jsonStr = decodeURIComponent(escape(atob(rawParam.slice(4))));
      } else {
        if (window.LZString) {
          jsonStr = window.LZString.decompressFromEncodedURIComponent(rawParam);
        }
        if (!jsonStr || !jsonStr.startsWith('{')) {
          jsonStr = decodeURIComponent(escape(atob(rawParam)));
        }
      }

      const c = JSON.parse(jsonStr);
      return {
        firstName: c.f || c.firstName || '',
        lastName: c.l || c.lastName || '',
        jobTitle: c.j || c.jobTitle || '',
        organization: c.o || c.organization || '',
        phone: c.p || c.phone || '',
        whatsapp: c.w || c.whatsapp || '',
        email: c.e || c.email || '',
        location: c.loc || c.location || '',
        linkedinUrl: c.li || c.linkedinUrl || '',
        portfolioUrl: c.po || c.portfolioUrl || '',
        bio: c.b || c.bio || '',
        photoUrl: c.u || c.photoUrl || '',
        photoBase64: c.img || c.photoBase64 || '',
        theme: c.t || c.theme || 'indigo',
        autoDownload: c.a !== undefined ? Boolean(c.a) : true
      };
    } catch {
      return null;
    }
  }

  function extractFromCurrentLocation() {
    const searchParams = new URLSearchParams(window.location.search);
    let dataParam = searchParams.get('data');

    if (!dataParam && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      dataParam = hashParams.get('data');
    }

    return dataParam ? decodeParamToState(dataParam) : null;
  }

  function buildPublicUrl(state, includeInlinePhoto = false) {
    const baseUrl = window.location.origin + window.location.pathname;
    const encoded = encodeStateToParam(state, includeInlinePhoto);
    return `${baseUrl}?data=${encoded}`;
  }

  return {
    normalizeUrl,
    formatCleanDomain,
    encodeStateToParam,
    decodeParamToState,
    extractFromCurrentLocation,
    buildPublicUrl
  };
})();
