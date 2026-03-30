import { Readable } from 'node:stream';
import Busboy, { BusboyFileStream } from '@fastify/busboy';
import { createGraphQLError } from '@graphql-tools/utils';
import { handleMaybePromise, MaybePromise } from '@whatwg-node/promise-helpers';
import { GraphQLParams } from '../../types.js';
import { isContentTypeMatch } from './utils.js';

export function isPOSTMultipartRequest(request: Request): boolean {
  return request.method === 'POST' && isContentTypeMatch(request, 'multipart/form-data');
}

export function parsePOSTMultipartRequest(
  request: Request,
  useStream?: boolean,
): MaybePromise<GraphQLParams> {
  if (useStream) {
    return parsePOSTMultipartRequestAsStream(request);
  }
  return handleMaybePromise(
    () => request.formData(),
    (requestBody: FormData) => {
      const operationsStr = requestBody.get('operations');

      if (!operationsStr) {
        throw createGraphQLError('Missing multipart form field "operations"');
      }

      if (typeof operationsStr !== 'string') {
        throw createGraphQLError('Multipart form field "operations" must be a string');
      }

      let operations: GraphQLParams;

      try {
        operations = JSON.parse(operationsStr);
      } catch {
        throw createGraphQLError('Multipart form field "operations" must be a valid JSON string');
      }

      const mapStr = requestBody.get('map');

      if (mapStr != null) {
        if (typeof mapStr !== 'string') {
          throw createGraphQLError('Multipart form field "map" must be a string');
        }

        let map: Record<string, string[]>;

        try {
          map = JSON.parse(mapStr);
        } catch {
          throw createGraphQLError('Multipart form field "map" must be a valid JSON string');
        }
        for (const fileIndex in map) {
          const file = requestBody.get(fileIndex);
          const keys = map[fileIndex]!;
          for (const key of keys) {
            setObjectKeyPath(operations, key, file);
          }
        }
      }

      return operations;
    },
    e => {
      if (e instanceof Error && e.message.startsWith('File size limit exceeded: ')) {
        throw createGraphQLError(e.message, {
          extensions: {
            http: {
              status: 413,
            },
          },
        });
      }
      throw e;
    },
  );
}

/**
 * Parses a multipart/form-data request as a stream.
 *
 * Unlike the default parser (which uses `request.formData()` and fully buffers every uploaded
 * file), this variant uses busboy to pipe each file part directly into a WHATWG `ReadableStream`
 * that is placed into the GraphQL variables.  The file data therefore flows through memory only
 * as fast as the resolver consumes it, making it suitable for large files.
 *
 * The promise resolves as soon as the `operations` (and optional `map`) fields have been parsed
 * — i.e. **before** any file bytes have been received — so GraphQL execution can start immediately
 * and consume each file's stream on demand.
 */
