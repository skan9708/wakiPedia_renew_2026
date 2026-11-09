param(
    [Parameter(Mandatory = $true)]
    [string]$PemPath,
    [string]$Target = 'ubuntu@54.180.187.53',
    [string]$RemoteDist = '/home/ubuntu/waki/dist',
    [string]$SiteUrl = 'https://wakipedia.co.kr'
)

$ErrorActionPreference = 'Stop'
$distPath = Join-Path $PSScriptRoot 'dist'
$assetPath = Join-Path $distPath 'assets'
$indexPath = Join-Path $distPath 'index.html'

if (-not (Test-Path -LiteralPath $PemPath -PathType Leaf)) { throw 'SSH key not found.' }
if (-not (Test-Path -LiteralPath $indexPath -PathType Leaf)) { throw 'Build dist/index.html first.' }
if (-not (Test-Path -LiteralPath $assetPath -PathType Container)) { throw 'Build dist/assets first.' }

$indexHtml = Get-Content -LiteralPath $indexPath -Raw -Encoding UTF8
$referencedAssets = @([regex]::Matches($indexHtml, '/assets/([^"\s<>]+)') | ForEach-Object { $_.Groups[1].Value })
if ($referencedAssets.Count -eq 0) { throw 'No build assets found in dist/index.html.' }
foreach ($assetName in $referencedAssets) {
    if ($assetName -notmatch '^[A-Za-z0-9._-]+$') { throw "Unexpected asset name: $assetName" }
    if (-not (Test-Path -LiteralPath (Join-Path $assetPath $assetName) -PathType Leaf)) {
        throw "Referenced asset missing: $assetName"
    }
}

$remoteAssets = "$RemoteDist/assets"
& ssh -i $PemPath -o BatchMode=yes $Target "mkdir -p $remoteAssets && chmod 755 $remoteAssets"
if ($LASTEXITCODE -ne 0) { throw 'Could not prepare the remote assets directory.' }

# Upload files individually so scp cannot replace the remote directory mode.
foreach ($asset in Get-ChildItem -LiteralPath $assetPath -File) {
    & scp -i $PemPath -o BatchMode=yes $asset.FullName "${Target}:$remoteAssets/$($asset.Name)"
    if ($LASTEXITCODE -ne 0) { throw "Upload failed: $($asset.Name)" }
}

& ssh -i $PemPath -o BatchMode=yes $Target "chmod 755 $remoteAssets"
if ($LASTEXITCODE -ne 0) { throw 'Could not restore remote assets directory permissions.' }

foreach ($assetName in $referencedAssets) {
    & ssh -i $PemPath -o BatchMode=yes $Target "sudo -u www-data test -r $remoteAssets/$assetName"
    if ($LASTEXITCODE -ne 0) { throw "Web server cannot read: $assetName" }

    $expectedType = if ($assetName.EndsWith('.js')) { 'application/javascript' } else { 'text/css' }
    $headers = & ssh -i $PemPath -o BatchMode=yes $Target "curl -fsSI $SiteUrl/assets/$assetName"
    if ($LASTEXITCODE -ne 0 -or ($headers -join "`n") -notmatch "Content-Type: $expectedType") {
        throw "Public asset has the wrong response type: $assetName"
    }
}

# Switch the HTML only after every new asset is public and readable.
& scp -i $PemPath -o BatchMode=yes $indexPath "${Target}:$RemoteDist/index.html"
if ($LASTEXITCODE -ne 0) { throw 'HTML upload failed.' }

$liveHtml = & ssh -i $PemPath -o BatchMode=yes $Target "curl -fsS $SiteUrl/me"
if ($LASTEXITCODE -ne 0) { throw 'Live page is unavailable.' }
foreach ($assetName in $referencedAssets) {
    if (($liveHtml -join "`n") -notlike "*/assets/$assetName*") {
        throw "Live HTML does not reference: $assetName"
    }
}

Write-Host 'Frontend deployment verified.'
