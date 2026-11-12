param(
  [Parameter(Mandatory = $false, Position = 0)]
  [string]$Message = ""
)

$ErrorActionPreference = "Stop"

$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
  Write-Host "Aucune modification a pousser."
  exit 0
}

if ([string]::IsNullOrWhiteSpace($Message)) {
  $changedFiles = (git status --porcelain | ForEach-Object { $_.Substring(3).Trim() }) -join ", "
  $Message = "update: $changedFiles"
}

git add -A
git commit -m "$Message"

$remotes = git remote
if ($remotes -contains "origin") {
  $branch = git rev-parse --abbrev-ref HEAD
  git push -u origin $branch
  Write-Host "Modifications poussees sur origin/$branch."
} else {
  Write-Host "Commit cree localement. Aucun depot distant 'origin' configure."
}
