import { AppProps } from 'next/app'
import '@theguild/components/style.css'

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}

// const defaultSeo: AppSeoProps = {
//   title: 'GraphQL Yoga',
//   description:
//     'Fully-featured, simple to set up, performant and extendable GraphQL NodeJS (JavaScript/TypeScript) server',
//   logo: {
//     url: 'https://www.graphql-yoga.com/banner.svg',
//     width: 200,
//     height: 350,
//   },
//   openGraph: {
//     images: [
//       {
//         url: 'https://www.graphql-yoga.com/cover.png',
//         width: 1280,
//         height: 720,
//       },
//     ],
//   },
// }
