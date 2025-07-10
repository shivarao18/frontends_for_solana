import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import * as walletAdapterWallets from '@solana/wallet-adapter-wallets'
import * as web3 from '@solana/web3.js';
require('@solana/wallet-adapter-react-ui/styles.css');

const WalletContextProvider = ({ children }) => {

    // Use a more reliable devnet endpoint - try multiple options
    const endpoint = process.env.NEXT_PUBLIC_RPC_ENDPOINT ||
        'https://api.devnet.solana.com' ||
        web3.clusterApiUrl('devnet');

    const wallets = [
        new walletAdapterWallets.PhantomWalletAdapter()
    ];

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets}>
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

export default WalletContextProvider;