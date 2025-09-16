/* eslint-disable no-undef */
export function createFetch() {
	return globalThis;
}

export const fetch = globalThis.fetch;
export const Headers = globalThis.Headers;
export const Request = globalThis.Request;
export const Response = globalThis.Response;
export const FormData = globalThis.FormData;
export const ReadableStream = globalThis.ReadableStream;
export const WritableStream = globalThis.WritableStream;
export const TransformStream = globalThis.TransformStream;
export const Blob = globalThis.Blob;
export const File = globalThis.File;
export const crypto = globalThis.crypto;
export const btoa = globalThis.btoa;
export const TextEncoder = globalThis.TextEncoder;
export const TextDecoder = globalThis.TextDecoder;
export const URLPattern = globalThis.URLPattern;
export const URL = globalThis.URL;
export const URLSearchParams = globalThis.URLSearchParams;
export class CustomEvent extends Event {
	constructor(type, options) {
		super(type, options);
		this.detail = options?.detail;
	}
}
