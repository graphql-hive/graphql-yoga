import { getMostSpecificState, withState } from '../src/plugin-with-state';

describe('pluginWithState', () => {
  const plugin = withState<any>(() => ({ hook: (...args: any[]) => args }));

  it('should work with an empty plugin', () => {
    const plugin = withState(() => ({}));
    expect(plugin).toEqual({});
  });

  it('should allow to have hooks without parameters', () => {
    expect(plugin.hook()).toEqual([]);
  });

  it('should allow to have attribute that are not function', () => {
    const plugin = withState<any>(() => ({ test: 'test' }));

    expect(plugin).toEqual({ test: 'test' });
  });

  it('should add state to first parameter only if it a plain object', () => {
    const objectPayload = new Date();
    expect(plugin.hook(objectPayload)[0]).toBe(objectPayload);
    expect(Object.hasOwn(objectPayload, 'state')).toBeFalsy();

    const arrayPayload: any[] = [];
    expect(plugin.hook(arrayPayload)[0]).toBe(arrayPayload);

    expect(plugin.hook('test')[0]).toBe('test');
    expect(plugin.hook(1)[0]).toBe(1);
    expect(plugin.hook(true)[0]).toBe(true);
    expect(plugin.hook(false)[0]).toBe(false);
  });

  it('should add request state', () => {
    expect(plugin.hook({ request: {} })).toMatchObject([{ state: { forRequest: {} } }]);
  });

  it('should add operation state', () => {
    expect(plugin.hook({ context: {} })).toMatchObject([{ state: { forOperation: {} } }]);
  });

  it('should add subgraph execution state', () => {
    expect(plugin.hook({ executionRequest: {} })).toMatchObject([
      { state: { forSubgraphExecution: {} } },
    ]);
  });

  it('should combine all states', () => {
    expect(plugin.hook({ context: {}, request: {} })).toMatchObject([
      { state: { forOperation: {}, forRequest: {} } },
    ]);
    expect(plugin.hook({ context: {}, executionRequest: {} })).toMatchObject([
      { state: { forOperation: {}, forSubgraphExecution: {} } },
    ]);

    expect(plugin.hook({ executionRequest: {}, request: {} })).toMatchObject([
      { state: { forSubgraphExecution: {}, forRequest: {} } },
    ]);

    expect(plugin.hook({ executionRequest: {}, request: {}, context: {} })).toMatchObject([
      { state: { forSubgraphExecution: {}, forRequest: {}, forOperation: {} } },
    ]);
  });

  it('should have a stable state', () => {
    const refs = { request: {}, context: {}, executionRequest: {} };
    const { forRequest, forOperation, forSubgraphExecution } = plugin.hook(refs);

    expect(plugin.hook(refs)[0].forRequest).toBe(forRequest);
    expect(plugin.hook(refs)[0].forOperation).toBe(forOperation);
    expect(plugin.hook(refs)[0].forSubgraphExecution).toBe(forSubgraphExecution);

    expect(plugin.hook({ request: refs.request })[0].forRequest).toBe(forRequest);
    expect(plugin.hook({ context: refs.context })[0].forOperation).toBe(forOperation);
    expect(plugin.hook({ executionRequest: refs.executionRequest })[0].forSubgraphExecution).toBe(
      forSubgraphExecution,
    );
  });

  it('should allow to have getters and setters', () => {
    const called = { getter: false, setter: false };
    const plugin = withState<{ value: string; instrumentation?: never }>(() => ({
      get value() {
        called.getter = true;
        return 'test';
      },
      set value(value) {
        called.setter = true;
        expect(value).toBe('value');
      },
    }));

    plugin.value = 'value';
    expect(plugin.value).toBe('test');
    expect(called).toEqual({ getter: true, setter: true });
  });

  it('should allow to have not enumerable', () => {
    const plugin = {};
    Object.defineProperty(plugin, 'hidden', { value: 'test' });

    const pluginWithState = withState(() => plugin);
    // @ts-expect-error
    expect(pluginWithState['hidden']).toBe('test');
    expect(Object.keys(plugin)).toEqual([]);
  });

  describe('instrumentation', () => {
    const plugin = withState(() => ({
      instrumentation: { hook: (...args: any[]): any => args },
    }));

    it('should add request state', () => {
      expect(plugin.instrumentation.hook({ request: {} })).toMatchObject([
        { state: { forRequest: {} } },
      ]);
    });

    it('should add operation state', () => {
      expect(plugin.instrumentation.hook({ context: {} })).toMatchObject([
        { state: { forOperation: {} } },
      ]);
    });

    it('should add subgraph execution state', () => {
      expect(plugin.instrumentation.hook({ executionRequest: {} })).toMatchObject([
        { state: { forSubgraphExecution: {} } },
      ]);
    });

    it('should combine all states', () => {
      expect(plugin.instrumentation.hook({ context: {}, request: {} })).toMatchObject([
        { state: { forOperation: {}, forRequest: {} } },
      ]);
      expect(plugin.instrumentation.hook({ context: {}, executionRequest: {} })).toMatchObject([
        { state: { forOperation: {}, forSubgraphExecution: {} } },
      ]);

      expect(plugin.instrumentation.hook({ executionRequest: {}, request: {} })).toMatchObject([
        { state: { forSubgraphExecution: {}, forRequest: {} } },
      ]);

      expect(
        plugin.instrumentation.hook({
          executionRequest: {},
          request: {},
          context: {},
        }),
      ).toMatchObject([
        {
          state: { forSubgraphExecution: {}, forRequest: {}, forOperation: {} },
        },
      ]);
    });

    it('should have a stable state', () => {
      const refs = { request: {}, context: {}, executionRequest: {} };
      const { forRequest, forOperation, forSubgraphExecution } = plugin.instrumentation.hook(refs);

      expect(plugin.instrumentation.hook(refs)[0].forRequest).toBe(forRequest);
      expect(plugin.instrumentation.hook(refs)[0].forOperation).toBe(forOperation);
      expect(plugin.instrumentation.hook(refs)[0].forSubgraphExecution).toBe(forSubgraphExecution);

      expect(plugin.instrumentation.hook({ request: refs.request })[0].forRequest).toBe(forRequest);
      expect(plugin.instrumentation.hook({ context: refs.context })[0].forOperation).toBe(
        forOperation,
      );
      expect(
        plugin.instrumentation.hook({
          executionRequest: refs.executionRequest,
        })[0].forSubgraphExecution,
      ).toBe(forSubgraphExecution);
    });
  });

  describe('getState', () => {
    let getState: (p: any) => any;
    withState(_getState => {
      getState = _getState;
      return {};
    });

    it('should add request state', () => {
      expect(getState({ request: {} })).toMatchObject({ forRequest: {} });
    });

    it('should add operation state', () => {
      expect(getState({ context: {} })).toMatchObject({ forOperation: {} });
    });

    it('should add subgraph execution state', () => {
      expect(getState({ executionRequest: {} })).toMatchObject({
        forSubgraphExecution: {},
      });
    });

    it('should combine all states', () => {
      expect(getState({ context: {}, request: {} })).toMatchObject({
        forOperation: {},
        forRequest: {},
      });
      expect(getState({ context: {}, executionRequest: {} })).toMatchObject({
        forOperation: {},
        forSubgraphExecution: {},
      });

      expect(getState({ executionRequest: {}, request: {} })).toMatchObject({
        forSubgraphExecution: {},
        forRequest: {},
      });

      expect(getState({ executionRequest: {}, request: {}, context: {} })).toMatchObject({
        forSubgraphExecution: {},
        forRequest: {},
        forOperation: {},
      });
    });

    it('should have a stable state', () => {
      const refs = { request: {}, context: {}, executionRequest: {} };
      const { forRequest, forOperation, forSubgraphExecution } = getState(refs);

      expect(getState(refs).forRequest).toBe(forRequest);
      expect(getState(refs).forOperation).toBe(forOperation);
      expect(getState(refs).forSubgraphExecution).toBe(forSubgraphExecution);

      expect(getState({ request: refs.request }).forRequest).toBe(forRequest);
      expect(getState({ context: refs.context }).forOperation).toBe(forOperation);
      expect(getState({ executionRequest: refs.executionRequest }).forSubgraphExecution).toBe(
        forSubgraphExecution,
      );
    });
  });

  describe('getMostSpecificState', () => {
    it('should return the most specific state', () => {
      const forRequest = {};
      const forOperation = {};
      const forSubgraphExecution = {};

      expect(getMostSpecificState({ forRequest })).toBe(forRequest);
      expect(getMostSpecificState({ forOperation })).toBe(forOperation);
      expect(getMostSpecificState({ forSubgraphExecution })).toBe(forSubgraphExecution);

      expect(getMostSpecificState({ forRequest, forOperation })).toBe(forOperation);
      expect(getMostSpecificState({ forRequest, forSubgraphExecution })).toBe(forSubgraphExecution);

      expect(getMostSpecificState({ forOperation, forSubgraphExecution })).toBe(
        forSubgraphExecution,
      );

      expect(
        getMostSpecificState({
          forOperation,
          forRequest,
          forSubgraphExecution,
        }),
      ).toBe(forSubgraphExecution);
    });
  });
});
