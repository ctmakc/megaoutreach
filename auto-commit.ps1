# Auto commit and push script for Windows
# Run this via Task Scheduler every hour

$projectPath = $PSScriptRoot
Set-Location $projectPath

# Check if there are changes
$changes = git status -s

if ($changes) {
    Write-Host "📝 Changes detected, committing..." -ForegroundColor Green

    # Add all changes
    git add -A

    # Commit with timestamp
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    git commit -m "auto: $timestamp"

    # Push to remote
    git push origin main

    Write-Host "✅ Pushed at $timestamp" -ForegroundColor Green
} else {
    Write-Host "✨ No changes to commit" -ForegroundColor Yellow
}
