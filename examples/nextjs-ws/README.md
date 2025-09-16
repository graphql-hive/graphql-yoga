# Next.js WebSockets

## Get Started

Run the custom server with:

```sh
npm start
# or
yarn start
# or
pnpm start
```

Navigate to [http://localhost:3000](http://localhost:3000) to see the Next.js app running. You can
start editing the page by modifying `pages/index.js`. The page auto-updates as you edit files.

WebSockets cannot be used with
[Next.js API Routes](https://nextjs.org/docs/api-routes/introduction), we therefore have to create a
[custom Next.js server](https://nextjs.org/docs/advanced-features/custom-server) that will serve the
GraphQL API, WebSockets and the rest of Next.js content.

This custom server implementation can be found in [`server.js`](server.js).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [Next.js custom server](https://nextjs.org/docs/advanced-features/custom-server) - allows you to
  start a server 100% programmatically in order to use custom server patterns

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your
feedback and contributions are welcome!

## No deployment on Vercel

Since this Next.js project uses a
[custom server](https://nextjs.org/docs/advanced-features/custom-server), it cannot be deployed to
Vercel.
