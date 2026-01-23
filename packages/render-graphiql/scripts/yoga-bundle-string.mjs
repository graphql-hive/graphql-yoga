import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const directoryName = path.dirname(fileURLToPath(import.meta.url));
const inputPath = path.resolve(directoryName, '..', '..', 'graphiql', 'dist');
const jsFile = path.resolve(inputPath, 'index.umd.js');
const cssFile = path.resolve(inputPath, 'index.css');
const faviconFile = path.resolve(directoryName, '../../../website/src/app/favicon.ico');
const editorWorkerServiceFile = path.resolve( inputPath, 'monacoeditorwork', 'editor.worker.js');
const jsonWorkerFile = path.resolve(inputPath, 'monacoeditorwork', 'json.worker.js');
const graphqlWorkerFile = path.resolve(inputPath, 'monacoeditorwork', 'graphql.worker.js');

const outFile = path.resolve(directoryName, '..', 'src', 'graphiql.ts');

const [
  jsContents,
  cssContents,
  faviconContents,
  editorWorkerServiceContents,
  jsonWorkerContents,
  graphqlWorkerContents,
] = await Promise.all([
  fs.promises.readFile(jsFile, 'utf-8'),
  fs.promises.readFile(cssFile, 'utf-8'),
  fs.promises.readFile(faviconFile, 'base64'),
  fs.promises.readFile(editorWorkerServiceFile, 'utf-8'),
  fs.promises.readFile(jsonWorkerFile, 'utf-8'),
  fs.promises.readFile(graphqlWorkerFile, 'utf-8'),
]);

await fs.promises.writeFile(
  outFile,
  [
    `export const js: string = ${JSON.stringify(jsContents)}`,
    `export const css: string = ${JSON.stringify(cssContents)}`,
    `export const favicon: string = ${JSON.stringify(
      `data:image/x-icon;base64,${faviconContents}`,
    )}`,
    `export const editorWorkerService: string = ${JSON.stringify(editorWorkerServiceContents)}`,
    `export const jsonWorker: string = ${JSON.stringify(jsonWorkerContents)}`,
    `export const graphqlWorker: string = ${JSON.stringify(graphqlWorkerContents)}`,
  ].join('\n'),
);
