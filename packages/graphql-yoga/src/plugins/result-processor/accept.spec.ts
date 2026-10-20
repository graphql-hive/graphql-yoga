import {
  DEFAULT_MULTIPART_CONTENT_TYPE,
  DEFER_SPEC_V0_1_CONTENT_TYPE,
  getIncrementalSpecForRequest,
  getMediaTypesForRequestInOrder,
  INCREMENTAL_SPEC_V0_2_CONTENT_TYPE,
  isMatchingMediaType,
  negotiateIncrementalSpecFromMediaType,
} from './accept.js';

describe('incremental Accept negotiation', () => {
  it('keeps deferSpec and incrementalSpec parameters', () => {
    const request = new Request('http://yoga/graphql', {
      headers: {
        accept: 'multipart/mixed;incrementalSpec=v0.2, application/json',
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

  it('maps incrementalSpec=v0.2, deferSpec=20220824, and bare mixed', () => {
    expect(negotiateIncrementalSpecFromMediaType('multipart/mixed;incrementalspec=v0.2')).toEqual({
      spec: 'v0.2',
      contentType: INCREMENTAL_SPEC_V0_2_CONTENT_TYPE,
    });
    expect(negotiateIncrementalSpecFromMediaType('multipart/mixed;deferspec=20220824')).toEqual({
      spec: 'v0.1',
      contentType: DEFER_SPEC_V0_1_CONTENT_TYPE,
    });
    expect(negotiateIncrementalSpecFromMediaType('multipart/mixed')).toEqual({
      spec: 'v0.1',
      contentType: DEFAULT_MULTIPART_CONTENT_TYPE,
    });
    expect(negotiateIncrementalSpecFromMediaType('application/json')).toBeUndefined();
  });

  it('rejects unknown incremental spec parameters', () => {
    expect(negotiateIncrementalSpecFromMediaType('multipart/mixed;incrementalspec=v0.3')).toBe(
      'unsupported',
    );
    expect(negotiateIncrementalSpecFromMediaType('multipart/mixed;deferspec=2019')).toBe(
      'unsupported',
    );
  });

  it('reads the last matching multipart/mixed from Accept', () => {
    const v02 = new Request('http://yoga/graphql', {
      headers: { accept: 'application/json, multipart/mixed;incrementalSpec=v0.2' },
    });
    expect(getIncrementalSpecForRequest(v02)).toBe('v0.2');

    const v01 = new Request('http://yoga/graphql', {
      headers: { accept: 'multipart/mixed;deferSpec=20220824' },
    });
    expect(getIncrementalSpecForRequest(v01)).toBe('v0.1');

    const none = new Request('http://yoga/graphql', {
      headers: { accept: 'application/json' },
    });
    expect(getIncrementalSpecForRequest(none)).toBeUndefined();
  });
});
