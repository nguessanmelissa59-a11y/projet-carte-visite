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
    }
  },

  THEME_PALETTES: {
    obsidian: {
      label: 'Noir Obsidienne',
      bannerColor: '#18181b',
      headerBg: 'bg-zinc-900',
      btnBg: 'bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900',
      badgeBg: 'bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700',
      iconColor: 'text-zinc-700 dark:text-zinc-300',
      qrDark: '#18181b'
    },
    forest: {
      label: 'Vert Foret',
      bannerColor: '#064e3b',
      headerBg: 'bg-[#064e3b]',
      btnBg: 'bg-[#064e3b] hover:bg-[#065f46] text-white',
      badgeBg: 'bg-emerald-950/5 text-emerald-900 border-emerald-900/15 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50',
      iconColor: 'text-[#065f46] dark:text-emerald-400',
      qrDark: '#064e3b'
    },
    cobalt: {
      label: 'Bleu Cobalt',
      bannerColor: '#1e3a8a',
      headerBg: 'bg-[#1e3a8a]',
      btnBg: 'bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white',
      badgeBg: 'bg-blue-950/5 text-blue-900 border-blue-900/15 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50',
      iconColor: 'text-[#1e3a8a] dark:text-blue-400',
      qrDark: '#1e3a8a'
    },
    bronze: {
      label: 'Terre & Bronze',
      bannerColor: '#78350f',
      headerBg: 'bg-[#78350f]',
      btnBg: 'bg-[#78350f] hover:bg-[#92400e] text-white',
      badgeBg: 'bg-amber-950/5 text-amber-900 border-amber-900/15 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50',
      iconColor: 'text-[#78350f] dark:text-amber-400',
      qrDark: '#78350f'
    },
    bordeaux: {
      label: 'Bordeaux',
      bannerColor: '#7f1d1d',
      headerBg: 'bg-[#7f1d1d]',
      btnBg: 'bg-[#7f1d1d] hover:bg-[#991b1b] text-white',
      badgeBg: 'bg-rose-950/5 text-rose-900 border-rose-900/15 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50',
      iconColor: 'text-[#7f1d1d] dark:text-rose-400',
      qrDark: '#7f1d1d'
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
    'photoUrl'
  ]
};
