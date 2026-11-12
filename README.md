# vCard Studio

Application web statique permettant de generer une carte de visite numerique (vCard 3.0 RFC 2426) accompagnee d'un QR Code dynamique, sans base de donnees (*Zero-Backend*).

## Architecture du projet

```text
projet_carte_visite/
├── .agents/
│   └── skills/
│       └── clean-architecture-standards/
│           └── SKILL.md
├── assets/
│   └── css/
│       └── styles.css
├── docs/
│   ├── git-et-automatisation.md
│   ├── prd.md
│   └── technologies.md
├── scripts/
│   ├── auto-push.ps1
│   └── push.ps1
├── src/
│   ├── config/
│   │   └── constants.js
│   ├── services/
│   │   ├── storage.js
│   │   ├── url-codec.js
│   │   └── vcard.js
│   ├── ui/
│   │   ├── profile-card.js
│   │   └── qr-view.js
│   └── main.js
├── AGENTS.md
├── README.md
└── index.html
```

## Utilisation locale

Ouvrir `index.html` dans un navigateur ou lancer un serveur statique local :

```powershell
npx serve .
```

## Synchronisation Git

* Envoi ponctuel : `.\scripts\push.ps1 "description"`
* Surveillance continue : `.\scripts\auto-push.ps1`
