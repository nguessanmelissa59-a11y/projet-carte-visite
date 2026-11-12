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
      bannerColor: '#22262e',
      headerBg: 'bg-[#22262e]',
      btnBg: 'bg-[#22262e] hover:bg-[#3a4150] text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-950',
      badgeBg: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700',
      iconColor: 'text-slate-700 dark:text-slate-300',
      qrDark: '#22262e'
    },
    forest: {
      label: 'Forêt',
      bannerColor: '#0a6b45',
      headerBg: 'bg-[#0a6b45]',
      btnBg: 'bg-[#0a6b45] hover:bg-[#085536] text-white',
      badgeBg: 'bg-[#d8f5e7] text-[#0a6b45] border-[#a8e6c8] dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-800',
      iconColor: 'text-[#0a6b45] dark:text-emerald-200',
      qrDark: '#085536'
    },
    cobalt: {
      label: 'Cobalt',
      bannerColor: '#1f6fbf',
      headerBg: 'bg-[#1f6fbf]',
      btnBg: 'bg-[#1f6fbf] hover:bg-[#185a9c] text-white',
      badgeBg: 'bg-sky-50 text-sky-900 border-sky-100 dark:bg-slate-800/80 dark:text-slate-100 dark:border-slate-700',
      iconColor: 'text-[#1f6fbf] dark:text-sky-300',
      qrDark: '#185a9c'
    },
    bronze: {
      label: 'Terracotta',
      bannerColor: '#c45c1f',
      headerBg: 'bg-[#c45c1f]',
      btnBg: 'bg-[#c45c1f] hover:bg-[#a34c19] text-white',
      badgeBg: 'bg-orange-50 text-orange-950 border-orange-100 dark:bg-orange-950/35 dark:text-orange-100 dark:border-orange-900',
      iconColor: 'text-[#c45c1f] dark:text-orange-200',
      qrDark: '#a34c19'
    },
    bordeaux: {
      label: 'Bordeaux',
      bannerColor: '#a11f35',
      headerBg: 'bg-[#a11f35]',
      btnBg: 'bg-[#a11f35] hover:bg-[#86192c] text-white',
      badgeBg: 'bg-rose-50 text-rose-950 border-rose-100 dark:bg-rose-950/35 dark:text-rose-100 dark:border-rose-900',
      iconColor: 'text-[#a11f35] dark:text-rose-200',
      qrDark: '#86192c'
    },
    teal: {
      label: 'Sarcelle',
      bannerColor: '#0e8f78',
      headerBg: 'bg-[#0e8f78]',
      btnBg: 'bg-[#0e8f78] hover:bg-[#0b7462] text-white',
      badgeBg: 'bg-teal-50 text-teal-950 border-teal-100 dark:bg-teal-950/35 dark:text-teal-100 dark:border-teal-900',
      iconColor: 'text-[#0e8f78] dark:text-teal-200',
      qrDark: '#0b7462'
    },
    gold: {
      label: 'Or',
      bannerColor: '#c2912a',
      headerBg: 'bg-[#c2912a]',
      btnBg: 'bg-[#c2912a] hover:bg-[#a37922] text-white',
      badgeBg: 'bg-amber-50 text-amber-950 border-amber-100 dark:bg-amber-950/35 dark:text-amber-100 dark:border-amber-900',
      iconColor: 'text-[#c2912a] dark:text-amber-200',
      qrDark: '#a37922'
    },
    navy: {
      label: 'Marine',
      bannerColor: '#1a4f96',
      headerBg: 'bg-[#1a4f96]',
      btnBg: 'bg-[#1a4f96] hover:bg-[#143f78] text-white',
      badgeBg: 'bg-blue-50 text-blue-950 border-blue-100 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700',
      iconColor: 'text-[#1a4f96] dark:text-blue-300',
      qrDark: '#143f78'
    },
    plum: {
      label: 'Prune',
      bannerColor: '#9a2f5c',
      headerBg: 'bg-[#9a2f5c]',
      btnBg: 'bg-[#9a2f5c] hover:bg-[#7e264b] text-white',
      badgeBg: 'bg-pink-50 text-pink-950 border-pink-100 dark:bg-rose-950/35 dark:text-rose-100 dark:border-rose-900',
      iconColor: 'text-[#9a2f5c] dark:text-pink-200',
      qrDark: '#7e264b'
    },
    indigo: {
      label: 'Indigo',
      bannerColor: '#4a4fb0',
      headerBg: 'bg-[#4a4fb0]',
      btnBg: 'bg-[#4a4fb0] hover:bg-[#3b408f] text-white',
      badgeBg: 'bg-indigo-50 text-indigo-950 border-indigo-100 dark:bg-indigo-950/35 dark:text-indigo-100 dark:border-indigo-900',
      iconColor: 'text-[#4a4fb0] dark:text-indigo-200',
      qrDark: '#3b408f'
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
