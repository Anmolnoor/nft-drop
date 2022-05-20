import React, { useEffect, useState } from 'react'
import { Connection, PublicKey } from '@solana/web3.js'
import { Program, Provider, web3 } from '@project-serum/anchor'
import { MintLayout, TOKEN_PROGRAM_ID, Token } from '@solana/spl-token'
import { programs } from '@metaplex/js'
import { sendTransactions } from './connection'
const {
  metadata: { Metadata, MetadataProgram },
} = programs
import CountdownTimer from '../CountdownTimer'

import {
  candyMachineProgram,
  TOKEN_METADATA_PROGRAM_ID,
  SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  getAtaForMint,
  getNetworkExpire,
  getNetworkToken,
  CIVIC,
} from './helpers'

const { SystemProgram } = web3
const opts = {
  preflightCommitment: 'processed',
}

const MAX_NAME_LENGTH = 32
const MAX_URI_LENGTH = 200
const MAX_SYMBOL_LENGTH = 10
const MAX_CREATOR_LEN = 32 + 1 + 1

const CandyMachine = ({ walletAddress }) => {
  const [candyMachine, setCandyMachine] = useState(null)
  // New state property
  const [mints, setMints] = useState([])
  // Add these two state properties
  const [isMinting, setIsMinting] = useState(false)
  const [isLoadingMints, setIsLoadingMints] = useState(false)

  useEffect(() => {
    getCandyMachineState()
  }, [])

  const getProvider = () => {
    const rpcHost = process.env.REACT_APP_SOLANA_RPC_HOST
    // Create a new connection object
    const connection = new Connection('https://explorer-api.devnet.solana.com')

    // Create a new Solana provider object
    const provider = new Provider(
      connection,
      window.solana,
      opts.preflightCommitment
    )

    return provider
  }

  const fetchHashTable = async (hash, metadataEnabled) => {
    const connection = new web3.Connection(
      'https://explorer-api.devnet.solana.com'
    )

    const metadataAccounts = await MetadataProgram.getProgramAccounts(
      connection,
      {
        filters: [
          {
            memcmp: {
              offset:
                1 +
                32 +
                32 +
                4 +
                MAX_NAME_LENGTH +
                4 +
                MAX_URI_LENGTH +
                4 +
                MAX_SYMBOL_LENGTH +
                2 +
                1 +
                4 +
                0 * MAX_CREATOR_LEN,
              bytes: hash,
            },
          },
        ],
      }
    )

    const mintHashes = []

    for (let index = 0; index < metadataAccounts.length; index++) {
      const account = metadataAccounts[index]
      const accountInfo = await connection.getParsedAccountInfo(account.pubkey)
      const metadata = new Metadata(hash.toString(), accountInfo.value)
      if (metadataEnabled) mintHashes.push(metadata.data)
      else mintHashes.push(metadata.data.mint)
    }

    return mintHashes
  }

  // Declare getCandyMachineState as an async method
  const getCandyMachineState = async () => {
    // Set loading flag.
    setIsLoadingMints(true)

    const provider = getProvider()

    // Get metadata about your deployed candy machine program
    const idl = await Program.fetchIdl(candyMachineProgram, provider)

    // Create a program that you can call
    const program = new Program(idl, candyMachineProgram, provider)

    // Fetch the metadata from your candy machine
    const candyMachine = await program.account.candyMachine.fetch(
      '6ueEEygUv8eA4N2wu5nrBAiPbguneeWaBnE2h2GnuFwB'
    )

    // Parse out all our metadata and log it out
    const itemsAvailable = candyMachine.data.itemsAvailable.toNumber()
    const itemsRedeemed = candyMachine.itemsRedeemed.toNumber()
    const itemsRemaining = itemsAvailable - itemsRedeemed
    const goLiveData = candyMachine.data.goLiveDate.toNumber()
    const presale =
      candyMachine.data.whitelistMintSettings &&
      candyMachine.data.whitelistMintSettings.presale &&
      (!candyMachine.data.goLiveDate ||
        candyMachine.data.goLiveDate.toNumber() > new Date().getTime() / 1000)

    // We will be using this later in our UI so let's generate this now
    // const goLiveDateTimeString = `${new Date(goLiveData * 1000).toGMTString()}`;
    const goLiveDateTimeString = `${new Date(
      goLiveData * 1000
    ).toLocaleDateString()} @ ${new Date(
      goLiveData * 1000
    ).toLocaleTimeString()}`

    // Add this data to your state to render
    //  id: process.env.REACT_APP_CANDY_MACHINE_ID,

    setCandyMachine({
      id: '6ueEEygUv8eA4N2wu5nrBAiPbguneeWaBnE2h2GnuFwB',
      program,
      state: {
        itemsAvailable,
        itemsRedeemed,
        itemsRemaining,
        goLiveData,
        goLiveDateTimeString,
        isSoldOut: itemsRemaining === 0,
        isActive:
          (presale ||
            candyMachine.data.goLiveDate.toNumber() <
              new Date().getTime() / 1000) &&
          (candyMachine.endSettings
            ? candyMachine.endSettings.endSettingType.date
              ? candyMachine.endSettings.number.toNumber() >
                new Date().getTime() / 1000
              : itemsRedeemed < candyMachine.endSettings.number.toNumber()
            : true),
        isPresale: presale,
        goLiveDate: candyMachine.data.goLiveDate,
        treasury: candyMachine.wallet,
        tokenMint: candyMachine.tokenMint,
        gatekeeper: candyMachine.data.gatekeeper,
        endSettings: candyMachine.data.endSettings,
        whitelistMintSettings: candyMachine.data.whitelistMintSettings,
        hiddenSettings: candyMachine.data.hiddenSettings,
        price: candyMachine.data.price,
      },
    })

    console.log({
      itemsAvailable,
      itemsRedeemed,
      itemsRemaining,
      goLiveData,
      goLiveDateTimeString,
      presale,
    })

    // process.env.REACT_APP_CANDY_MACHINE_ID,
    const data = await fetchHashTable(
      '6ueEEygUv8eA4N2wu5nrBAiPbguneeWaBnE2h2GnuFwB',
      true
    )

    if (data.length !== 0) {
      const requests = data.map(async (mint) => {
        // Get URI
        try {
          const response = await fetch(mint.data.uri)
          const parse = await response.json()
          console.log('Past Minted NFT', mint)

          // Get image URI
          return parse.image
        } catch (e) {
          // If any request fails, we'll just disregard it and carry on
          console.error('Failed retrieving Minted NFT', mint)
          return null
        }
      })

      // Wait for all requests to finish
      const allMints = await Promise.all(requests)

      // Filter requests that failed
      const filteredMints = allMints.filter((mint) => mint !== null)

      // Store all the minted image URIs
      setMints(filteredMints)
    }

    // Remove loading flag.
    setIsLoadingMints(false)
  }

  const getCandyMachineCreator = async (candyMachine) => {
    const candyMachineID = new PublicKey(candyMachine)
    return await web3.PublicKey.findProgramAddress(
      [Buffer.from('candy_machine'), candyMachineID.toBuffer()],
      candyMachineProgram
    )
  }

  const getMetadata = async (mint) => {
    return (
      await PublicKey.findProgramAddress(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mint.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
      )
    )[0]
  }

  const getMasterEdition = async (mint) => {
    return (
      await PublicKey.findProgramAddress(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mint.toBuffer(),
          Buffer.from('edition'),
        ],
        TOKEN_METADATA_PROGRAM_ID
      )
    )[0]
  }

  const createAssociatedTokenAccountInstruction = (
    associatedTokenAddress,
    payer,
    walletAddress,
    splTokenMintAddress
  ) => {
    const keys = [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: associatedTokenAddress, isSigner: false, isWritable: true },
      { pubkey: walletAddress, isSigner: false, isWritable: false },
      { pubkey: splTokenMintAddress, isSigner: false, isWritable: false },
      {
        pubkey: web3.SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      {
        pubkey: web3.SYSVAR_RENT_PUBKEY,
        isSigner: false,
        isWritable: false,
      },
    ]
    return new web3.TransactionInstruction({
      keys,
      programId: SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
      data: Buffer.from([]),
    })
  }

  const mintToken = async () => {
    const mint = web3.Keypair.generate()

    const userTokenAccountAddress = (
      await getAtaForMint(mint.publicKey, walletAddress.publicKey)
    )[0]

    const userPayingAccountAddress = candyMachine.state.tokenMint
      ? (
          await getAtaForMint(
            candyMachine.state.tokenMint,
            walletAddress.publicKey
          )
        )[0]
      : walletAddress.publicKey

    const candyMachineAddress = candyMachine.id
    const remainingAccounts = []
    const signers = [mint]
    const cleanupInstructions = []
    const instructions = [
      web3.SystemProgram.createAccount({
        fromPubkey: walletAddress.publicKey,
        newAccountPubkey: mint.publicKey,
        space: MintLayout.span,
        lamports:
          await candyMachine.program.provider.connection.getMinimumBalanceForRentExemption(
            MintLayout.span
          ),
        programId: TOKEN_PROGRAM_ID,
      }),
      Token.createInitMintInstruction(
        TOKEN_PROGRAM_ID,
        mint.publicKey,
        0,
        walletAddress.publicKey,
        walletAddress.publicKey
      ),
      createAssociatedTokenAccountInstruction(
        userTokenAccountAddress,
        walletAddress.publicKey,
        walletAddress.publicKey,
        mint.publicKey
      ),
      Token.createMintToInstruction(
        TOKEN_PROGRAM_ID,
        mint.publicKey,
        userTokenAccountAddress,
        walletAddress.publicKey,
        [],
        1
      ),
    ]

    if (candyMachine.state.gatekeeper) {
      remainingAccounts.push({
        pubkey: (
          await getNetworkToken(
            walletAddress.publicKey,
            candyMachine.state.gatekeeper.gatekeeperNetwork
          )
        )[0],
        isWritable: true,
        isSigner: false,
      })
      if (candyMachine.state.gatekeeper.expireOnUse) {
        remainingAccounts.push({
          pubkey: CIVIC,
          isWritable: false,
          isSigner: false,
        })
        remainingAccounts.push({
          pubkey: (
            await getNetworkExpire(
              candyMachine.state.gatekeeper.gatekeeperNetwork
            )
          )[0],
          isWritable: false,
          isSigner: false,
        })
      }
    }
    if (candyMachine.state.whitelistMintSettings) {
      const mint = new web3.PublicKey(
        candyMachine.state.whitelistMintSettings.mint
      )

      const whitelistToken = (
        await getAtaForMint(mint, walletAddress.publicKey)
      )[0]
      remainingAccounts.push({
        pubkey: whitelistToken,
        isWritable: true,
        isSigner: false,
      })

      if (candyMachine.state.whitelistMintSettings.mode.burnEveryTime) {
        const whitelistBurnAuthority = web3.Keypair.generate()

        remainingAccounts.push({
          pubkey: mint,
          isWritable: true,
          isSigner: false,
        })
        remainingAccounts.push({
          pubkey: whitelistBurnAuthority.publicKey,
          isWritable: false,
          isSigner: true,
        })
        signers.push(whitelistBurnAuthority)
        const exists =
          await candyMachine?.program?.provider?.connection?.getAccountInfo(
            whitelistToken
          )
        if (exists) {
          instructions.push(
            Token.createApproveInstruction(
              TOKEN_PROGRAM_ID,
              whitelistToken,
              whitelistBurnAuthority.publicKey,
              walletAddress.publicKey,
              [],
              1
            )
          )
          cleanupInstructions.push(
            Token.createRevokeInstruction(
              TOKEN_PROGRAM_ID,
              whitelistToken,
              walletAddress.publicKey,
              []
            )
          )
        }
      }
    }

    if (candyMachine.state.tokenMint) {
      const transferAuthority = web3.Keypair.generate()

      signers.push(transferAuthority)
      remainingAccounts.push({
        pubkey: userPayingAccountAddress,
        isWritable: true,
        isSigner: false,
      })
      remainingAccounts.push({
        pubkey: transferAuthority.publicKey,
        isWritable: false,
        isSigner: true,
      })

      instructions.push(
        Token.createApproveInstruction(
          TOKEN_PROGRAM_ID,
          userPayingAccountAddress,
          transferAuthority.publicKey,
          walletAddress.publicKey,
          [],
          candyMachine.state.price.toNumber()
        )
      )
      cleanupInstructions.push(
        Token.createRevokeInstruction(
          TOKEN_PROGRAM_ID,
          userPayingAccountAddress,
          walletAddress.publicKey,
          []
        )
      )
    }
    const metadataAddress = await getMetadata(mint.publicKey)
    const masterEdition = await getMasterEdition(mint.publicKey)

    const [candyMachineCreator, creatorBump] = await getCandyMachineCreator(
      candyMachineAddress
    )

    instructions.push(
      await candyMachine.program.instruction.mintNft(creatorBump, {
        accounts: {
          candyMachine: candyMachineAddress,
          candyMachineCreator,
          payer: walletAddress.publicKey,
          wallet: candyMachine.state.treasury,
          mint: mint.publicKey,
          metadata: metadataAddress,
          masterEdition,
          mintAuthority: walletAddress.publicKey,
          updateAuthority: walletAddress.publicKey,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: web3.SYSVAR_RENT_PUBKEY,
          clock: web3.SYSVAR_CLOCK_PUBKEY,
          recentBlockhashes: web3.SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
          instructionSysvarAccount: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        },
        remainingAccounts:
          remainingAccounts.length > 0 ? remainingAccounts : undefined,
      })
    )

    try {
      return (
        await sendTransactions(
          candyMachine.program.provider.connection,
          candyMachine.program.provider.wallet,
          [instructions, cleanupInstructions],
          [signers, []]
        )
      ).txs.map((t) => t.txid)
    } catch (e) {
      console.log(e)
    }
    return []
  }

  const renderMintedItems = () => (
    <div className="gif-container">
      <p className="sub-text">Minted Items ✨</p>
      <div className="gif-grid">
        {mints.map((mint) => (
          <div className="gif-item" key={mint}>
            <img src={mint} alt={`Minted NFT ${mint}`} />
          </div>
        ))}
      </div>
    </div>
  )

  // Create render function
  const renderDropTimer = () => {
    // Get the current date and dropDate in a JavaScript Date object
    const currentDate = new Date()
    const dropDate = new Date(candyMachine.state.goLiveData * 1000)

    // If currentDate is before dropDate, render our Countdown component
    if (currentDate < dropDate) {
      console.log('Before drop date!')
      // Don't forget to pass over your dropDate!
      return <CountdownTimer dropDate={dropDate} />
    }

    // Else let's just return the current drop date
    return (
      <p className="text-xl font-bold">{`Drop Date: ${candyMachine.state.goLiveDateTimeString}`}</p>
    )
  }

  return (
    // Only show this if candyMachine and candyMachine.state is available
    candyMachine &&
    candyMachine.state && (
      <div className="flex w-full flex-col items-center justify-center gap-3">
        {/* Add this at the beginning of our component */}
        {renderDropTimer()}
        <p className="text-xl ">{`Items Minted: ${candyMachine.state.itemsRedeemed} / ${candyMachine.state.itemsAvailable}`}</p>
        {/* Check to see if these properties are equal! */}
        {candyMachine.state.itemsRedeemed ===
        candyMachine.state.itemsAvailable ? (
          <p className="text-2xl font-bold">Sold Out 🙊</p>
        ) : (
          <button
            className=" w-full rounded border border-blue-500 bg-transparent py-2 px-4 font-semibold text-blue-700 hover:border-transparent hover:bg-blue-500 hover:text-white"
            onClick={mintToken}
          >
            Mint NFT
          </button>
        )}
        {mints.length > 0 && renderMintedItems()}
        {isLoadingMints && <p>LOADING MINTS...</p>}
      </div>
    )
  )
}

export default CandyMachine
