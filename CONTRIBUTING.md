# Contributing

Thanks for helping improve the Packlink PRO API client.

## Before opening a pull request

- Keep credentials, customer data, and shipment payloads out of commits, fixtures, and logs.
- Do not add live-account checks that create drafts, purchase shipments, generate labels, schedule pickups, or change account settings.
- Keep endpoint claims tied to official Packlink sources and label observed implementation behavior separately from supported public API behavior.
- Update the English endpoint reference and README when the client surface changes.
- Keep runtime dependencies at zero unless a dependency is needed and justified.

## Local checks

```sh
npm ci
npm run build
```

The build does not require Packlink credentials or make network requests. Do not use real account data for local verification.

## Pull request description

Explain the user-visible change, the Packlink source supporting any endpoint change, and the checks you ran. Call out any operation that changes Packlink account state.
