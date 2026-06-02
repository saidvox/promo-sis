$ErrorActionPreference = 'Stop'

function Get-UserEnvironmentVariable {
  param([Parameter(Mandatory = $true)][string]$Name)

  $value = [Environment]::GetEnvironmentVariable($Name, 'User')
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Missing user environment variable: $Name. Run scripts/setup-sonarqube-mcp.ps1 first."
  }

  return $value
}

$token = Get-UserEnvironmentVariable 'SONARQUBE_TOKEN'
$projectKey = Get-UserEnvironmentVariable 'SONARQUBE_PROJECT_KEY'
$organization = [Environment]::GetEnvironmentVariable('SONARQUBE_ORG', 'User')
$serverUrl = [Environment]::GetEnvironmentVariable('SONARQUBE_URL', 'User')

$dockerArgs = @(
  'run',
  '--init',
  '--pull=always',
  '--rm',
  '-i',
  '-e', 'SONARQUBE_TOKEN',
  '-e', 'SONARQUBE_PROJECT_KEY'
)

if (-not [string]::IsNullOrWhiteSpace($organization)) {
  $dockerArgs += @('-e', 'SONARQUBE_ORG')
}

if (-not [string]::IsNullOrWhiteSpace($serverUrl)) {
  $dockerArgs += @('-e', 'SONARQUBE_URL')
}

$dockerArgs += 'mcp/sonarqube'

$env:SONARQUBE_TOKEN = $token
$env:SONARQUBE_PROJECT_KEY = $projectKey

if (-not [string]::IsNullOrWhiteSpace($organization)) {
  $env:SONARQUBE_ORG = $organization
}

if (-not [string]::IsNullOrWhiteSpace($serverUrl)) {
  $env:SONARQUBE_URL = $serverUrl
}

& docker @dockerArgs
exit $LASTEXITCODE
