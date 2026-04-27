import { crypto, TextEncoder } from '@whatwg-node/fetch';
import type { MaybePromise } from '@whatwg-node/promise-helpers';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

export function hashSHA256(text: string): MaybePromise<string> {
  const inputUint8Array = new TextEncoder().encode(text);
  return handleMaybePromise(
    () => crypto.subtle.digest({ name: 'SHA-256' }, inputUint8Array),
    arrayBuf => {
      const outputUint8Array = new Uint8Array(arrayBuf);

      let hash = '';
      for (const hexNum of outputUint8Array) {
        const hex = hexNum.toString(16);
        hash += '00'.slice(0, Math.max(0, 2 - hex.length)) + hex;
      }

      return hash;
    },
  );
}
