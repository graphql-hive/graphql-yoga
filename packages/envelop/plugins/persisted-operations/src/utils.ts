import { Source } from 'graphql';

export function operationIdFromSource(source: string | Source): string | undefined {
  return typeof source === 'string' && source.length && !source.includes('{') ? source : undefined;
}
