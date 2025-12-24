import { Store } from './store';
import { Identity } from './types';

interface StoreData {
  // Object of fields identified by the field name + potentially args.
  readonly [identity: string]: {
    // Array of calls for a given field identity
    readonly [fieldIdentity: string]: readonly number[];
  };
}

class InMemoryStore implements Store {
  // The store is mutable.
  // tslint:disable-next-line readonly-keyword
  public state: StoreData = {};

  public setForIdentity(identity: Identity, timestamps: readonly number[]): void {
    // tslint:disable-next-line no-object-mutation
    this.state = {
      ...this.state,
      [identity.contextIdentity]: {
        ...this.state[identity.contextIdentity],
        [identity.fieldIdentity]: [...timestamps],
      },
    };
  }

  public getForIdentity(identity: Identity): readonly number[] {
    const ctxState = this.state[identity.contextIdentity];
    return (ctxState && ctxState[identity.fieldIdentity]) || [];
  }
}

export { InMemoryStore };
