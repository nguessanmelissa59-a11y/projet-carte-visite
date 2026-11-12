# Guide Git, Dépôt Distant et Automatisation

Ce guide explique comment lier le dépôt local à GitHub ou GitLab et comment automatiser les `commit` et `push`.

---

## 1. Lier et pousser vers un dépôt distant

### Option A : Avec GitHub CLI (`gh`)
```powershell
gh auth login
gh repo create projet-carte-visite --public --source=. --remote=origin --push
```

### Option B : Avec une URL GitHub ou GitLab existante
```powershell
git remote add origin https://github.com/votre-nom/projet-carte-visite.git
git push -u origin main
```

---

## 2. Automatiser les `commit` et `push`

### Méthode 1 : Surveillance automatique (`scripts/auto-push.ps1`)
Le script `scripts/auto-push.ps1` surveille le dossier du projet et pousse automatiquement chaque modification enregistrée :
```powershell
.\scripts\auto-push.ps1
```

### Méthode 2 : Envoi manuel en une commande (`scripts/push.ps1`)
Le script `scripts/push.ps1` exécute `git add -A`, `git commit` et `git push` :
```powershell
.\scripts\push.ps1 "refactor: structure modulaire"
```
Ou sans argument (utilise la liste des fichiers modifiés) :
```powershell
.\scripts\push.ps1
```

### Méthode 3 : Automatisation dans Cursor / VS Code
Le fichier `.vscode/settings.json` active :
* `git.enableSmartCommit: true`
* `git.postCommitCommand: "push"`
