export interface GeocodingCandidate {
  providerId: string;
  name: string;
  admin1: string | null;
  admin2: string | null;
  country: string | null;
  countryCode: "SE";
  latitude: number;
  longitude: number;
  timezone: string | null;
}

export interface GeocodingSearchOptions {
  count?: number;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

export class GeocodingSearchError extends Error {
  readonly kind: "http" | "malformed" | "network" | "timeout";

  constructor(message = "Det gick inte att söka efter orten just nu.", kind: "http" | "malformed" | "network" | "timeout" = "network") {
    super(message);
    this.name = "GeocodingSearchError";
    this.kind = kind;
  }
}
