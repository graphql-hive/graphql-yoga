import { DocumentNode } from 'graphql';
import { DefaultContext } from '@envelop/core';

export interface PersistedOperationsStore {
  /**
   * Transfroms a hash/id into a DocumentNode or SDL string.
   * Prefer returning `DocumentNode` if available to avoid additional parsing phase.
   * Return `null` in case of a store miss.
   * @param operationId
   */
  get(operationId: string): string | DocumentNode | undefined;
}

export type PersistedOperationsFunctionStore<ContextType = DefaultContext> = (
  context: Readonly<ContextType>,
) => PersistedOperationsStore;
