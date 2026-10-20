export type IncrementalSpec = 'v0.1' | 'v0.2';

export const DEFAULT_MULTIPART_CONTENT_TYPE = 'multipart/mixed; boundary="-"';
export const DEFER_SPEC_V0_1_CONTENT_TYPE = 'multipart/mixed; boundary="-"; deferSpec=20220824';
export const INCREMENTAL_SPEC_V0_2_CONTENT_TYPE =
  'multipart/mixed; boundary="-"; incrementalSpec=v0.2';

export type IncrementalSpecNegotiation =
  | { spec: IncrementalSpec; contentType: string }
  | 'unsupported';

function typeAndSubtype(mediaType: string): [string, string] {
  const [essence] = mediaType.split(';');
  const [pre, suf] = (essence ?? '').split('/');
  return [pre ?? '', suf ?? ''];
}

function parseMediaTypeParams(mediaType: string): Record<string, string> {
  const params: Record<string, string> = {};
  const parts = mediaType.split(';');
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (part == null) continue;
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    let value = part.slice(eq + 1);
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
      value = value.slice(1, -1);
    }
    params[part.slice(0, eq)] = value;
  }
  return params;
}

export function getMediaTypesForRequestInOrder(request: Request): string[] {
  const accepts = (request.headers.get('accept') || '*/*')
    .replace(/\s/g, '')
    .toLowerCase()
    .split(',');
  const mediaTypes: string[] = [];
  for (const accept of accepts) {
    const [mediaType, ...params] = accept.split(';');
    if (mediaType === undefined) continue; // If true, malformed header.

    const charset = params?.find(param => param.includes('charset=')) || 'charset=utf-8'; // utf-8 is assumed when not specified;

    if (charset !== 'charset=utf-8') {
      // only utf-8 is supported
      continue;
    }
    const specParams = params.filter(
      param => param.startsWith('incrementalspec=') || param.startsWith('deferspec='),
    );
    mediaTypes.push(specParams.length ? `${mediaType};${specParams.join(';')}` : mediaType);
  }
  return mediaTypes.reverse();
}

export function isMatchingMediaType(askedMediaType: string, processorMediaType: string) {
  const [askedPre, askedSuf] = typeAndSubtype(askedMediaType);
  const [pre, suf] = typeAndSubtype(processorMediaType);
  if ((pre === '*' || pre === askedPre) && (suf === '*' || suf === askedSuf)) {
    return true;
  }
  return false;
}

/**
 * Map a single Accept media type (with optional `deferSpec` / `incrementalSpec`
 * parameters) to the executor incremental payload format.
 *
 * `multipart/mixed;incrementalSpec=v0.2` -> v0.2.
 * `multipart/mixed;deferSpec=20220824` or bare `multipart/mixed` -> v0.1.
 * Unknown spec parameter values are `'unsupported'` (HTTP 406).
 * Non-multipart types return `undefined`.
 */
export function negotiateIncrementalSpecFromMediaType(
  mediaType: string,
): IncrementalSpecNegotiation | undefined {
  const [type, subtype] = typeAndSubtype(mediaType);
  if (type !== 'multipart' || subtype !== 'mixed') {
    return undefined;
  }

  const params = parseMediaTypeParams(mediaType);
  const incrementalSpec = params['incrementalspec'];
  const deferSpec = params['deferspec'];

  if (incrementalSpec != null) {
    if (incrementalSpec === 'v0.2') {
      return { spec: 'v0.2', contentType: INCREMENTAL_SPEC_V0_2_CONTENT_TYPE };
    }
    return 'unsupported';
  }

  if (deferSpec != null) {
    if (deferSpec === '20220824') {
      return { spec: 'v0.1', contentType: DEFER_SPEC_V0_1_CONTENT_TYPE };
    }
    return 'unsupported';
  }

  return { spec: 'v0.1', contentType: DEFAULT_MULTIPART_CONTENT_TYPE };
}

/**
 * Last matching `multipart/mixed` in the request Accept list (same last-match
 * rule as result-processor selection). `undefined` leaves the executor default
 * (`v0.1`).
 */
export function getIncrementalSpecForRequest(request: Request): IncrementalSpec | undefined {
  let spec: IncrementalSpec | undefined;
  for (const mediaType of getMediaTypesForRequestInOrder(request)) {
    const negotiated = negotiateIncrementalSpecFromMediaType(mediaType);
    if (negotiated && negotiated !== 'unsupported') {
      spec = negotiated.spec;
    }
  }
  return spec;
}
