<#
.SYNOPSIS
  Surveille le dossier du projet en continu et fait un commit + push automatique sur GitHub dès qu'un fichier est créé, modifié ou supprimé.
#>

param(
  [int]$IntervalSeconds = 5
)

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host " 👀 Surveillance Git Auto-Push activée !" -ForegroundColor Green
Write-Host " Dossier : $PSScriptRoot" -ForegroundColor Gray
Write-Host " Dès qu'un fichier est sauvegardé, il est poussé sur GitHub." -ForegroundColor Gray
Write-Host "=====================================================" -ForegroundColor Cyan

Set-Location $PSScriptRoot

while ($true) {
  try {
    $status = git status --porcelain
    if (-not [string]::IsNullOrWhiteSpace($status)) {
      # Petit délai (debounce) de 2 secondes pour laisser l'éditeur finir d'enregistrer tous les fichiers
      Start-Sleep -Seconds 2

      $changedFiles = (git status --porcelain | ForEach-Object { $_.Substring(3).Trim() }) -join ", "
      $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
      $commitMsg = "auto: mise à jour ($changedFiles) [$timestamp]"

      Write-Host "`n[$timestamp] 🔄 Changement détecté : $changedFiles" -ForegroundColor Yellow
      git add -A
      git commit -m "$commitMsg" | Out-Null

      $branch = (git rev-parse --abbrev-ref HEAD).Trim()
      Write-Host "[$timestamp] 🚀 Envoi automatique vers GitHub (origin/$branch)..." -ForegroundColor Cyan
      git push origin $branch

      if ($LASTEXITCODE -eq 0) {
        Write-Host "[$timestamp] ✅ Poussé avec succès sur GitHub !" -ForegroundColor Green
      } else {
        Write-Host "[$timestamp] ⚠️ Échec du push (vérifiez la connexion réseau)." -ForegroundColor Red
      }
    }
  } catch {
    Write-Host "⚠️ Erreur momentanée : $_" -ForegroundColor Red
  }

  Start-Sleep -Seconds $IntervalSeconds
}
