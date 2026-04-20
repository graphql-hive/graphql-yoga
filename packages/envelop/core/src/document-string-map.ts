import { DocumentNode, print } from "graphql";

export const documentStringMap = new WeakMap<DocumentNode, string>();

function getDocumentString(
  document: DocumentNode,
  printFn = print,
): string {
  let documentSource = documentStringMap.get(document);
  if (!documentSource) {
    documentSource = printFn(document);
    documentStringMap.set(document, documentSource);
  }
  return documentSource;
}

export { getDocumentString };
