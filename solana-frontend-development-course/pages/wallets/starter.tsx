import * as React from 'react';
// library we use to interact with the solana json rpc api
import * as web3 from '@solana/web3.js';
// allows us access to methods and components which give us access to the solana json rpc api and user's wallet data
import * as walletAdapterReact from '@solana/wallet-adapter-react';
// allows us to choose from the available wallets supported by the wallet adapter
import * as walletAdapterWallets from '@solana/wallet-adapter-wallets';
// imports a component which can be rendered in the browser
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
// applies the styling to the components which are rendered on the browser
require('@solana/wallet-adapter-react-ui/styles.css');
// imports methods for deriving data from the wallet's data store
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

import { useState, useEffect } from 'react';

const Starter = () => {
    // Declare all the state variables and variables I want. 
    // we are showing public key and balance 
    const [balance, setBalance] = useState<number | null>(0);
    const { connection } = useConnection();
    const { publicKey } = useWallet();

    const wallets = [
        new walletAdapterWallets.PhantomWalletAdapter(),
        new walletAdapterWallets.SolflareWalletAdapter(),
        new walletAdapterWallets.LedgerWalletAdapter(),
        new walletAdapterWallets.MathWalletAdapter(),
        new walletAdapterWallets.SolletWalletAdapter(),
    ]

    const endpoint = web3.clusterApiUrl("devnet");

    // Declare stateful UI changes 
    useEffect(() => {
        const getBalance = async () => {
            if (connection && publicKey) {
                const info = await connection.getAccountInfo(publicKey);
                if (info) {
                    setBalance(info.lamports / web3.LAMPORTS_PER_SOL);
                } else {
                    setBalance(0); // or null, depending on your requirements
                }
            }
        };

        getBalance();

    }, [connection, publicKey]);
    // Return the UI
    return (
        <>
            <walletAdapterReact.ConnectionProvider endpoint={endpoint}>
                <walletAdapterReact.WalletProvider wallets={wallets}>
                    <WalletModalProvider>
                        <main className='min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white'>
                            <div className='container mx-auto px-4 py-12'>
                                {/* Header Section */}
                                <div className='text-center mb-12'>
                                    <h1 className='text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4'>
                                        Solana Wallet Dashboard
                                    </h1>
                                    <p className='text-xl text-slate-300 max-w-2xl mx-auto'>
                                        Connect your wallet to view account information and manage your Solana assets
                                    </p>
                                </div>

                                {/* Main Card */}
                                <div className='max-w-4xl mx-auto'>
                                    <div className='bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 shadow-2xl'>
                                        {/* Card Header */}
                                        <div className='flex flex-col md:flex-row md:justify-between md:items-center gap-6 mb-8'>
                                            <div>
                                                <h2 className='text-3xl font-bold text-white mb-2'>
                                                    Account Overview 🚀
                                                </h2>
                                                <p className='text-slate-300'>
                                                    Real-time wallet information
                                                </p>
                                            </div>
                                            <WalletMultiButton
                                                className='!bg-gradient-to-r !from-purple-500 !to-pink-500 !rounded-2xl !py-3 !px-6 !text-white !font-semibold hover:!from-purple-600 hover:!to-pink-600 !transition-all !duration-300 !transform hover:!scale-105 !shadow-lg'
                                            />
                                        </div>

                                        {/* Stats Grid */}
                                        <div className='grid md:grid-cols-2 gap-6'>
                                            {/* Connection Status Card */}
                                            <div className='bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-2xl p-6'>
                                                <div className='flex items-center justify-between mb-4'>
                                                    <h3 className='text-lg font-semibold text-white'>
                                                        Connection Status
                                                    </h3>
                                                    <div className={`w-3 h-3 rounded-full ${publicKey ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`}></div>
                                                </div>
                                                <div className='flex items-center justify-between'>
                                                    <span className='text-slate-300'>Wallet Connected</span>
                                                    <span className={`font-bold text-lg ${publicKey ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {publicKey ? 'YES' : 'NO'}
                                                    </span>
                                                </div>
                                                {publicKey && (
                                                    <div className='mt-4 p-3 bg-black/20 rounded-lg'>
                                                        <p className='text-xs text-slate-400 mb-1'>Public Key</p>
                                                        <p className='text-sm font-mono text-white break-all'>
                                                            {publicKey.toString()}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Balance Card */}
                                            <div className='bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-2xl p-6'>
                                                <div className='flex items-center justify-between mb-4'>
                                                    <h3 className='text-lg font-semibold text-white'>
                                                        Balance
                                                    </h3>
                                                    <span className='text-2xl'>💰</span>
                                                </div>
                                                <div className='text-center'>
                                                    <div className='text-3xl font-bold text-white mb-2'>
                                                        {balance !== null ? balance.toFixed(4) : '0.0000'}
                                                    </div>
                                                    <div className='text-slate-300 text-sm'>SOL</div>
                                                    {balance !== null && balance > 0 && (
                                                        <div className='mt-3 text-xs text-slate-400'>
                                                            ≈ ${(balance * 23.5).toFixed(2)} USD
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Additional Info */}
                                        <div className='mt-8 p-4 bg-slate-800/50 rounded-xl border border-slate-700'>
                                            <div className='flex items-center gap-2 text-slate-300 text-sm'>
                                                <span className='w-2 h-2 bg-green-400 rounded-full'></span>
                                                Connected to Solana Devnet
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </main>
                    </WalletModalProvider>
                </walletAdapterReact.WalletProvider>
            </walletAdapterReact.ConnectionProvider>
        </>
    );
}

export default Starter;