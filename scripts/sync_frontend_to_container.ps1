param(
    [string]$ContainerName = "quantum-seo-app",
    [int]$PollIntervalMs = 750
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$fileMappings = @(
    @{
        LocalPath = Join-Path $repoRoot "frontend\index.html"
        RemotePath = "/app/index.html"
    },
    @{
        LocalPath = Join-Path $repoRoot "frontend\assets\styles.css"
        RemotePath = "/app/assets/styles.css"
    },
    @{
        LocalPath = Join-Path $repoRoot "frontend\assets\app.js"
        RemotePath = "/app/assets/app.js"
    }
)

function Copy-FrontendFile {
    param(
        [hashtable]$Mapping
    )

    if (-not (Test-Path -LiteralPath $Mapping.LocalPath)) {
        throw "Missing local file: $($Mapping.LocalPath)"
    }

    & docker cp $Mapping.LocalPath "${ContainerName}:$($Mapping.RemotePath)"

    if ($LASTEXITCODE -ne 0) {
        throw "docker cp failed for $($Mapping.LocalPath)"
    }

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] Synced $($Mapping.LocalPath) -> $($Mapping.RemotePath)"
}

function Get-FileStamp {
    param(
        [string]$Path
    )

    $item = Get-Item -LiteralPath $Path
    return "$($item.LastWriteTimeUtc.Ticks):$($item.Length)"
}

$trackedState = @{}

foreach ($mapping in $fileMappings) {
    Copy-FrontendFile -Mapping $mapping
    $trackedState[$mapping.LocalPath] = Get-FileStamp -Path $mapping.LocalPath
}

Write-Host "Watching frontend files for changes. Press Ctrl+C to stop."

while ($true) {
    foreach ($mapping in $fileMappings) {
        $nextStamp = Get-FileStamp -Path $mapping.LocalPath
        $currentStamp = $trackedState[$mapping.LocalPath]

        if ($nextStamp -ne $currentStamp) {
            Start-Sleep -Milliseconds 120
            Copy-FrontendFile -Mapping $mapping
            $trackedState[$mapping.LocalPath] = Get-FileStamp -Path $mapping.LocalPath
        }
    }

    Start-Sleep -Milliseconds $PollIntervalMs
}
