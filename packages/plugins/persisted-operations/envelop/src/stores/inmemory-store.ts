import { DocumentNode } from 'graphql';
import { PersistedOperationsStore } from '../types.js';

export type InMemoryStoreDataMap = Map<string, DocumentNode | string>;

export class InMemoryStore implements PersistedOperationsStore {
  private storeData: InMemoryStoreDataMap;

  constructor(options?: { initialData?: InMemoryStoreDataMap }) {
    this.storeData = options?.initialData ?? new Map();
  }

  get(operationId: string): string | DocumentNode | undefined {
    return this.storeData.get(operationId) || undefined;
  }

  public prime(operationId: string, document: string | DocumentNode): void {
    this.storeData.set(operationId, document);
  }

  public clear(operationId: string): void {
    this.storeData.delete(operationId);
  }
}
