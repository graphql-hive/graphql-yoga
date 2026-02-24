import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const directoryName = path.dirname(fileURLToPath(import.meta.url));
const inputPath = path.resolve(
  directoryName,
  '../../../node_modules/@graphql-hive/laboratory/dist',
);
const jsFile = path.resolve(inputPath, 'hive-laboratory.umd.js');
const cssFile = path.resolve(inputPath, 'laboratory.css');
const editorWorkerServiceFile = path.resolve(
  inputPath,
  'monacoeditorwork',
  'editor.worker.bundle.js',
);
const graphqlWorkerFile = path.resolve(inputPath, 'monacoeditorwork', 'graphql.worker.bundle.js');
const jsonWorkerFile = path.resolve(inputPath, 'monacoeditorwork', 'json.worker.bundle.js');
const typescriptWorkerFile = path.resolve(inputPath, 'monacoeditorwork', 'ts.worker.bundle.js');
const faviconFile = path.resolve(directoryName, '../../../website/src/app/favicon.ico');

const outFile = path.resolve(directoryName, '..', 'src', 'laboratory.ts');

const [
  jsContents,
  faviconContents,
  cssContents,
  editorWorkerServiceContents,
  graphqlWorkerContents,
  jsonWorkerContents,
  typescriptWorkerContents,
] = await Promise.all([
  fs.promises.readFile(jsFile, 'utf-8'),
  fs.promises.readFile(faviconFile, 'base64'),
  fs.promises.readFile(cssFile, 'utf-8'),
  fs.promises.readFile(editorWorkerServiceFile, 'utf-8'),
  fs.promises.readFile(graphqlWorkerFile, 'utf-8'),
  fs.promises.readFile(jsonWorkerFile, 'utf-8'),
  fs.promises.readFile(typescriptWorkerFile, 'utf-8'),
]);

await fs.promises.writeFile(
  outFile,
  [
    `export const js: string = ${JSON.stringify(jsContents)}`,
    `export const favicon: string = ${JSON.stringify(
      `data:image/x-icon;base64,${faviconContents}`,
    )}`,
    `export const css: string = ${JSON.stringify(cssContents)}`,
    `export const editorWorkerService: string = ${JSON.stringify(editorWorkerServiceContents)}`,
    `export const graphqlWorker: string = ${JSON.stringify(graphqlWorkerContents)}`,
    `export const jsonWorker: string = ${JSON.stringify(jsonWorkerContents)}`,
    `export const typescriptWorker: string = ${JSON.stringify(typescriptWorkerContents)}`,
  ].join('\n'),
);
