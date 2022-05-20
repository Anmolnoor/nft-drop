import React, { useEffect, useState } from "react";
import "./App.css";
import twitterLogo from "./assets/twitter-logo.svg";

import CandyMachine from "./CandyMachine/";

// Constants
const TWITTER_HANDLE = "_buildspace";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const App = () => {
	// states
	const [walletAddress, setWalletAddress] = useState();

	// actions
	// chech if the wallet is connected!!
	const checkIFWalletIsConnected = async () => {
		try {
			const { solana } = window;
			if (solana && solana.isPhantom) {
				console.log("Phantomo wallet is found");
				const res = await solana.connect({ onlyIfTrusted: true });
				console.log("connected with public key: ", res.publicKey.toString());
				setWalletAddress(res.publicKey.toString());
			} else {
				console.log("Solana object not found! Get a Phantom wallet.");
			}
		} catch (error) {
			console.log({ err: error });
		}
	};

	// connect the wallet
	const connectWallet = async () => {
		const { solana } = window;

		const res = await solana.connect();
		console.log("connected to wallet :", res.publicKey.toString());
		setWalletAddress(res.publicKey.toString());
	};

	// render the button on wallet not connected
	const renderNotConnectedContainer = () => {
		return (
			<button
				className='cta-button connect-wallet-button'
				onClick={connectWallet}>
				Connect to Wallet
			</button>
		);
	};

	// run as soon as element mount
	useEffect(() => {
		const onLoad = async () => {
			await checkIFWalletIsConnected();
		};
		window.addEventListener("load", onLoad);
		return () => window.removeEventListener("load", onLoad);
	}, []);

	return (
		<div className='App'>
			<div className='container'>
				<div className='header-container'>
					<p className='header'>🍭 Candy Drop</p>
					<p className='sub-text'>NFT drop machine with fair mint</p>
					{!walletAddress && renderNotConnectedContainer()}
				</div>
				{walletAddress && <CandyMachine walletAddress={window.solana} />}
				<div className='footer-container'>
					<img alt='Twitter Logo' className='twitter-logo' src={twitterLogo} />
					<a
						className='footer-text'
						href={TWITTER_LINK}
						target='_blank'
						rel='noreferrer'>{`built on @${TWITTER_HANDLE}`}</a>
				</div>
			</div>
		</div>
	);
};

export default App;
