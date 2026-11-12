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
      bannerColor: '#12141a',
      headerBg: 'bg-slate-950',
      btnBg: 'bg-slate-950 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-950',
      badgeBg: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700',
      iconColor: 'text-slate-800 dark:text-slate-200',
      qrDark: '#12141a'
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
    },
    teal: {
      label: 'Sarcelle',
      bannerColor: '#0f766e',
      headerBg: 'bg-[#0f766e]',
      btnBg: 'bg-[#0f766e] hover:bg-[#0d9488] text-white',
      badgeBg: 'bg-teal-50 text-teal-950 border-teal-200 dark:bg-teal-950/45 dark:text-teal-200 dark:border-teal-700',
      iconColor: 'text-[#0f766e] dark:text-teal-300',
      qrDark: '#115e59'
    },
    gold: {
      label: 'Or',
      bannerColor: '#a16207',
      headerBg: 'bg-[#a16207]',
      btnBg: 'bg-[#a16207] hover:bg-[#854d0e] text-white',
      badgeBg: 'bg-amber-50 text-amber-950 border-amber-200 dark:bg-amber-950/45 dark:text-amber-200 dark:border-amber-700',
      iconColor: 'text-[#a16207] dark:text-amber-300',
      qrDark: '#854d0e'
    },
    navy: {
      label: 'Marine',
      bannerColor: '#1e3a5f',
      headerBg: 'bg-[#1e3a5f]',
      btnBg: 'bg-[#1e3a5f] hover:bg-[#152a45] text-white',
      badgeBg: 'bg-slate-100 text-slate-900 border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700',
      iconColor: 'text-[#1e3a5f] dark:text-slate-300',
      qrDark: '#152a45'
    },
    plum: {
      label: 'Prune',
      bannerColor: '#9f1239',
      headerBg: 'bg-[#9f1239]',
      btnBg: 'bg-[#9f1239] hover:bg-[#881337] text-white',
      badgeBg: 'bg-rose-50 text-rose-950 border-rose-200 dark:bg-rose-950/45 dark:text-rose-200 dark:border-rose-700',
      iconColor: 'text-[#9f1239] dark:text-rose-300',
      qrDark: '#881337'
    },
    indigo: {
      label: 'Indigo',
      bannerColor: '#3730a3',
      headerBg: 'bg-[#3730a3]',
      btnBg: 'bg-[#3730a3] hover:bg-[#312e81] text-white',
      badgeBg: 'bg-indigo-50 text-indigo-950 border-indigo-200 dark:bg-indigo-950/45 dark:text-indigo-200 dark:border-indigo-700',
      iconColor: 'text-[#3730a3] dark:text-indigo-300',
      qrDark: '#312e81'
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
