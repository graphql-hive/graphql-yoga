export type OptionalPropertyNames<T> = {
  [K in keyof T]-?: {} extends { [P in K]: T[K] } ? K : never;
}[keyof T];

export type SpreadProperties<L, R, K extends keyof L & keyof R> = {
  [P in K]: L[P] | Exclude<R[P], undefined>;
};

/** @deprecated Because it can cause https://github.com/graphql-hive/envelop/issues/1120. */
export type Id<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

export type SpreadTwo<L, R> = Pick<L, Exclude<keyof L, keyof R>> &
  Pick<R, Exclude<keyof R, OptionalPropertyNames<R>>> &
  Pick<R, Exclude<OptionalPropertyNames<R>, keyof L>> &
  SpreadProperties<L, R, OptionalPropertyNames<R> & keyof L>;

export type Spread<A extends readonly [...any]> = A extends [infer L, ...infer R]
  ? SpreadTwo<L, Spread<R>>
  : {};

export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

export type LastOf<T> =
  UnionToIntersection<T extends any ? () => T : never> extends () => infer R ? R : never;

export type Push<T extends any[], V> = [...T, V];

export type TuplifyUnion<T, L = LastOf<T>, N = [T] extends [never] ? true : false> = true extends N
  ? []
  : Push<TuplifyUnion<Exclude<T, L>>, L>;

export type Unarray<T> = T extends Array<infer U> ? U : T;

export type ArbitraryObject = Record<string | number | symbol, any>;
export { type MaybePromise as PromiseOrValue } from '@whatwg-node/promise-helpers';
export type AsyncIterableIteratorOrValue<T> = T | AsyncIterableIterator<T>;
export type Maybe<T> = T | null | undefined;
export type Optional<T> = T | Maybe<T> | false;
export interface ObjMap<T> {
  [key: string]: T;
}
export type ObjMapLike<T> =
  | ObjMap<T>
  | {
      [key: string]: T;
    };
export interface ReadOnlyObjMap<T> {
  readonly [key: string]: T;
}
export type ReadOnlyObjMapLike<T> =
  | ReadOnlyObjMap<T>
  | {
      readonly [key: string]: T;
    };
