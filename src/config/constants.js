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
      blurb: 'Navy mat, filet bleu',
      swatch: ['#0f2438', '#1d4e89', '#dbe7f3']
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
      blurb: 'Blanc et bleu acier',
      swatch: ['#f8fafc', '#0284c7', '#1e293b']
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
      bannerColor: '#2a2d34',
      headerBg: 'bg-[#2a2d34]',
      btnBg: 'bg-[#2a2d34] hover:bg-[#3a3e48] text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-950',
      badgeBg: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700',
      iconColor: 'text-slate-700 dark:text-slate-300',
      qrDark: '#2a2d34'
    },
    forest: {
      label: 'Émeraude',
      bannerColor: '#5a7d6c',
      headerBg: 'bg-[#5a7d6c]',
      btnBg: 'bg-[#5a7d6c] hover:bg-[#4a6a5b] text-white',
      badgeBg: 'bg-stone-100 text-stone-700 border-stone-200 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-800',
      iconColor: 'text-[#5a7d6c] dark:text-emerald-200',
      qrDark: '#4a6a5b'
    },
    cobalt: {
      label: 'Azur',
      bannerColor: '#5c7a9e',
      headerBg: 'bg-[#5c7a9e]',
      btnBg: 'bg-[#5c7a9e] hover:bg-[#4d6888] text-white',
      badgeBg: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-100 dark:border-slate-700',
      iconColor: 'text-[#5c7a9e] dark:text-slate-300',
      qrDark: '#4d6888'
    },
    bronze: {
      label: 'Ambre',
      bannerColor: '#b8845c',
      headerBg: 'bg-[#b8845c]',
      btnBg: 'bg-[#b8845c] hover:bg-[#a0714c] text-white',
      badgeBg: 'bg-orange-50 text-stone-800 border-orange-100 dark:bg-orange-950/35 dark:text-orange-100 dark:border-orange-900',
      iconColor: 'text-[#b8845c] dark:text-orange-200',
      qrDark: '#a0714c'
    },
    bordeaux: {
      label: 'Cerise',
      bannerColor: '#a35d6a',
      headerBg: 'bg-[#a35d6a]',
      btnBg: 'bg-[#a35d6a] hover:bg-[#8f5060] text-white',
      badgeBg: 'bg-rose-50 text-stone-800 border-rose-100 dark:bg-rose-950/35 dark:text-rose-100 dark:border-rose-900',
      iconColor: 'text-[#a35d6a] dark:text-rose-200',
      qrDark: '#8f5060'
    },
    teal: {
      label: 'Sarcelle',
      bannerColor: '#5a8a84',
      headerBg: 'bg-[#5a8a84]',
      btnBg: 'bg-[#5a8a84] hover:bg-[#4b7570] text-white',
      badgeBg: 'bg-teal-50 text-stone-800 border-teal-100 dark:bg-teal-950/35 dark:text-teal-100 dark:border-teal-900',
      iconColor: 'text-[#5a8a84] dark:text-teal-200',
      qrDark: '#4b7570'
    },
    gold: {
      label: 'Or',
      bannerColor: '#9a8458',
      headerBg: 'bg-[#9a8458]',
      btnBg: 'bg-[#9a8458] hover:bg-[#847049] text-white',
      badgeBg: 'bg-amber-50 text-stone-800 border-amber-100 dark:bg-amber-950/35 dark:text-amber-100 dark:border-amber-900',
      iconColor: 'text-[#9a8458] dark:text-amber-200',
      qrDark: '#847049'
    },
    navy: {
      label: 'Marine',
      bannerColor: '#4a5d73',
      headerBg: 'bg-[#4a5d73]',
      btnBg: 'bg-[#4a5d73] hover:bg-[#3d4e61] text-white',
      badgeBg: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700',
      iconColor: 'text-[#4a5d73] dark:text-slate-300',
      qrDark: '#3d4e61'
    },
    plum: {
      label: 'Prune',
      bannerColor: '#8a5a68',
      headerBg: 'bg-[#8a5a68]',
      btnBg: 'bg-[#8a5a68] hover:bg-[#754c58] text-white',
      badgeBg: 'bg-rose-50 text-stone-800 border-rose-100 dark:bg-rose-950/35 dark:text-rose-100 dark:border-rose-900',
      iconColor: 'text-[#8a5a68] dark:text-rose-200',
      qrDark: '#754c58'
    },
    indigo: {
      label: 'Indigo',
      bannerColor: '#5f6488',
      headerBg: 'bg-[#5f6488]',
      btnBg: 'bg-[#5f6488] hover:bg-[#505574] text-white',
      badgeBg: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-indigo-950/35 dark:text-indigo-100 dark:border-indigo-900',
      iconColor: 'text-[#5f6488] dark:text-indigo-200',
      qrDark: '#505574'
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
