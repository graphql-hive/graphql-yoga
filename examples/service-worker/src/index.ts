import { createServer } from '@graphql-yoga/common'

const server = createServer()

self.addEventListener('fetch', server)
