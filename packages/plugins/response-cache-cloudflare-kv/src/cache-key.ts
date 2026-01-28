export function buildOperationKey(
  operationId: string,
  keyPrefix: string | null | undefined = undefined,
) {
  if (keyPrefix) {
    return `${keyPrefix}:operation:${operationId}`;
  } else {
    return `operation:${operationId}`;
  }
}

export function buildEntityKey(
  entityTypename: string,
  entityId: string | number | undefined = undefined,
  keyPrefix: string | null | undefined = undefined,
) {
  let finalKey = keyPrefix ? `${keyPrefix}:` : '';
  if (entityId) {
    finalKey += `entity:${entityTypename}:${entityId}`;
  } else {
    finalKey += `entity:${entityTypename}`;
  }
  return finalKey;
}
