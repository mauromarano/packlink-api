import {
  PacklinkApiError,
  PacklinkAuthenticationError,
  PacklinkNetworkError,
  PacklinkResponseError,
  ShipmentDraftConfirmationError,
} from './errors.js';
import type {
  PacklinkClientOptions,
  PacklinkRequestOptions,
  ServiceSearch,
  ShipmentDraft,
  ShipmentDraftResult,
} from './types.js';

const DEFAULT_BASE_URL = 'https://api.packlink.com/v1/';
const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Client for Packlink PRO endpoints observed in the official ecommerce module core.
 * These endpoints are implementation evidence and are not a public API guarantee.
 */
export class PacklinkClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(private readonly options: PacklinkClientOptions) {
    if (!options.apiKey.trim()) throw new TypeError('Packlink apiKey must not be empty.');
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '') + '/';
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /** Read-only: returns the account's warehouses. */
  getWarehouses(request?: PacklinkRequestOptions): Promise<unknown> {
    return this.request('clients/warehouses', { signal: request?.signal });
  }

  /** Read-only: returns parcel presets associated with the account. */
  getParcels(request?: PacklinkRequestOptions): Promise<unknown> {
    return this.request('users/parcels', { signal: request?.signal });
  }

  /** Read-only: searches available shipping services and prices. */
  searchServices(search: ServiceSearch, request?: PacklinkRequestOptions): Promise<unknown> {
    validateSearch(search);
    const query = new URLSearchParams();
    query.set('from[country]', search.fromCountry);
    query.set('from[zip]', search.fromZip);
    query.set('to[country]', search.toCountry);
    query.set('to[zip]', search.toZip);
    query.set('source', search.source ?? 'PRO');
    if (search.serviceId !== undefined) query.set('serviceId', String(search.serviceId));
    search.packages.forEach((parcel, index) => {
      query.set(`packages[${index}][height]`, String(Math.ceil(parcel.height)));
      query.set(`packages[${index}][width]`, String(Math.ceil(parcel.width)));
      query.set(`packages[${index}][length]`, String(Math.ceil(parcel.length)));
      query.set(`packages[${index}][weight]`, String(parcel.weight));
    });
    return this.request(`services?${query.toString()}`, { signal: request?.signal });
  }

  /** Read-only: gets one shipment by Packlink reference; returns null when not found. */
  async getShipment(reference: string, request?: PacklinkRequestOptions): Promise<unknown | null> {
    return this.getShipmentResource(reference, '', request);
  }

  /** Read-only: retrieves labels already associated with a shipment. */
  async getLabels(reference: string, request?: PacklinkRequestOptions): Promise<unknown | null> {
    return this.getShipmentResource(reference, '/labels', request);
  }

  /** Read-only: retrieves shipment tracking events. */
  async getTracking(reference: string, request?: PacklinkRequestOptions): Promise<unknown | null> {
    return this.getShipmentResource(reference, '/track', request);
  }

  /**
   * Creates a shipment draft in Packlink (POST /v1/shipments).
   * This changes account state. It never runs without the explicit confirmation token.
   */
  async createShipmentDraft(
    draft: ShipmentDraft,
    confirmation: { confirm: 'CREATE_SHIPMENT_DRAFT' },
    request?: PacklinkRequestOptions,
  ): Promise<ShipmentDraftResult> {
    if (confirmation?.confirm !== 'CREATE_SHIPMENT_DRAFT') throw new ShipmentDraftConfirmationError();
    const raw = await this.request('shipments', {
      method: 'POST',
      body: draft,
      signal: request?.signal,
    });
    if (!isRecord(raw) || typeof raw.reference !== 'string' || !raw.reference) {
      throw new PacklinkResponseError('Packlink did not return a shipment draft reference.');
    }
    return { reference: raw.reference, raw };
  }

  private async getShipmentResource(
    reference: string,
    suffix: string,
    request?: PacklinkRequestOptions,
  ): Promise<unknown | null> {
    if (!reference.trim()) throw new TypeError('Shipment reference must not be empty.');
    try {
      return await this.request(`shipments/${encodeURIComponent(reference)}${suffix}`, { signal: request?.signal });
    } catch (error) {
      if (error instanceof PacklinkApiError && error.status === 404) return null;
      throw error;
    }
  }

  private async request(
    path: string,
    init: { method?: 'GET' | 'POST'; body?: unknown; signal?: AbortSignal | undefined },
  ): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const onAbort = () => controller.abort();
    init.signal?.addEventListener('abort', onAbort, { once: true });
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      // Official module core passes its stored API key verbatim, without a Bearer prefix.
      Authorization: this.options.apiKey,
    };
    if (this.options.moduleVersion) headers['X-Module-Version'] = this.options.moduleVersion;
    if (this.options.ecommerceName) headers['X-Ecommerce-Name'] = this.options.ecommerceName;
    if (this.options.ecommerceVersion) headers['X-Ecommerce-Version'] = this.options.ecommerceVersion;

    try {
      let response: Response;
      try {
        response = await this.fetchImpl(new URL(path, this.baseUrl), {
          method: init.method ?? 'GET',
          headers,
          ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
          signal: controller.signal,
        });
      } catch (error) {
        throw new PacklinkNetworkError('Could not communicate with Packlink.', error);
      }

      const text = await response.text();
      let data: unknown = null;
      if (text) {
        try {
          data = JSON.parse(text) as unknown;
        } catch (error) {
          if (response.ok) throw new PacklinkResponseError('Packlink returned invalid JSON.', error);
          data = text;
        }
      }
      if (!response.ok) {
        const message = errorMessage(data) ?? `Packlink returned HTTP ${response.status}.`;
        if (response.status === 401) throw new PacklinkAuthenticationError(message, data);
        throw new PacklinkApiError(message, response.status, data);
      }
      return data;
    } finally {
      clearTimeout(timeout);
      init.signal?.removeEventListener('abort', onAbort);
    }
  }
}

function validateSearch(search: ServiceSearch): void {
  for (const [label, value] of [
    ['fromCountry', search.fromCountry],
    ['fromZip', search.fromZip],
    ['toCountry', search.toCountry],
    ['toZip', search.toZip],
  ] as const) {
    if (!value.trim()) throw new TypeError(`${label} must not be empty.`);
  }
  if (!search.packages.length) throw new TypeError('At least one package is required.');
  for (const parcel of search.packages) {
    for (const key of ['height', 'width', 'length', 'weight'] as const) {
      if (!Number.isFinite(parcel[key]) || parcel[key] <= 0) {
        throw new TypeError(`Package ${key} must be a positive number.`);
      }
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function errorMessage(data: unknown): string | undefined {
  if (!isRecord(data)) return undefined;
  if (typeof data.message === 'string') return data.message;
  if (Array.isArray(data.messages)) {
    const messages = data.messages
      .map((item) => isRecord(item) && typeof item.message === 'string' ? item.message : undefined)
      .filter((message): message is string => Boolean(message));
    if (messages.length) return messages.join('\n');
  }
  return undefined;
}
