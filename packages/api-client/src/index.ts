import createClient from 'openapi-fetch';
import type { components, paths } from './schema';

export type Offering = components['schemas']['Offering'];
export type Meeting = components['schemas']['Meeting'];
export type Requirement = components['schemas']['Requirement'];
export type ExtraValue = components['schemas']['ExtraValue'];

export function catalogClient(baseUrl: string, fetch: typeof globalThis.fetch) {
  return createClient<paths>({ baseUrl, fetch });
}
