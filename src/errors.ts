export class PacklinkApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly responseBody: unknown,
  ) {
    super(message);
    this.name = 'PacklinkApiError';
  }
}

export class PacklinkAuthenticationError extends PacklinkApiError {
  constructor(message: string, responseBody: unknown) {
    super(message, 401, responseBody);
    this.name = 'PacklinkAuthenticationError';
  }
}

export class PacklinkResponseError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'PacklinkResponseError';
  }
}

export class PacklinkNetworkError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'PacklinkNetworkError';
  }
}

export class ShipmentDraftConfirmationError extends Error {
  constructor() {
    super('Creating a Packlink shipment draft requires confirmation: { confirm: "CREATE_SHIPMENT_DRAFT" }.');
    this.name = 'ShipmentDraftConfirmationError';
  }
}
