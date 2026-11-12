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
      label: 'Forêt',
      bannerColor: '#0c543c',
      headerBg: 'bg-[#0c543c]',
      btnBg: 'bg-[#0c543c] hover:bg-[#0a4632] text-white',
      badgeBg: 'bg-[#e6f0eb] text-[#0c543c] border-[#cfe3d8] dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-800',
      iconColor: 'text-[#0c543c] dark:text-emerald-200',
      qrDark: '#0a4632'
    },
    cobalt: {
      label: 'Cobalt',
      bannerColor: '#2f5b8a',
      headerBg: 'bg-[#2f5b8a]',
      btnBg: 'bg-[#2f5b8a] hover:bg-[#274c74] text-white',
      badgeBg: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-100 dark:border-slate-700',
      iconColor: 'text-[#2f5b8a] dark:text-slate-300',
      qrDark: '#274c74'
    },
    bronze: {
      label: 'Terracotta',
      bannerColor: '#9c542f',
      headerBg: 'bg-[#9c542f]',
      btnBg: 'bg-[#9c542f] hover:bg-[#844628] text-white',
      badgeBg: 'bg-orange-50 text-stone-800 border-orange-100 dark:bg-orange-950/35 dark:text-orange-100 dark:border-orange-900',
      iconColor: 'text-[#9c542f] dark:text-orange-200',
      qrDark: '#844628'
    },
    bordeaux: {
      label: 'Bordeaux',
      bannerColor: '#763221',
      headerBg: 'bg-[#763221]',
      btnBg: 'bg-[#763221] hover:bg-[#632a1c] text-white',
      badgeBg: 'bg-rose-50 text-stone-800 border-rose-100 dark:bg-rose-950/35 dark:text-rose-100 dark:border-rose-900',
      iconColor: 'text-[#763221] dark:text-rose-200',
      qrDark: '#632a1c'
    },
    teal: {
      label: 'Sarcelle',
      bannerColor: '#1f6b5c',
      headerBg: 'bg-[#1f6b5c]',
      btnBg: 'bg-[#1f6b5c] hover:bg-[#1a5a4d] text-white',
      badgeBg: 'bg-teal-50 text-stone-800 border-teal-100 dark:bg-teal-950/35 dark:text-teal-100 dark:border-teal-900',
      iconColor: 'text-[#1f6b5c] dark:text-teal-200',
      qrDark: '#1a5a4d'
    },
    gold: {
      label: 'Or',
      bannerColor: '#8a7040',
      headerBg: 'bg-[#8a7040]',
      btnBg: 'bg-[#8a7040] hover:bg-[#746036] text-white',
      badgeBg: 'bg-amber-50 text-stone-800 border-amber-100 dark:bg-amber-950/35 dark:text-amber-100 dark:border-amber-900',
      iconColor: 'text-[#8a7040] dark:text-amber-200',
      qrDark: '#746036'
    },
    navy: {
      label: 'Marine',
      bannerColor: '#1e3a5f',
      headerBg: 'bg-[#1e3a5f]',
      btnBg: 'bg-[#1e3a5f] hover:bg-[#18304f] text-white',
      badgeBg: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700',
      iconColor: 'text-[#1e3a5f] dark:text-slate-300',
      qrDark: '#18304f'
    },
    plum: {
      label: 'Prune',
      bannerColor: '#6b3a4a',
      headerBg: 'bg-[#6b3a4a]',
      btnBg: 'bg-[#6b3a4a] hover:bg-[#5a3140] text-white',
      badgeBg: 'bg-rose-50 text-stone-800 border-rose-100 dark:bg-rose-950/35 dark:text-rose-100 dark:border-rose-900',
      iconColor: 'text-[#6b3a4a] dark:text-rose-200',
      qrDark: '#5a3140'
    },
    indigo: {
      label: 'Indigo',
      bannerColor: '#3f4570',
      headerBg: 'bg-[#3f4570]',
      btnBg: 'bg-[#3f4570] hover:bg-[#353a5e] text-white',
      badgeBg: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-indigo-950/35 dark:text-indigo-100 dark:border-indigo-900',
      iconColor: 'text-[#3f4570] dark:text-indigo-200',
      qrDark: '#353a5e'
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
    theme: 'forest',
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
