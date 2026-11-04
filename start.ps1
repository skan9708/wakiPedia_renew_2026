# Build and preview the frontend alongside the local Django API.
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$python = Join-Path $root 'backend/.venv/Scripts/python.exe'

if (-not (Test-Path $python)) {
    throw 'Python virtual environment is missing. See README.md for setup steps.'
}

$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npm) {
    $nodePackage = Join-Path $env:LOCALAPPDATA 'Microsoft/WinGet/Packages/OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe'
    $nodeDirectory = Get-ChildItem $nodePackage -Directory -Filter 'node-*-win-x64' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($nodeDirectory) {
        $env:PATH = "$($nodeDirectory.FullName);$env:PATH"
        $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
    }
}
if (-not $npm) {
    throw 'Node.js and npm are missing. See README.md for setup steps.'
}

& $npm.Source run build
if ($LASTEXITCODE -ne 0) {
    throw 'Frontend build failed.'
}

$logOut = Join-Path $root 'backend/.venv/dev-server.out.log'
$logErr = Join-Path $root 'backend/.venv/dev-server.err.log'
$api = Start-Process -FilePath $python -ArgumentList @('backend/manage.py', 'runserver', '127.0.0.1:8000', '--noreload') -WorkingDirectory $root -WindowStyle Hidden -PassThru -RedirectStandardOutput $logOut -RedirectStandardError $logErr

try {
    Start-Sleep -Seconds 2
    if ($api.HasExited) {
        Get-Content $logErr -ErrorAction SilentlyContinue
        throw 'Django did not start.'
    }
    Write-Host 'Frontend preview: http://127.0.0.1:5175/'
    Write-Host 'API:      http://127.0.0.1:8000/api/'
    Write-Host 'Swagger:  http://127.0.0.1:8000/api/swagger/'
    Write-Host 'Press Ctrl+C to stop both servers.'
    & $npm.Source run preview -- --host 127.0.0.1
}
finally {
    if (-not $api.HasExited) { Stop-Process -Id $api.Id }
}
