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

// ---------------------------------------------------------------------------
// Cross-platform streaming multipart parser
//
// Uses only WHATWG standard APIs (ReadableStream, TextDecoder, Uint8Array) so
// that it works in Node.js, Cloudflare Workers, Deno, and browsers alike.
// ---------------------------------------------------------------------------

/** Extract the `boundary` parameter from a `multipart/form-data` Content-Type. */
function extractBoundary(contentType: string): string | null {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^\s;,]+))/);
  return match?.[1] ?? match?.[2] ?? null;
}

/** Return the index of `needle` inside `haystack[from…]`, or -1 if not found. */
function indexOfBytes(
  haystack: Uint8Array<ArrayBufferLike>,
  needle: Uint8Array<ArrayBufferLike>,
  from = 0,
): number {
  outer: for (let i = from; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

/** Concatenate two Uint8Arrays into a new one. */
function concatBytes(
  a: Uint8Array<ArrayBufferLike>,
  b: Uint8Array<ArrayBufferLike>,
): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

/**
 * Parses a multipart/form-data request as a stream.
 *
 * Unlike the default parser (which uses `request.formData()` and fully buffers
 * every uploaded file into memory), this implementation reads the request body
 * as a WHATWG `ReadableStream` and wires each file part into its own
 * `ReadableStream` that is exposed to resolvers.  File bytes therefore flow
 * through memory only as fast as the resolver consumes them.
 *
 * The returned promise resolves as soon as the `operations` (and optional
 * `map`) text fields have been parsed — before any file bytes are received —
 * so GraphQL execution can start immediately and pull from each file stream
 * on demand.
 */
function parsePOSTMultipartRequestAsStream(request: Request): Promise<GraphQLParams> {
  const contentType = request.headers.get('content-type') ?? '';
  const boundary = extractBoundary(contentType);

  if (!boundary) {
    return Promise.reject(createGraphQLError('Could not determine multipart boundary'));
  }
  if (!request.body) {
    return Promise.reject(createGraphQLError('Request body is missing'));
  }

  const body = request.body;

  return new Promise<GraphQLParams>((resolveParams, rejectParams) => {
    const enc = new TextEncoder();
    const dec = new TextDecoder();

    // Pre-encode the byte sequences we search for repeatedly.
    const DASH_BOUNDARY = enc.encode(`--${boundary}`);
    const CRLF_DASH_BOUNDARY = enc.encode(`\r\n--${boundary}`);
    const CRLF_CRLF = enc.encode('\r\n\r\n');
    // ASCII code for '-', used when detecting the close delimiter `--`.
    const DASH = 0x2d;

    // Shared accumulation buffer that the background async task reads into.
    let buf = new Uint8Array(0);

    interface FileEntry {
      controller: ReadableStreamDefaultController<Uint8Array>;
      meta: { name: string; type: string };
    }
    const fileEntries = new Map<string, FileEntry>();

    let operationsStr: string | undefined;
    let mapStr: string | undefined;
    let operations: GraphQLParams | undefined;
    let map: Record<string, string[]> | undefined;
    let resolved = false;

    /** Reject the params promise and propagate the error to any open file streams. */
    function fail(err: unknown): void {
      if (!resolved) {
        resolved = true;
        rejectParams(err);
      }
      for (const { controller } of fileEntries.values()) {
        try {
          controller.error(err);
        } catch {
          // already closed
        }
      }
    }

    /**
     * Resolve the outer promise once we have both `operations` and (optionally)
     * `map`.  Sets up deferred ReadableStreams for every file index listed in the
     * map so that the GraphQL variables tree already has File-like objects in
     * place when the promise resolves — even though the file bytes arrive later.
     */
    function tryResolve(): void {
      if (resolved || !operationsStr) return;

      try {
        operations = JSON.parse(operationsStr);
      } catch {
        return fail(
          createGraphQLError('Multipart form field "operations" must be a valid JSON string'),
        );
      }

      if (mapStr != null) {
        try {
          map = JSON.parse(mapStr);
        } catch {
          return fail(createGraphQLError('Multipart form field "map" must be a valid JSON string'));
        }

        for (const fileIndex in map) {
          if (fileEntries.has(fileIndex)) continue;
          let controller!: ReadableStreamDefaultController<Uint8Array>;
          const stream = new ReadableStream<Uint8Array>({
            start(c) {
              controller = c;
            },
          });
          const meta = { name: '', type: '' };
          fileEntries.set(fileIndex, { controller, meta });

          const fileObj = createStreamingFile(stream, meta);
          for (const key of map![fileIndex]!) {
            setObjectKeyPath(operations!, key, fileObj);
          }
        }
      }

      resolved = true;
      resolveParams(operations!);
    }

    // ------------------------------------------------------------------
    // Background async task: reads `body` chunk by chunk and parses the
    // multipart boundaries.  Resolves the params promise early (as soon as
    // text fields are consumed) and then continues feeding bytes into each
    // file's ReadableStream controller.
    // ------------------------------------------------------------------
    (async () => {
      const reader = body.getReader();

      /** Pull one more chunk from the request body into `buf`. */
      async function readMore(): Promise<boolean> {
        const { value, done } = await reader.read();
        if (done || !value) return false;
        buf = concatBytes(buf, value);
        return true;
      }

      /** Read until `needle` is present somewhere in `buf`. */
      async function waitFor(needle: Uint8Array): Promise<boolean> {
        while (indexOfBytes(buf, needle) === -1) {
          if (!(await readMore())) return false;
        }
        return true;
      }

      /** Ensure `buf` has at least `n` bytes (or stream ended). */
      async function ensureBytes(n: number): Promise<boolean> {
        while (buf.length < n) {
          if (!(await readMore())) return false;
        }
        return true;
      }

      /** Consume `n` bytes from the front of `buf` and return them. */
      function eat(n: number): Uint8Array {
        const slice = buf.slice(0, n);
        buf = buf.slice(n);
        return slice;
      }

      // ---- locate and skip the opening boundary ----
      if (!(await waitFor(DASH_BOUNDARY))) {
        return fail(createGraphQLError('No multipart boundary found in request body'));
      }
      eat(indexOfBytes(buf, DASH_BOUNDARY) + DASH_BOUNDARY.length);

      // After the first boundary comes either `\r\n` (first part) or `--` (empty body).
      if (!(await ensureBytes(2))) {
        return fail(createGraphQLError('Unexpected end of multipart stream'));
      }
      if (buf[0] === DASH && buf[1] === DASH) {
        // `--boundary--` with nothing inside
        return fail(createGraphQLError('Missing multipart form field "operations"'));
      }
      eat(2); // consume the `\r\n` after the boundary

      let done = false;

      while (!done) {
        // ---- read the part's headers ----
        if (!(await waitFor(CRLF_CRLF))) {
          return fail(createGraphQLError('Incomplete multipart part headers'));
        }
        const headerEnd = indexOfBytes(buf, CRLF_CRLF);
        const rawHeaders = dec.decode(eat(headerEnd));
        eat(4); // consume `\r\n\r\n`

        // Parse header lines into a plain object.
        const hdrs: Record<string, string> = {};
        for (const line of rawHeaders.split('\r\n')) {
          const ci = line.indexOf(':');
          if (ci !== -1) {
            hdrs[line.slice(0, ci).trim().toLowerCase()] = line.slice(ci + 1).trim();
          }
        }

        const contentDisp = hdrs['content-disposition'] ?? '';
        const nameMatch = contentDisp.match(/\bname=(?:"([^"]+)"|([^\s;,]+))/);
        const filenameMatch = contentDisp.match(/\bfilename=(?:"([^"]+)"|([^\s;,]+))/);
        const fieldName = nameMatch?.[1] ?? nameMatch?.[2];
        const fileName = filenameMatch?.[1] ?? filenameMatch?.[2];
        const mimeType = hdrs['content-type'];

        // Helper: skip past the current part's body to the next boundary.
        async function skipPart(): Promise<boolean> {
          if (!(await waitFor(CRLF_DASH_BOUNDARY))) return false;
          eat(indexOfBytes(buf, CRLF_DASH_BOUNDARY) + CRLF_DASH_BOUNDARY.length);
          if (!(await ensureBytes(2))) return false;
          if (buf[0] === DASH && buf[1] === DASH) {
            eat(2);
            return false; // signals "no more parts"
          }
          eat(2); // consume `\r\n` before next part's headers
          return true; // more parts follow
        }

        if (!fieldName) {
          done = !(await skipPart());
          continue;
        }

        const isFilePart = fileName !== undefined;

        if (!isFilePart) {
          // ---- text field (operations / map / …) ----
          if (!(await waitFor(CRLF_DASH_BOUNDARY))) {
            return fail(createGraphQLError('Unexpected end of text field body'));
          }
          const delimPos = indexOfBytes(buf, CRLF_DASH_BOUNDARY);
          const value = dec.decode(eat(delimPos));
          eat(CRLF_DASH_BOUNDARY.length);

          if (fieldName === 'operations') operationsStr = value;
          else if (fieldName === 'map') mapStr = value;

          if (!(await ensureBytes(2))) {
            done = true;
            break;
          }
          if (buf[0] === DASH && buf[1] === DASH) {
            done = true;
            eat(2);
            break;
          }
          eat(2); // `\r\n` before next part's headers
          continue;
        }

        // ---- file part ----
        // Resolve the outer promise now that all text fields are available.
        if (!resolved) tryResolve();

        const entry = fileEntries.get(fieldName);
        if (!entry) {
          // File index not referenced in the map — drain and move on.
          done = !(await skipPart());
          continue;
        }

        // Populate the mutable metadata ref so the File-like object in the
        // variables tree reflects the correct filename and MIME type.
        entry.meta.name = fileName ?? '';
        entry.meta.type = mimeType ?? 'application/octet-stream';

        const { controller } = entry;

        // Stream bytes until the next boundary.
        // We must be careful not to emit bytes that are actually the start
        // of an as-yet-incomplete boundary sequence, so we keep back
        // `CRLF_DASH_BOUNDARY.length - 1` bytes in `buf` at all times.
        while (true) {
          const delimPos = indexOfBytes(buf, CRLF_DASH_BOUNDARY);

          if (delimPos !== -1) {
            // We found the end of this file part.
            if (delimPos > 0) controller.enqueue(eat(delimPos));
            eat(CRLF_DASH_BOUNDARY.length);
            controller.close();

            if (!(await ensureBytes(2))) {
              done = true;
              break;
            }
            if (buf[0] === DASH && buf[1] === DASH) {
              done = true;
              eat(2);
            } else {
              eat(2); // `\r\n` before next part
            }
            break;
          }

          // The boundary might straddle the current end of `buf` — only emit
          // bytes that cannot possibly be part of the delimiter prefix.
          const safeLen = buf.length - (CRLF_DASH_BOUNDARY.length - 1);
          if (safeLen > 0) {
            controller.enqueue(eat(safeLen));
          }

          if (!(await readMore())) {
            // Stream ended without a closing boundary — emit remaining bytes.
            if (buf.length > 0) controller.enqueue(buf);
            controller.close();
            done = true;
            break;
          }
        }
      }

      // Close any file streams whose part was never reached.
      for (const { controller } of fileEntries.values()) {
        try {
          controller.close();
        } catch {
          // already closed / errored
        }
      }

      // If we parsed everything without ever seeing a file part, resolve now.
      if (!resolved) {
        if (operationsStr) {
          tryResolve();
        } else {
          fail(createGraphQLError('Missing multipart form field "operations"'));
        }
      }
    })().catch(fail);
  });
}

/**
 * Creates a lightweight `File`-like object backed by a `ReadableStream`.
 *
 * The `meta` object is intentionally **mutable** so that the parser can fill in
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
      return result.buffer.slice(
        result.byteOffset,
        result.byteOffset + result.byteLength,
      ) as ArrayBuffer;
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
