<#
.SYNOPSIS
  Script d'automatisation Git : ajoute, valide (commit) et pousse (push) automatiquement toutes les modifications.
.EXAMPLE
  .\push.ps1 "Mise à jour du design de la carte"
  .\push.ps1
#>

param(
  [Parameter(Mandatory = $false, Position = 0)]
  [string]$Message = ""
)

$ErrorActionPreference = "Stop"

# Vérifier s'il y a des modifications
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
  Write-Host "✅ Aucune modification à pousser (le dépôt est déjà à jour)." -ForegroundColor Green
  exit 0
}

# Générer un message automatique si aucun n'est fourni
if ([string]::IsNullOrWhiteSpace($Message)) {
  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
  $Message = "chore: mise à jour automatique ($timestamp)"
}

Write-Host "📦 Ajout des fichiers modifiés..." -ForegroundColor Cyan
git add -A

Write-Host "📝 Création du commit : '$Message'..." -ForegroundColor Cyan
git commit -m "$Message"

# Vérifier si un dépôt distant (origin) est configuré
$remotes = git remote
if ($remotes -contains "origin") {
  $branch = git rev-parse --abbrev-ref HEAD
  Write-Host "🚀 Envoi (push) vers origin/$branch..." -ForegroundColor Cyan
  git push -u origin $branch
  Write-Host "✅ Modifications poussées avec succès sur le dépôt distant !" -ForegroundColor Green
} else {
  Write-Host "⚠️ Commit créé localement, mais aucun dépôt distant ('origin') n'est encore lié." -ForegroundColor Yellow
  Write-Host "👉 Pour lier un dépôt GitHub/GitLab : git remote add origin <URL_DU_DEPOT>" -ForegroundColor Yellow
}

