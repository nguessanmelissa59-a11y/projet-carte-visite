# 🚀 Guide Git, Dépôt Distant & Automatisation des Push

Ce guide explique comment lier votre dépôt local à **GitHub** ou **GitLab**, et comment automatiser vos `commit` + `push` ainsi que la mise en ligne automatique de votre carte de visite.

---

## 1. Lier et pousser vers un dépôt distant (GitHub / GitLab)

Le dépôt Git local est déjà initialisé sur la branche `main` avec un premier commit contenant tout le projet.

### Option A : Avec GitHub CLI (`gh`) — Le plus rapide (en 2 commandes)
Dans votre terminal PowerShell :
```powershell
# 1. Connectez-vous une seule fois à votre compte GitHub
gh auth login

# 2. Créez le dépôt sur GitHub et poussez tout automatiquement
gh repo create projet-carte-visite --public --source=. --remote=origin --push
```

### Option B : Avec une URL GitHub ou GitLab existante
Si vous avez créé un dépôt vide sur GitHub ou GitLab (ex: `https://github.com/votre-nom/projet-carte-visite.git`) :
```powershell
git remote add origin https://github.com/votre-nom/projet-carte-visite.git
git push -u origin main
```

---

## 2. Comment automatiser vos `commit` et `push` au quotidien

### Méthode 1 : Utiliser le script `push.ps1` (Inclus dans le projet)
Un script PowerShell [push.ps1](file:///c:/Users/Meliisa/Desktop/projet_carte_visite/push.ps1) a été créé à la racine du projet. Il exécute automatiquement `git add -A`, `git commit` et `git push` :

* **Avec un message personnalisé :**
  ```powershell
  .\push.ps1 "Ajout du numéro WhatsApp"
  ```
* **Sans message (génère automatiquement la date et l'heure) :**
  ```powershell
  .\push.ps1
  ```

### Méthode 2 : Créer un alias Git global `git pushall`
Vous pouvez enregistrer une commande rapide dans votre configuration Git globale pour pousser en une seule commande depuis n'importe quel projet :
```powershell
git config --global alias.pushall '!git add -A && git commit -m "chore: auto-update" && git push'
```
Ensuite, il vous suffira de taper :
```powershell
git pushall
```

### Méthode 3 : Automatisation dans Cursor / VS Code
Pour ne même plus utiliser le terminal :
1. Ouvrez les paramètres (`Ctrl + ,`).
2. Cherchez **`git.enableSmartCommit`** et cochez la case (permet de faire un commit de tous les fichiers sans faire `git add` avant).
3. Cherchez **`git.postCommitCommand`** et choisissez **`push`** : dès que vous cliquez sur **Commit** dans l'interface de gauche, l'éditeur envoie (`push`) automatiquement le code vers le serveur !

---

## 3. Déploiement continu (CI/CD) inclus

Le fichier [.github/workflows/deploy.yml](file:///c:/Users/Meliisa/Desktop/projet_carte_visite/.github/workflows/deploy.yml) est déjà configuré :
* Dès que vous poussez (`push`) sur GitHub (branche `main`), **GitHub Actions** déploie automatiquement votre site sur **GitHub Pages**.
* Pour l'activer sur GitHub : allez dans **Settings → Pages → Source**, et sélectionnez **GitHub Actions**.

