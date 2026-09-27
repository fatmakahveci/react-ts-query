# Security Policy

## Supported versions

Security updates are provided for the latest version on the default branch.
Older releases and unmaintained branches may not receive security fixes.

## Reporting a vulnerability

Please do not disclose security vulnerabilities in public issues, discussions,
or pull requests.

Report a vulnerability through this repository's
[private vulnerability reporting](https://github.com/fatmakahveci/react-ts-query/security/advisories/new).
If that option is unavailable, contact the repository owner through the
[GitHub profile](https://github.com/fatmakahveci) to arrange a private reporting
channel.

Include the affected component and version, reproduction steps, potential
impact, and any suggested mitigation. Remove credentials and personal data
from examples, logs and screenshots. Reports will be reviewed as promptly as
possible, and coordinated disclosure is appreciated.

## Security model

This is a single-process event application with public browsing and administrator-only mutations. All write endpoints enforce a randomly generated bearer key on the server. Keys are stored only in backend environment configuration and browser tab memory, never in URLs, frontend build variables or browser persistent storage. Use HTTPS outside localhost, keep `backend/.env` private, and rotate the administrator key after any suspected disclosure. No key means no write access.

The API checks request hosts and exact allowed origins, limits request size and frequency, refuses compressed request bodies, restricts cover images to the catalogue and applies Helmet response headers. The frontend host must also supply appropriate security headers; API headers do not protect a separately hosted HTML document.

Rate limits are held in process memory. Multiple instances require a shared limiter store and transactional database. The shared administrator key does not provide separate user identities or per-event ownership.

## Visitor data

Saved event IDs, personal plans, recently viewed event IDs, recent search terms and display preferences are stored in browser local storage under `react-events:visitor:*`. They are specific to that browser and device, do not authenticate visitors and do not grant management access. Clearing browser data removes these preferences. Administrator credentials are kept separately in tab memory.

Personal plans are not bookings or registrations. See the [visitor experience guide](docs/user-experience.md) for storage limits, sharing and calendar behaviour.

## Revoking administrator access

If an administrator key is exposed, generate a replacement and restart the API:

```bash
npm --prefix backend run setup:admin -- --rotate
```

Rotation takes effect after the API restarts and invalidates the old key. Signing out clears the key from the current browser tab; it does not revoke other copies.

See the [README](README.md#build-and-hosting) for deployment requirements and configuration.
