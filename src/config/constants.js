window.VCardApp = window.VCardApp || {};

window.VCardApp.Config = {
  STORAGE_KEY: 'vcard_studio_draft_v1',
  THEME_STORAGE_KEY: 'vcard_studio_dark_mode',

  THEME_PALETTES: {
    indigo: {
      headerBg: 'from-indigo-600 via-indigo-600 to-violet-700',
      btnBg: 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/25',
      badgeBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      qrDark: '#1e1b4b'
    },
    emerald: {
      headerBg: 'from-emerald-600 via-emerald-600 to-teal-700',
      btnBg: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/25',
      badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      qrDark: '#064e3b'
    },
    blue: {
      headerBg: 'from-sky-500 via-blue-600 to-indigo-700',
      btnBg: 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/25',
      badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      qrDark: '#1e3a8a'
    },
    rose: {
      headerBg: 'from-rose-500 via-rose-600 to-pink-700',
      btnBg: 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/25',
      badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      iconColor: 'text-rose-600 dark:text-rose-400',
      qrDark: '#881337'
    },
    amber: {
      headerBg: 'from-amber-500 via-orange-500 to-amber-700',
      btnBg: 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/25',
      badgeBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
      qrDark: '#78350f'
    },
    slate: {
      headerBg: 'from-slate-800 via-slate-900 to-black',
      btnBg: 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 shadow-slate-900/20',
      badgeBg: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
      iconColor: 'text-slate-700 dark:text-slate-300',
      qrDark: '#0f172a'
    }
  },

  DEMO_DATA: {
    firstName: 'Koffi',
    lastName: 'Kouadio',
    jobTitle: 'Directeur Technique & Solutions Cloud',
    organization: 'NovaTech Africa',
    phone: '+225 07 08 09 10 11',
    whatsapp: '+225 07 08 09 10 11',
    email: 'koffi.kouadio@novatech.ci',
    location: 'Abidjan, Côte d’Ivoire',
    linkedinUrl: 'https://linkedin.com/in/koffi-kouadio',
    portfolioUrl: 'https://novatech-africa.com',
    bio: 'Architecte Cloud & Développeur Full-Stack. Accompagnement des entreprises dans leur transformation digitale.',
    photoUrl: '',
    photoBase64: '',
    theme: 'indigo',
    autoDownload: true
  },

  FORM_FIELDS: [
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

