import { useEffect, useState } from 'react'
import type { NextPage } from 'next'
import twitterLogo from '../assets/twitter-logo.svg'
import Image from 'next/image'
import CandyMachine from '../components/CandyMachine/index'

// constants
// Constants
const TWITTER_HANDLE = 'noor_anmol'
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`

const Home: NextPage = () => {
  // states
  const [walletAddress, setWalletAddress] = useState()

  // actions
  // chech if the wallet is connected!!
  const checkIFWalletIsConnected = async () => {
    try {
      const { solana } = window
      if (solana && solana.isPhantom) {
        console.log('Phantomo wallet is found')
        const res = await solana.connect({ onlyIfTrusted: true })
        console.log('connected with public key: ', res.publicKey.toString())
        setWalletAddress(res.publicKey.toString())
      } else {
        console.log('Solana object not found! Get a Phantom wallet.')
      }
    } catch (error) {
      console.log({ err: error })
    }
  }

  // connect the wallet
  const connectWallet = async () => {
    const { solana } = window

    const res = await solana.connect()
    console.log('connected to wallet :', res.publicKey.toString())
    setWalletAddress(res.publicKey.toString())
  }

  // render the button on wallet not connected
  const renderNotConnectedContainer = () => {
    return (
      <button
        className="rounded border border-blue-500 bg-transparent py-2 px-4 font-semibold text-blue-700 hover:border-transparent hover:bg-blue-500 hover:text-white"
        onClick={connectWallet}
      >
        Connect to Wallet
      </button>
    )
  }

  // run as soon as element mount
  useEffect(() => {
    const onLoad = async () => {
      await checkIFWalletIsConnected()
    }
    window.addEventListener('load', onLoad)
    return () => window.removeEventListener('load', onLoad)
  }, [])

  return (
    <div className="relative flex h-[100vh] flex-col items-center justify-center  bg-[#141414] text-white">
      <div className=" text-centerw-1/3 flex  flex-col items-center justify-center">
        <div className="flex flex-col items-center justify-center ">
          <p className="text-5xl font-bold ">🛸 Rust Drop</p>
          <p className="my-4 text-2xl">NFT drop machine with fair mint</p>
          {!walletAddress && renderNotConnectedContainer()}
        </div>
        {walletAddress && <CandyMachine walletAddress={window.solana} />}
      </div>
      <div className="absolute bottom-3 flex flex-row items-center justify-center gap-4 ">
        <Image
          className=""
          alt="Twitter Logo"
          src={twitterLogo}
          width={'40px'}
          height={'40px'}
        />
        <a
          className="text-2xl"
          href={TWITTER_LINK}
          target="_blank"
          rel="noreferrer"
        >{`built on @${TWITTER_HANDLE}`}</a>
      </div>
    </div>
  )
}

export default Home
