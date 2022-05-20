import '../styles/globals.css'
import type { AppProps } from 'next/app'
// import '../styles/App.css'
// import '../styles/CandyMachine.css'
// import '../styles/CountdownTimer.css'

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}

export default MyApp
