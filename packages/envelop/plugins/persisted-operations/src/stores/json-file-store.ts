import { promises, readFileSync } from 'node:fs';
import type { DocumentNode } from 'graphql';
import type { PersistedOperationsStore } from '../types.js';

export type JsonFileStoreDataMap = Map<string, DocumentNode | string>;

export class JsonFileStore implements PersistedOperationsStore {
  private storeData: JsonFileStoreDataMap | null = null;

  get(operationId: string): string | DocumentNode | undefined {
    if (!this.storeData) {
      return undefined;
    }

    return this.storeData.get(operationId) || undefined;
  }

  public loadFromFileSync(path: string): void {
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    this.storeData = new Map(Object.entries(data));
  }

  public loadFromFile(path: string): Promise<void> {
    return promises.readFile(path, 'utf-8').then(data => {
      this.storeData = new Map(Object.entries(JSON.parse(data)));
    });
  }
}
