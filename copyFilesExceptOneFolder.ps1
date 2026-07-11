# Source and destination
$Source = "D:\PROJECTS\docnest"
$Dest = "D:\PROJECTS\docnestt\all files"

# Create destination folder
New-Item -ItemType Directory -Path $Dest -Force | Out-Null

# Get ALL files except from 'files' folder
Get-ChildItem -Path $Source -Recurse -File | 
    Where-Object { $_.FullName -notmatch "\\files\\" } |
    Copy-Item -Destination $Dest -Force

Write-Host "✅ All files copied (except 'files' folder)!" -ForegroundColor Green