import {
  getDefaultIncrementalDeliverySpec,
  getIncrementalSpecParameterNames,
  getMultipartContentType,
  INCREMENTAL_DELIVERY_SPECS,
  lookupIncrementalDeliverySpec,
  type IncrementalDeliverySpec,
  type IncrementalSpec,
} from '@graphql-tools/utils';

export type { IncrementalDeliverySpec, IncrementalSpec } from '@graphql-tools/utils';
export {
  DEFAULT_MULTIPART_CONTENT_TYPE,
  getMultipartContentType,
  INCREMENTAL_DELIVERY_SPECS,
} from '@graphql-tools/utils';

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

export function getMediaTypesForRequestInOrder(
  request: Request,
  specs: readonly IncrementalDeliverySpec[] = INCREMENTAL_DELIVERY_SPECS,
): string[] {
  const specParamNames = getIncrementalSpecParameterNames(specs);
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
    const specParams = params.filter(param => {
      const name = param.split('=')[0];
      return name != null && specParamNames.has(name);
    });
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
 * Map a single Accept media type to an executor `incrementalSpec` using the
 * registered HTTP parameter table. Non-multipart types return `undefined`.
 */
export function negotiateIncrementalSpecFromMediaType(
  mediaType: string,
  specs: readonly IncrementalDeliverySpec[] = INCREMENTAL_DELIVERY_SPECS,
): IncrementalSpecNegotiation | undefined {
  const [type, subtype] = typeAndSubtype(mediaType);
  if (type !== 'multipart' || subtype !== 'mixed') {
    return undefined;
  }

  const lookedUp = lookupIncrementalDeliverySpec(parseMediaTypeParams(mediaType), specs);
  if (lookedUp === 'unsupported') {
    return 'unsupported';
  }
  if (lookedUp) {
    return {
      spec: lookedUp.id,
      contentType: getMultipartContentType(lookedUp, { echoSpec: true }),
    };
  }

  const fallback = getDefaultIncrementalDeliverySpec(specs);
  return {
    spec: fallback.id,
    contentType: getMultipartContentType(fallback, { echoSpec: false }),
  };
}

/**
 * Last matching `multipart/mixed` in the request Accept list (same last-match
 * rule as result-processor selection). `undefined` leaves the executor default.
 */
export function getIncrementalSpecForRequest(
  request: Request,
  specs: readonly IncrementalDeliverySpec[] = INCREMENTAL_DELIVERY_SPECS,
): IncrementalSpec | undefined {
  let spec: IncrementalSpec | undefined;
  for (const mediaType of getMediaTypesForRequestInOrder(request, specs)) {
    const negotiated = negotiateIncrementalSpecFromMediaType(mediaType, specs);
    if (negotiated && negotiated !== 'unsupported') {
      spec = negotiated.spec;
    }
  }
  return spec;
}
