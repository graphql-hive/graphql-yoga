import { DocumentNode } from 'graphql';
import { PersistedOperationsStore } from '../types.js';

export class AggregatedStore implements PersistedOperationsStore {
  constructor(private stores: PersistedOperationsStore[]) {}

  get(operationId: string): string | DocumentNode | undefined {
    for (const store of this.stores) {
      const item = store.get(operationId);

      if (item) {
        return item;
      }
    }

    return undefined;
  }
}
