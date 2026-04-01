import type { AppProps } from 'next/app';
import '@theguild/components/style.css';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