function parsePOSTMultipartRequestAsStream(request: Request): Promise<GraphQLParams> {
  return new Promise<GraphQLParams>((resolve, reject) => {
    const contentType = request.headers.get('content-type');
    const contentLength = request.headers.get('content-length');

    if (!request.body) {
      return reject(createGraphQLError('Request body is missing'));
    }

    const bb = new Busboy({
      headers: {
        'content-type': contentType || '',
        ...(contentLength ? { 'content-length': contentLength } : {}),
      },
      defCharset: 'utf-8',
    });

    let operationsStr: string | undefined;
    let mapStr: string | undefined;
    let operations: GraphQLParams | undefined;
    let map: Record<string, string[]> | undefined;

    /**
     * Per-file entry created when we build the deferred streams (inside
     * `onAllFieldsReceived`).  The `meta` object is mutated in-place when
     * busboy fires the `file` event so that resolvers see the correct
     * filename / MIME-type even for the second, third, … file.
     */
    interface FileEntry {
      controller: ReadableStreamDefaultController<Uint8Array>;
      meta: { name: string; type: string };
    }
    const fileEntries = new Map<string, FileEntry>();

    let resolved = false;

    /**
     * Called once we are sure that all non-file fields have been received
     * (i.e. when the first `file` event fires, or when `finish` fires
     * without any files).  Parses `operations` / `map`, wires the deferred
     * streams into the variable tree, and resolves the outer promise.
     */
    function onAllFieldsReceived() {
      if (resolved) return;

      if (!operationsStr) {
        resolved = true;
        return reject(createGraphQLError('Missing multipart form field "operations"'));
      }

      try {
        operations = JSON.parse(operationsStr);
      } catch {
        resolved = true;
        return reject(
          createGraphQLError('Multipart form field "operations" must be a valid JSON string'),
        );
      }

      if (mapStr != null) {
        try {
          map = JSON.parse(mapStr);
        } catch {
          resolved = true;
          return reject(
            createGraphQLError('Multipart form field "map" must be a valid JSON string'),
          );
        }

        // Create a deferred ReadableStream + mutable metadata ref for each
        // file listed in the map, then inject a streaming File-like object
        // into the corresponding variable paths.
        for (const fileIndex in map!) {
          let controller!: ReadableStreamDefaultController<Uint8Array>;
          const stream = new ReadableStream<Uint8Array>({
            start(c) {
              controller = c;
            },
          });

          // Placeholder metadata – will be mutated when busboy fires the
          // `file` event for this particular part.
          const meta = { name: '', type: '' };
          fileEntries.set(fileIndex, { controller, meta });

          const fileObj = createStreamingFile(stream, meta);
          const keys = map![fileIndex]!;
          for (const key of keys) {
            setObjectKeyPath(operations!, key, fileObj);
          }
        }
      }

      resolved = true;
      resolve(operations!);
    }

    bb.on('field', (name: string, value: string) => {
      if (name === 'operations') {
        operationsStr = value;
      } else if (name === 'map') {
        mapStr = value;
      }
    });

    bb.on(
      'file',
      (
        fieldname: string,
        fileStream: BusboyFileStream,
        filename: string,
        _transferEncoding: string,
        mimeType: string,
      ) => {
        // All non-file fields arrive before the first file part – resolve now.
        onAllFieldsReceived();

        const entry = fileEntries.get(fieldname);
        if (!entry) {
          // Not referenced in the map; drain so busboy can continue.
          fileStream.resume();
          return;
        }

        // Populate the metadata ref in-place so the File-like object reflects
        // the correct filename and MIME type.
        entry.meta.name = filename;
        entry.meta.type = mimeType;

        const { controller } = entry;
        fileStream.on('data', (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk));
        });
        fileStream.on('end', () => {
          controller.close();
        });
        fileStream.on('error', (err: Error) => {
          controller.error(err);
        });
        fileStream.on('limit', () => {
          const err = createGraphQLError('File size limit exceeded', {
            extensions: { http: { status: 413 } },
          });
          controller.error(err);
          if (!resolved) {
            reject(err);
          }
        });
      },
    );

    bb.on('error', (err: unknown) => {
      if (!resolved) {
        reject(err);
      }
    });

    bb.on('finish', () => {
      // No file parts were found – resolve from whatever fields we collected.
      onAllFieldsReceived();
    });

    // Convert the WHATWG ReadableStream (request.body) to a Node.js Readable
    // so that we can pipe it into busboy (a Node.js Writable).
    //
    // When running under @whatwg-node/server the body may be a
    // PonyfillReadableStream which already exposes its underlying Node.js
    // Readable via a `.readable` property – use that directly.  In all other
    // environments fall back to Readable.fromWeb().
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bodyAny = request.body as any;
    const nodeReadable: Readable =
      bodyAny?.readable instanceof Readable ? bodyAny.readable : Readable.fromWeb(bodyAny);
    nodeReadable.pipe(bb);
    nodeReadable.on('error', (err: Error) => {
      if (!resolved) {
        reject(err);
      }
    });
  });
}

/**
 * Creates a lightweight `File`-like object backed by a `ReadableStream`.
 *
 * The `meta` object is intentionally **mutable** so that busboy can fill in
 * the filename / MIME-type after the object has already been placed into the
 * GraphQL variables tree.
 */
function createStreamingFile(
  stream: ReadableStream<Uint8Array>,
  meta: { name: string; type: string },
): File {
  let consumed = false;

  function consumeStream(): ReadableStream<Uint8Array> {
    if (consumed) {
      throw new Error('Upload stream was already consumed.');
    }
    consumed = true;
    return stream;
  }

  const file: File = {
    get name() {
      return meta.name;
    },
    get type() {
      return meta.type;
    },
    size: 0,
    lastModified: Date.now(),
    webkitRelativePath: '',
    [Symbol.toStringTag]: 'File',
    stream(): ReadableStream<Uint8Array> {
      return consumeStream();
    },
    async arrayBuffer(): Promise<ArrayBuffer> {
      const chunks: Uint8Array[] = [];
      for await (const chunk of consumeStream()) {
        chunks.push(chunk);
      }
      const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      return result.buffer as ArrayBuffer;
    },
    async bytes(): Promise<Uint8Array> {
      return new Uint8Array(await file.arrayBuffer());
    },
    async text(): Promise<string> {
      return new TextDecoder().decode(await file.arrayBuffer());
    },
    slice(): Blob {
      throw new Error('slice() is not supported for streaming file uploads.');
    },
  } as unknown as File;

  return file;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setObjectKeyPath(object: any, keyPath: string, value: any): void {
  const keys = keyPath.split('.');
  let current = object;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]!;
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return;
    }
    const isLastKey = i === keys.length - 1;
    if (isLastKey) {
      current[key] = value;
    } else {
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }
  }
}
