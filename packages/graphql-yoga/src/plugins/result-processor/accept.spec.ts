import {
  DEFAULT_MULTIPART_CONTENT_TYPE,
  getIncrementalSpecForRequest,
  getMediaTypesForRequestInOrder,
  getMultipartContentType,
  INCREMENTAL_DELIVERY_SPECS,
  isMatchingMediaType,
  negotiateIncrementalSpecFromMediaType,
  type IncrementalDeliverySpec,
} from './accept.js';

const v01 = INCREMENTAL_DELIVERY_SPECS.find(spec => spec.id === 'v0.1')!;
const v02 = INCREMENTAL_DELIVERY_SPECS.find(spec => spec.id === 'v0.2')!;

describe('incremental Accept negotiation', () => {
  it('keeps registered spec parameters and drops the rest', () => {
    const request = new Request('http://yoga/graphql', {
      headers: {
        accept: 'multipart/mixed;incrementalSpec=v0.2;q=1, application/json',
      },
    });
    expect(getMediaTypesForRequestInOrder(request)).toEqual([
      'application/json',
      'multipart/mixed;incrementalspec=v0.2',
    ]);
  });

  it('matches multipart/mixed against parameterized Accept types', () => {
    expect(isMatchingMediaType('multipart/mixed', 'multipart/mixed;incrementalspec=v0.2')).toBe(
      true,
    );
    expect(isMatchingMediaType('multipart/mixed', '*/*')).toBe(true);
  });

  it('maps registered specs and bare mixed from the spec table', () => {
    expect(negotiateIncrementalSpecFromMediaType('multipart/mixed;incrementalspec=v0.2')).toEqual({
      spec: 'v0.2',
      contentType: getMultipartContentType(v02, { echoSpec: true }),
    });
    expect(negotiateIncrementalSpecFromMediaType('multipart/mixed;deferspec=20220824')).toEqual({
      spec: 'v0.1',
      contentType: getMultipartContentType(v01, { echoSpec: true }),
    });
    expect(negotiateIncrementalSpecFromMediaType('multipart/mixed')).toEqual({
      spec: 'v0.1',
      contentType: DEFAULT_MULTIPART_CONTENT_TYPE,
    });
    expect(negotiateIncrementalSpecFromMediaType('application/json')).toBeUndefined();
  });

  it('rejects unknown values for registered spec parameters', () => {
    expect(negotiateIncrementalSpecFromMediaType('multipart/mixed;incrementalspec=v0.3')).toBe(
      'unsupported',
    );
    expect(negotiateIncrementalSpecFromMediaType('multipart/mixed;deferspec=2019')).toBe(
      'unsupported',
    );
  });

  it('ignores unregistered media-type parameters', () => {
    expect(negotiateIncrementalSpecFromMediaType('multipart/mixed;boundary=-')).toEqual({
      spec: 'v0.1',
      contentType: DEFAULT_MULTIPART_CONTENT_TYPE,
    });
  });

  it('reads the last matching multipart/mixed from Accept', () => {
    const v02Request = new Request('http://yoga/graphql', {
      headers: { accept: 'application/json, multipart/mixed;incrementalSpec=v0.2' },
    });
    expect(getIncrementalSpecForRequest(v02Request)).toBe('v0.2');

    const v01Request = new Request('http://yoga/graphql', {
      headers: { accept: 'multipart/mixed;deferSpec=20220824' },
    });
    expect(getIncrementalSpecForRequest(v01Request)).toBe('v0.1');

    const none = new Request('http://yoga/graphql', {
      headers: { accept: 'application/json' },
    });
    expect(getIncrementalSpecForRequest(none)).toBeUndefined();
  });

  it('picks up extra specs from the table without negotiator changes', () => {
    const specs: IncrementalDeliverySpec[] = [
      ...INCREMENTAL_DELIVERY_SPECS,
      { id: 'v0.2', parameter: 'legacyInc', value: '1' },
    ];
    expect(negotiateIncrementalSpecFromMediaType('multipart/mixed;legacyinc=1', specs)).toEqual({
      spec: 'v0.2',
      contentType: getMultipartContentType(specs[2], { echoSpec: true }),
    });
    expect(
      getMediaTypesForRequestInOrder(
        new Request('http://yoga/graphql', {
          headers: { accept: 'multipart/mixed;legacyInc=1' },
        }),
        specs,
      ),
    ).toEqual(['multipart/mixed;legacyinc=1']);
  });
});
