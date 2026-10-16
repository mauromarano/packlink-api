# Security Policy

## Reporting a vulnerability

Please do not report security issues in public GitHub issues. Once private vulnerability reporting is enabled for this repository, use **Security → Report a vulnerability**. Until then, contact the repository maintainers privately through their GitHub profile.

For a security issue in Packlink's service or API key handling, contact Packlink PRO through the authenticated **Help and support → Technical Issues** channel.

## Credential handling

- Never commit API keys, `.env` files, customer data, or real shipment payloads.
- Store API keys in environment variables or a secret manager.
- Do not log authorization headers. Review response bodies before logging them.
- Use only read-only API calls for live credential checks.
