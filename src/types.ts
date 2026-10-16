export interface PacklinkClientOptions {
  apiKey: string;
  /** Defaults to the Packlink API host observed in official ecommerce modules. */
  baseUrl?: string;
  timeoutMs?: number;
  /** Optional integration metadata headers used by official modules. */
  moduleVersion?: string;
  ecommerceName?: string;
  ecommerceVersion?: string;
  fetch?: typeof fetch;
}

export interface PacklinkRequestOptions {
  signal?: AbortSignal;
}

export interface PackageDimensions {
  height: number;
  width: number;
  length: number;
  weight: number;
}

export interface ServiceSearch {
  fromCountry: string;
  fromZip: string;
  toCountry: string;
  toZip: string;
  packages: PackageDimensions[];
  serviceId?: string | number;
  /** The official ecommerce core sends its integration source; default is PRO. */
  source?: string;
}

/** Packlink draft schema evolves; callers may pass additional fields supported by their account. */
export type ShipmentDraft = Record<string, unknown>;

export interface ShipmentDraftResult {
  reference: string;
  raw: unknown;
}
