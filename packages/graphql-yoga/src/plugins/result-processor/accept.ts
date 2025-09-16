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
    mediaTypes.push(mediaType);
  }
  return mediaTypes.reverse();
}

export function isMatchingMediaType(askedMediaType: string, processorMediaType: string) {
  const [askedPre, askedSuf] = askedMediaType.split('/');
  const [pre, suf] = processorMediaType.split('/');
  if ((pre === '*' || pre === askedPre) && (suf === '*' || suf === askedSuf)) {
    return true;
  }
  return false;
}
