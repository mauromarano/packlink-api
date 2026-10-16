# API Reference

This reference documents behavior implemented by this client from Packlink's official ecommerce integration core. Packlink has not published a complete public REST specification in the sources reviewed. Endpoint behavior, response shapes, and custom integration access may change; confirm support with Packlink before production use.

## Base URL and authentication

The observed default base URL is:

```text
https://api.packlink.com/v1/
```

The official integration core sends the stored API key as the full `Authorization` header value, without adding `Bearer`:

```http
Authorization: <PACKLINK_API_KEY>
Accept: application/json
Content-Type: application/json
```

Optional headers used by the official ecommerce modules can be supplied through `moduleVersion`, `ecommerceName`, and `ecommerceVersion`; they are sent as `X-Module-Version`, `X-Ecommerce-Name`, and `X-Ecommerce-Version`.

The client uses Node.js `fetch`, defaults to a 15-second timeout, and supports `AbortSignal` on every operation. It does not retry requests. Response bodies are returned as `unknown` because no stable public response schema was found.

## Endpoint summary

| Client method | HTTP request | Effect |
| --- | --- | --- |
| `getWarehouses()` | `GET /v1/clients/warehouses` | Read account warehouses |
| `getParcels()` | `GET /v1/users/parcels` | Read account parcel presets |
| `searchServices(search)` | `GET /v1/services?...` | Read available services/prices |
| `getShipment(reference)` | `GET /v1/shipments/{reference}` | Read shipment |
| `getLabels(reference)` | `GET /v1/shipments/{reference}/labels` | Read shipment labels |
| `getTracking(reference)` | `GET /v1/shipments/{reference}/track` | Read tracking events |
| `createShipmentDraft(draft, confirmation)` | `POST /v1/shipments` | **Creates a draft in the account** |

There are no pagination parameters or semantics implemented because none were established in the source reviewed. Shipment lookup methods return `null` on HTTP 404. Other non-success responses throw an error.

## Client method examples

The examples below assume `client` is an initialized `PacklinkClient` and use response values as `unknown`, since the public sources do not define stable response types.

### `getWarehouses()`

Read the warehouses configured for the account:

```ts
const warehouses = await client.getWarehouses();
```

### `getParcels()`

Read the parcel presets configured for the account:

```ts
const parcels = await client.getParcels();
```

### `searchServices(search)`

Search rates for a parcel and route. Dimensions in this example are centimetres:

```ts
const services = await client.searchServices({
  fromCountry: 'IT',
  fromZip: '87036',
  toCountry: 'IT',
  toZip: '40121',
  packages: [{ height: 15, width: 20, length: 30, weight: 5 }],
});
```

### `getShipment(reference)`

Read a shipment by its Packlink reference. The result is `null` if it was not found:

```ts
const shipment = await client.getShipment('PACKLINK_SHIPMENT_REFERENCE');
```

### `getLabels(reference)`

Read label metadata or links already associated with a shipment:

```ts
const labels = await client.getLabels('PACKLINK_SHIPMENT_REFERENCE');
```

### `getTracking(reference)`

Read tracking events for a shipment:

```ts
const tracking = await client.getTracking('PACKLINK_SHIPMENT_REFERENCE');
```

### `createShipmentDraft(draft, confirmation)`

Create a draft in the Packlink account. `draftPayload` must contain a valid payload for the integration flow. This is the only state-changing method in the client and requires explicit confirmation:

```ts
const createdDraft = await client.createShipmentDraft(draftPayload, {
  confirm: 'CREATE_SHIPMENT_DRAFT',
});
```

Do not call this example as a test against a live account. See [Create a shipment draft](#create-a-shipment-draft) for its behavior and limitations.

## Search services

The query uses the following keys, encoded by `URLSearchParams`:

| Query key | Value |
| --- | --- |
| `from[country]` | Two-letter origin country code |
| `from[zip]` | Origin postal code |
| `to[country]` | Two-letter destination country code |
| `to[zip]` | Destination postal code |
| `source` | Integration source, default `PRO` |
| `serviceId` | Optional service identifier |
| `packages[i][height]` | Package height, rounded up to an integer |
| `packages[i][width]` | Package width, rounded up to an integer |
| `packages[i][length]` | Package length, rounded up to an integer |
| `packages[i][weight]` | Package weight |

The official Shopify integration guide specifies dimensions in centimetres. Confirm units and accepted country/postal formats for the Packlink account and destination. The client validates that address fields are non-empty, at least one package is supplied, and all dimensions and weights are positive finite numbers.

## Shipment reads

Pass a Packlink shipment reference to `getShipment`, `getLabels`, or `getTracking`. These methods make GET requests and return Packlink's decoded JSON response. A 404 is returned as `null` for each method.

Retrieving a label link is not the same as purchasing a shipment or label. The client does not download label files.

## Create a shipment draft

`createShipmentDraft` performs `POST /v1/shipments` with the supplied JSON payload. The official integration core expects a draft payload with fields such as platform, origin/destination, selected service, package data, and optional customs/additional data; required fields vary by flow and are not frozen here because there is no public OpenAPI schema.

It returns `{ reference, raw }` when the response includes a reference. Calling this method creates a draft in the account. Official integration guides describe completing payment from the Packlink PRO account, but that does not guarantee the behavior of every account or future API version. Verify the operation and any economic effects with Packlink. This method is intentionally excluded from all live credential checks in this repository.

## Errors

| Error | Meaning |
| --- | --- |
| `PacklinkAuthenticationError` | Packlink returned HTTP 401 |
| `PacklinkApiError` | Packlink returned another non-2xx status; includes `status` and `responseBody` |
| `PacklinkNetworkError` | Fetch could not communicate with the endpoint |
| `PacklinkResponseError` | Response was not valid JSON or draft response lacked a reference |
| `ShipmentDraftConfirmationError` | Explicit draft confirmation was not supplied at runtime |

Do not log credentials. Review API response bodies before logging because they may contain account or shipment data.

## Questions for Packlink

Before building a production integration, ask Packlink PRO support:

- Can an API key from the account settings be used by a custom application outside the listed ecommerce integrations?
- Is there current supported REST/OpenAPI documentation, and which endpoints are supported?
- Is there a sandbox and how can test credentials be obtained?
- What operations create drafts versus confirm or purchase a shipment, label, or pickup?
- What are the API key permissions, rate limits, webhook options, geographic coverage, and data retention requirements?

Use the authenticated **Help and support → Technical Issues** channel in the Packlink PRO account for integration questions.
