window.VCardApp = window.VCardApp || {};

window.VCardApp.Config = {
  STORAGE_KEY: 'vcard_studio_draft_v2',
  THEME_STORAGE_KEY: 'vcard_studio_dark_mode',

  CARD_TEMPLATES: {
    editorial: {
      id: 'editorial',
      label: 'Éditorial',
      blurb: 'Grille nette, QR latéral',
      swatch: ['#ffffff', '#18181b', '#e4e4e7']
    },
    minimal: {
      id: 'minimal',
      label: 'Minimaliste',
      blurb: 'Beige doux, aéré',
      swatch: ['#f3eee6', '#1c1917', '#d6d3d1']
    },
    corporate: {
      id: 'corporate',
      label: 'Corporate Tech',
      blurb: 'Navy sombre, verre',
      swatch: ['#0b1c2c', '#1d4e89', '#67e8f9']
    },
    creative: {
      id: 'creative',
      label: 'Créatif',
      blurb: 'Vagues corail / ambre',
      swatch: ['#ff7a59', '#f0abfc', '#fbbf24']
    },
    eco: {
      id: 'eco',
      label: 'Naturel Éco',
      blurb: 'Sauge et terre',
      swatch: ['#eef2eb', '#4d7c5a', '#c26d3e']
    },
    prestige: {
      id: 'prestige',
      label: 'Prestige Luxe',
      blurb: 'Noir et or',
      swatch: ['#0a0a0a', '#c9a227', '#f5e6b8']
    },
    nocturne: {
      id: 'nocturne',
      label: 'Nocturne',
      blurb: 'Charbon et argent',
      swatch: ['#111113', '#a1a1aa', '#fafafa']
    },
    atelier: {
      id: 'atelier',
      label: 'Atelier',
      blurb: 'Papier chaud, encre',
      swatch: ['#f7f1e8', '#2a2118', '#8b5e3c']
    },
    lagoon: {
      id: 'lagoon',
      label: 'Lagoon',
      blurb: 'Sarcelle et écume',
      swatch: ['#ecfeff', '#0f766e', '#67e8f9']
    },
    slate: {
      id: 'slate',
      label: 'Ardoise',
      blurb: 'Bleu-gris architectural',
      swatch: ['#f1f5f9', '#334155', '#64748b']
    },
    sunset: {
      id: 'sunset',
      label: 'Sunset',
      blurb: 'Ambre et corail chaud',
      swatch: ['#fff7ed', '#ea580c', '#fb923c']
    },
    sumi: {
      id: 'sumi',
      label: 'Sumi',
      blurb: 'Encre et vermillon',
      swatch: ['#fafafa', '#111111', '#b91c1c']
    },
    arctic: {
      id: 'arctic',
      label: 'Arctic',
      blurb: 'Glace et acier',
      swatch: ['#f8fafc', '#0ea5e9', '#1e293b']
    },
    metro: {
      id: 'metro',
      label: 'Métro',
      blurb: 'Split géométrique bold',
      swatch: ['#fef08a', '#18181b', '#fafafa']
    }
  },

  THEME_PALETTES: {
    obsidian: {
      label: 'Encre',
      bannerColor: '#0c0a09',
      headerBg: 'bg-stone-950',
      btnBg: 'bg-stone-950 hover:bg-stone-800 text-white dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950',
      badgeBg: 'bg-stone-100 text-stone-800 border-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:border-stone-700',
      iconColor: 'text-stone-800 dark:text-stone-200',
      qrDark: '#0c0a09'
    },
    forest: {
      label: 'Émeraude',
      bannerColor: '#059669',
      headerBg: 'bg-[#059669]',
      btnBg: 'bg-[#059669] hover:bg-[#047857] text-white',
      badgeBg: 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-700',
      iconColor: 'text-[#059669] dark:text-emerald-300',
      qrDark: '#047857'
    },
    cobalt: {
      label: 'Azur',
      bannerColor: '#2563eb',
      headerBg: 'bg-[#2563eb]',
      btnBg: 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white',
      badgeBg: 'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/50 dark:text-blue-200 dark:border-blue-700',
      iconColor: 'text-[#2563eb] dark:text-blue-300',
      qrDark: '#1d4ed8'
    },
    bronze: {
      label: 'Ambre',
      bannerColor: '#ea580c',
      headerBg: 'bg-[#ea580c]',
      btnBg: 'bg-[#ea580c] hover:bg-[#c2410c] text-white',
      badgeBg: 'bg-orange-50 text-orange-950 border-orange-200 dark:bg-orange-950/45 dark:text-orange-200 dark:border-orange-700',
      iconColor: 'text-[#ea580c] dark:text-orange-300',
      qrDark: '#c2410c'
    },
    bordeaux: {
      label: 'Cerise',
      bannerColor: '#e11d48',
      headerBg: 'bg-[#e11d48]',
      btnBg: 'bg-[#e11d48] hover:bg-[#be123c] text-white',
      badgeBg: 'bg-rose-50 text-rose-950 border-rose-200 dark:bg-rose-950/45 dark:text-rose-200 dark:border-rose-700',
      iconColor: 'text-[#e11d48] dark:text-rose-300',
      qrDark: '#be123c'
    }
  },

  DEMO_DATA: {
    slug: 'koffi-kouadio',
    firstName: 'Koffi',
    lastName: 'Kouadio',
    jobTitle: 'Directeur Technique & Infrastructure',
    organization: 'NovaTech Africa',
    phone: '+225 07 08 09 10 11',
    whatsapp: '+225 07 08 09 10 11',
    email: 'koffi.kouadio@novatech.ci',
    location: 'Abidjan, Côte d’Ivoire',
    linkedinUrl: 'https://linkedin.com/in/koffi-kouadio',
    portfolioUrl: 'https://novatech-africa.com',
    bio: 'Architecture distribuée, sécurité des systèmes et accompagnement technique.',
    photoUrl: '',
    photoBase64: '',
    qrLogoUrl: '',
    qrLogoBase64: '',
    theme: 'obsidian',
    cardTemplate: 'editorial',
    autoDownload: true,
    scans: 0
  },

  FORM_FIELDS: [
    'slug',
    'firstName',
    'lastName',
    'jobTitle',
    'organization',
    'phone',
    'whatsapp',
    'email',
    'location',
    'linkedinUrl',
    'portfolioUrl',
    'bio',
    'photoUrl',
    'qrLogoUrl'
  ]
};
