import type { AppProps } from 'next/app';
import '@theguild/components/style.css';
import Head from 'next/head';
import favicon from '../../public/favicon.ico';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <link rel="icon" href={favicon.src} />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
