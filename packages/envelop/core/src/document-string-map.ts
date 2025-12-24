export const documentStringMap = new WeakMap<any, string>();

function getDocumentString<TDocumentNode>(
  document: TDocumentNode,
  print: (doc: TDocumentNode) => string,
): string;
function getDocumentString<TDocumentNode>(document: TDocumentNode): string | undefined;
function getDocumentString<TDocumentNode>(
  document: TDocumentNode,
  print?: (doc: TDocumentNode) => string,
): string | undefined {
  let documentSource = documentStringMap.get(document);
  if (!documentSource && print) {
    documentSource = print(document);
    documentStringMap.set(document, documentSource);
  }
  return documentSource;
}

export { getDocumentString };
