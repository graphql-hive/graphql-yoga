import { isAsyncIterable } from '@graphql-tools/utils'
import { getResponseInitByRespectingErrors } from '../../error.js'
import { FetchAPI } from '../../types.js'
import {
  getAcceptForRequest,
  AcceptableMediaType,
} from '../requestValidation/useAccept.js'
import { ResultProcessorInput } from '../types.js'
import { jsonStringifyResult } from './stringify.js'

const acceptHeaderByResult = new WeakMap<
  ResultProcessorInput,
  AcceptableMediaType
>()

export function isRegularResult(
  request: Request,
  result: ResultProcessorInput,
): boolean {
  const accepted = getAcceptForRequest(request).find(
    (accept) =>
      accept === 'application/graphql-response+json' ||
      accept === 'application/json',
  )
  if (!isAsyncIterable(result) && accepted) {
    acceptHeaderByResult.set(result, accepted)
    return true
  }
  return false
}

export function processRegularResult(
  executionResult: ResultProcessorInput,
  fetchAPI: FetchAPI,
): Response {
  if (isAsyncIterable(executionResult)) {
    throw new Error('Cannot process stream result as regular')
  }

  const contentType = acceptHeaderByResult.get(executionResult)
  const headersInit = {
    'Content-Type':
      (acceptHeaderByResult.get(executionResult) ||
        'application/graphql-response+json') + '; charset=utf-8',
  }

  const responseInit = getResponseInitByRespectingErrors(
    executionResult,
    headersInit,
  )

  const textEncoder = new fetchAPI.TextEncoder()
  const responseBody = jsonStringifyResult(executionResult)
  const decodedString = textEncoder.encode(responseBody)

  headersInit['Content-Length'] = decodedString.byteLength.toString()

  return new fetchAPI.Response(decodedString, responseInit)
}
