# SonarQube MCP setup

This project includes a local launcher for the official SonarQube MCP Server.
The launcher uses the `mcp/sonarqube` Docker image and reads credentials from
Windows user environment variables. Tokens are not stored in Git or in
`~/.codex/config.toml`.

## Requirements

- Docker Desktop running.
- Codex CLI available in `PATH`.
- A SonarQube user token.
- The SonarQube project key.

## SonarQube Cloud

Run:

```powershell
.\scripts\setup-sonarqube-mcp.ps1 `
  -Mode Cloud `
  -Organization '<organization-key>' `
  -ProjectKey '<project-key>'
```

## SonarQube Server

Run:

```powershell
.\scripts\setup-sonarqube-mcp.ps1 `
  -Mode Server `
  -ServerUrl 'https://sonarqube.example.com' `
  -ProjectKey '<project-key>'
```

The installer prompts for the token securely, stores it as a Windows user
environment variable, and registers the `sonarqube` MCP server with Codex.

Restart Codex Desktop after setup. On the next session, verify the connection
with:

```powershell
codex mcp get sonarqube
```

## Files

- `scripts/setup-sonarqube-mcp.ps1`: configures local credentials and Codex.
- `scripts/run-sonarqube-mcp.ps1`: launches the official Docker container.

## Security

Do not add SonarQube tokens to `.env`, `.env.local`, shell history, commits, or
chat messages. Rotate the token immediately if it is accidentally exposed.
