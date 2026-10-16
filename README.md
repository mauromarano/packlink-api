# Packlink PRO API Client

An independent TypeScript client for Packlink PRO endpoints observed in Packlink's official ecommerce integration modules.

> **API support notice:** Packlink's public help center explains how to create an API key for its listed integrations, but does not publish a complete REST API specification or confirm that custom applications are supported. The routes in this project are implementation evidence from the official modules, not a guarantee of a stable or supported public API. Confirm custom API access with Packlink before relying on this client in production.

## Features

- Read account warehouses and parcel presets.
- Search shipping services and prices.
- Retrieve a shipment, its labels, and tracking events.
- Create a shipment draft through an explicitly confirmed method.
- Use the built-in Node.js `fetch`; no runtime dependencies.
- Typed request inputs, configurable timeout, `AbortSignal`, and structured HTTP errors.

See the [endpoint reference](docs/API.md) for routes, parameters, authentication, and limitations.

## Requirements

- Node.js 20 or later.
- A Packlink PRO API key with access to the endpoint you intend to call.

## Build from source

```sh
git clone <your-github-repository-url>
cd packlink-api-client
npm ci
npm run build
```

## Usage

Keep the API key in an environment variable or secret manager. Never commit credentials or include them in logs.

```sh
export API_KEY="your-packlink-api-key"
```

```ts
import { PacklinkClient } from './dist/index.js';

const packlink = new PacklinkClient({ apiKey: process.env.API_KEY! });

const warehouses = await packlink.getWarehouses();

const services = await packlink.searchServices({
  fromCountry: 'IT',
  fromZip: '20100',
  toCountry: 'IT',
  toZip: '00100',
  packages: [{ height: 10, width: 20, length: 30, weight: 2 }],
});
```

The client returns Packlink's JSON response as `unknown`, because the public sources do not define stable response schemas. Validate and narrow response data in the calling application.

## Read and write operations

`getWarehouses`, `getParcels`, `searchServices`, `getShipment`, `getLabels`, and `getTracking` make GET requests. The shipment methods return `null` when Packlink responds with 404.

`createShipmentDraft` sends `POST /v1/shipments`, which creates a draft in the Packlink account. It requires the explicit confirmation object `{ confirm: 'CREATE_SHIPMENT_DRAFT' }`. A draft is not documented as a purchased shipment by the integration modules; those modules direct merchants to complete shipment payment in their Packlink PRO account. The method has not been called against a live account as part of this project. Do not treat creating a draft as a no-effect operation, and verify its current behavior with Packlink. This client does not implement purchase, payment, cancellation, pickup, or webhook management.

```ts
const created = await packlink.createShipmentDraft(draftPayload, {
  confirm: 'CREATE_SHIPMENT_DRAFT',
});
console.log(created.reference);
```

## Authentication and errors

The official ecommerce core sends the API key verbatim in `Authorization` (without a `Bearer` prefix). The client follows that observed behavior and sends `Accept: application/json` and `Content-Type: application/json`. Optional ecommerce metadata headers can be set through `PacklinkClientOptions`.

HTTP errors are raised as `PacklinkApiError`, with `status` and `responseBody`. HTTP 401 uses `PacklinkAuthenticationError`; network and invalid-response failures use `PacklinkNetworkError` and `PacklinkResponseError`. Do not log response bodies without reviewing them for account data.

## Configuration

```ts
const packlink = new PacklinkClient({
  apiKey: process.env.API_KEY!,
  timeoutMs: 15_000, // default
  // Optional overrides for authorized environments and isolated tests:
  // baseUrl: 'https://api.packlink.com/v1/',
  // fetch: customFetch,
  // moduleVersion: '1.0.0',
  // ecommerceName: 'My integration',
  // ecommerceVersion: '1.0.0',
});
```

## Evidence and source repositories

The implementation was checked against Packlink's official [`ecommerce_module_core`](https://github.com/packlink-dev/ecommerce_module_core), branch `master`, commit `a4f73974a5c3871b60cc7fcb03b52c6732736a52` (checked 2026-10-16). The core's `src/BusinessLogic/Http/Proxy.php` defines the API host, version prefix, authorization header, and calls for service search, draft creation, shipment details, labels, and tracking. `ShippingServiceSearch.php` builds the service query parameters; `DTO/Draft.php` describes the draft payload.

Other official modules reviewed on branch `master`:

| Repository | Commit |
| --- | --- |
| [`woocommerce_module`](https://github.com/packlink-dev/woocommerce_module) | `ca65c58fd95b87c1faa190cdb5948a85aef6e6bb` |
| [`prestashop_module`](https://github.com/packlink-dev/prestashop_module) | `3c843a9cdb44b687b402a513d1bd6917c285745e` |
| [`magento2_module`](https://github.com/packlink-dev/magento2_module) | `94e8fd8fefe8d00c1ff69604e30350a4d92d02ce` |
| [`shopware_module`](https://github.com/packlink-dev/shopware_module) | `ad86efe842bbf0b007b213a333861d820194ee03` |

Packlink's official [API key guide](https://support-pro.packlink.com/hc/it/articles/213431749-Come-genero-una-API-key-su-Packlink-PRO) describes keys for available integrations. Its [WooCommerce](https://support-pro.packlink.com/hc/it/articles/210158585-WooCommerce-e-Packlink-PRO) and [PrestaShop](https://support-pro.packlink.com/hc/it/articles/209433569-PrestaShop-e-Packlink-PRO) guides say imported paid orders appear in Packlink PRO and merchants complete shipment payment there. The [Shopify guide](https://support-pro.packlink.com/hc/en-gb/articles/360013417480-Shopify-and-Packlink-PRO) describes creating and managing shipment drafts in the PRO dashboard.

The public sources reviewed do not establish custom-client authorization, a supported sandbox, rate limits, stable response schemas, pagination, retry policy, or API coverage for buying, paying, cancelling, pickups, and webhooks. See [questions to confirm with Packlink](docs/API.md#questions-for-packlink).

## Development

```sh
npm ci
npm run build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. No live account or credentials are needed to build the project.

## License

MIT. See [LICENSE](LICENSE).
