import type { AppProps } from 'next/app';
//@ts-expect-error - no types for this package
import '@theguild/components/style.css';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
