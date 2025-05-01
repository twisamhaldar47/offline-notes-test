import { AppProps } from 'next/app';
import GlobalStyles from '../styles/GlobalStyles';
import {TagProvider} from "@/contexts/TagContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <GlobalStyles />
        <TagProvider>
            <Component {...pageProps} />
        </TagProvider>
    </>
  );
}