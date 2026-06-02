param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('Cloud', 'Server')]
  [string]$Mode,

  [Parameter(Mandatory = $true)]
  [string]$ProjectKey,

  [string]$Organization,

  [string]$ServerUrl
)

$ErrorActionPreference = 'Stop'

if ($Mode -eq 'Cloud' -and [string]::IsNullOrWhiteSpace($Organization)) {
  throw 'Cloud mode requires -Organization.'
}

if ($Mode -eq 'Server' -and [string]::IsNullOrWhiteSpace($ServerUrl)) {
  throw 'Server mode requires -ServerUrl.'
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Docker is not installed or is not available in PATH.'
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
  throw 'Docker Desktop is not running.'
}

if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
  throw 'Codex CLI is not installed or is not available in PATH.'
}

$secureToken = Read-Host 'SonarQube user token' -AsSecureString
$tokenPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)

try {
  $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($tokenPointer)
  if ([string]::IsNullOrWhiteSpace($token)) {
    throw 'The SonarQube token cannot be empty.'
  }

  [Environment]::SetEnvironmentVariable('SONARQUBE_TOKEN', $token, 'User')
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($tokenPointer)
}

[Environment]::SetEnvironmentVariable('SONARQUBE_PROJECT_KEY', $ProjectKey, 'User')
[Environment]::SetEnvironmentVariable('SONARQUBE_ORG', $null, 'User')
[Environment]::SetEnvironmentVariable('SONARQUBE_URL', $null, 'User')

if ($Mode -eq 'Cloud') {
  [Environment]::SetEnvironmentVariable('SONARQUBE_ORG', $Organization, 'User')
} else {
  [Environment]::SetEnvironmentVariable('SONARQUBE_URL', $ServerUrl, 'User')
}

$launcherPath = Join-Path $PSScriptRoot 'run-sonarqube-mcp.ps1'

codex mcp remove sonarqube 2>$null
codex mcp add sonarqube -- powershell -NoProfile -ExecutionPolicy Bypass -File $launcherPath

Write-Host 'SonarQube MCP configured. Restart Codex Desktop so the new MCP server is loaded.'
