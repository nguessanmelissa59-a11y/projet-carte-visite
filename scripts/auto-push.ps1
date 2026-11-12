param(
  [int]$IntervalSeconds = 5
)

$repoRoot = (Resolve-Path "$PSScriptRoot\..").Path
Set-Location $repoRoot
Write-Host "Surveillance Git active sur : $repoRoot"

while ($true) {
  try {
    $status = git status --porcelain
    if (-not [string]::IsNullOrWhiteSpace($status)) {
      Start-Sleep -Seconds 2

      $changedFiles = (git status --porcelain | ForEach-Object { $_.Substring(3).Trim() }) -join ", "
      $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
      $commitMsg = "update: $changedFiles"

      Write-Host "[$timestamp] Modification detectee : $changedFiles"
      git add -A
      git commit -m "$commitMsg" | Out-Null

      $branch = (git rev-parse --abbrev-ref HEAD).Trim()
      Write-Host "[$timestamp] Push vers origin/$branch..."
      git push origin $branch

      if ($LASTEXITCODE -eq 0) {
        Write-Host "[$timestamp] Synchronise."
      } else {
        Write-Host "[$timestamp] Erreur lors du push."
      }
    }
  } catch {
    Write-Host "Erreur : $_"
  }

  Start-Sleep -Seconds $IntervalSeconds
}
