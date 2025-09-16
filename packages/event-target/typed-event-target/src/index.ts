export type TypedEvent<TType extends string = string, TDetail = unknown> = Omit<
  CustomEvent<TDetail>,
  'detail' | 'type'
> & {
  type: TType;
  detail: TDetail;
};

export interface TypedEventListener<TEvent extends TypedEvent> {
  (evt: TEvent): void;
}

export interface TypedEventListenerObject<TEvent extends TypedEvent> {
  handleEvent(object: TEvent): void;
}

export type TypedEventListenerOrEventListenerObject<TEvent extends TypedEvent> =
  | TypedEventListener<TEvent>
  | TypedEventListenerObject<TEvent>;

export interface TypedEventTarget<TEvent extends TypedEvent> extends EventTarget {
  addEventListener<TCurrEvent extends TEvent>(
    type: TCurrEvent['type'],
    callback: TypedEventListenerOrEventListenerObject<TCurrEvent> | null,
    options?: AddEventListenerOptions | boolean,
  ): void;
  dispatchEvent(event: TEvent): boolean;
  removeEventListener<TCurrEvent extends TEvent>(
    type: TCurrEvent['type'],
    callback: TypedEventListenerOrEventListenerObject<TCurrEvent> | null,
    options?: EventListenerOptions | boolean,
  ): void;
}
