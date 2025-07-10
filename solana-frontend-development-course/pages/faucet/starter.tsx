import * as React from 'react';
import { toast } from 'react-toastify';
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { ExternalLinkIcon } from '@heroicons/react/outline';
import * as web3 from '@solana/web3.js';

const Starter = () => {
    // ========================================
    // STATE MANAGEMENT
    // ========================================

    // State to store the transaction signature after a successful funding
    const [txSig, setTxSig] = React.useState<string>('');

    // State to track if a transaction is currently being processed
    const [isLoading, setIsLoading] = React.useState<boolean>(false);

    // State to store any error messages
    const [error, setError] = React.useState<string>('');

    // State to track the user's wallet balance
    const [balance, setBalance] = React.useState<number | null>(null);

    // ========================================
    // WALLET & CONNECTION HOOKS
    // ========================================

    // Get the connection to the Solana network (devnet in this case)
    const { connection } = useConnection();

    // Get wallet information and functions:
    // - publicKey: The user's wallet address (null if not connected)
    // - sendTransaction: Function to send transactions to the user's wallet for approval
    const { publicKey, sendTransaction } = useWallet();

    // ========================================
    // UTILITY FUNCTIONS
    // ========================================

    // Function to fetch and update the user's wallet balance
    const fetchBalance = React.useCallback(async () => {
        if (!connection || !publicKey) return;

        try {
            // Get account info from the Solana network
            const accountInfo = await connection.getAccountInfo(publicKey);
            if (accountInfo) {
                // Convert lamports (smallest unit) to SOL for display
                const balanceInSol = accountInfo.lamports / web3.LAMPORTS_PER_SOL;
                setBalance(balanceInSol);
            } else {
                setBalance(0);
            }
        } catch (err) {
            console.error('Error fetching balance:', err);
            setBalance(null);
        }
    }, [connection, publicKey]);

    // Effect to fetch balance when wallet connects or publicKey changes
    React.useEffect(() => {
        fetchBalance();
    }, [fetchBalance]);

    // ========================================
    // MAIN FAUCET FUNCTIONALITY
    // ========================================

    // Main function to fund the user's wallet with SOL
    const fundWallet = async (event: React.FormEvent) => {
        // Prevent the form from refreshing the page
        event.preventDefault();

        // Clear any previous errors
        setError('');

        // Check if wallet is connected and we have a connection to Solana
        if (!publicKey || !connection) {
            const errorMsg = 'Please connect your wallet first!';
            toast.error(errorMsg);
            setError(errorMsg);
            return;
        }

        // Set loading state to show user that transaction is processing
        setIsLoading(true);

        try {
            // STEP 1: Create a temporary keypair that will send SOL to the user
            // This is like creating a temporary wallet that will fund the user's wallet
            const sender = web3.Keypair.generate();

            // STEP 2: Check if our temporary wallet has enough SOL
            // If not, request an airdrop (free SOL on devnet for testing)
            const senderBalance = await connection.getBalance(sender.publicKey);

            if (senderBalance < web3.LAMPORTS_PER_SOL) {
                toast.info('Requesting airdrop for funding wallet...');

                // Request 2 SOL from the devnet faucet for our temporary wallet
                await connection.requestAirdrop(sender.publicKey, web3.LAMPORTS_PER_SOL * 2);

                // Wait a moment for the airdrop to be processed
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // STEP 3: Create a transaction to transfer SOL from temporary wallet to user
            const transaction = new web3.Transaction().add(
                // SystemProgram.transfer creates an instruction to transfer SOL
                web3.SystemProgram.transfer({
                    fromPubkey: sender.publicKey,    // From our temporary wallet
                    toPubkey: publicKey,             // To the user's wallet
                    lamports: web3.LAMPORTS_PER_SOL * 1  // Amount: 1 SOL
                })
            );

            // STEP 4: Send the transaction to the user's wallet for approval
            toast.info('Please approve the transaction in your wallet...');

            const signature = await sendTransaction(transaction, connection, {
                signers: [sender]  // Our temporary wallet signs the transaction
            });

            // STEP 5: Transaction successful! Update our state
            setTxSig(signature);
            toast.success('🎉 Successfully funded your wallet with 1 SOL!');

            // Refresh the balance to show the new amount
            setTimeout(fetchBalance, 2000);

        } catch (err: any) {
            // Handle any errors that occurred during the process
            console.error('Funding error:', err);
            const errorMsg = err.message || 'Failed to fund wallet. Please try again.';
            toast.error(errorMsg);
            setError(errorMsg);
        } finally {
            // Always reset loading state when done
            setIsLoading(false);
        }
    };

    // ========================================
    // RENDER HELPERS
    // ========================================

    // Function to render the connection status
    const renderConnectionStatus = () => {
        if (!publicKey) {
            return (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                        <div className="w-3 h-3 bg-red-500 rounded-full mr-3 animate-pulse"></div>
                        <span className="text-red-200">Wallet not connected</span>
                    </div>
                    <p className="text-sm text-red-300 mt-2">
                        Please connect your wallet to use the faucet
                    </p>
                </div>
            );
        }

        return (
            <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                        <span className="text-green-200">Wallet connected</span>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-green-300">Balance</p>
                        <p className="text-lg font-bold text-green-200">
                            {balance !== null ? `${balance.toFixed(4)} SOL` : 'Loading...'}
                        </p>
                    </div>
                </div>
                <p className="text-sm text-green-300 mt-2">
                    {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}
                </p>
            </div>
        );
    };

    // ========================================
    // MAIN COMPONENT RENDER
    // ========================================

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
            <div className="max-w-2xl mx-auto">
                {/* Header Section */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">
                        🚰 Solana Faucet
                    </h1>
                    <p className="text-gray-300">
                        Get free SOL tokens for testing on Solana Devnet
                    </p>
                </div>

                {/* Main Card */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 shadow-2xl">
                    {/* Connection Status */}
                    {renderConnectionStatus()}

                    {/* Error Display */}
                    {error && (
                        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
                            <p className="text-red-200">{error}</p>
                        </div>
                    )}

                    {/* Faucet Form */}
                    <form onSubmit={fundWallet} className="space-y-6">
                        <div className="text-center">
                            <h2 className="text-2xl font-semibold text-white mb-2">
                                Request Test SOL
                            </h2>
                            <p className="text-gray-400">
                                Click the button below to receive 1 SOL in your wallet
                            </p>
                        </div>

                        {/* Fund Button */}
                        <button
                            type="submit"
                            disabled={!publicKey || isLoading}
                            className={`
                                w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200
                                ${!publicKey || isLoading
                                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-1'
                                }
                            `}
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-2"></div>
                                    Processing...
                                </div>
                            ) : !publicKey ? (
                                'Connect Wallet First'
                            ) : (
                                '💰 Fund My Wallet (1 SOL)'
                            )}
                        </button>

                        {/* Information Box */}
                        <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
                            <h3 className="text-blue-200 font-semibold mb-2">ℹ️ How it works:</h3>
                            <ul className="text-sm text-blue-300 space-y-1">
                                <li>• Connect your Solana wallet</li>
                                <li>• Click the fund button</li>
                                <li>• Approve the transaction in your wallet</li>
                                <li>• Receive 1 SOL for testing</li>
                            </ul>
                        </div>
                    </form>

                    {/* Transaction Result */}
                    {txSig && (
                        <div className="mt-6 bg-green-500/20 border border-green-500/50 rounded-lg p-4">
                            <h3 className="text-green-200 font-semibold mb-2">
                                ✅ Transaction Successful!
                            </h3>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-green-300">Transaction Signature:</span>
                                <a
                                    href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center text-green-200 hover:text-white transition-colors duration-200"
                                >
                                    <span className="font-mono text-sm">
                                        {txSig.slice(0, 8)}...{txSig.slice(-8)}
                                    </span>
                                    <ExternalLinkIcon className="w-4 h-4 ml-1" />
                                </a>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="text-center mt-8 text-gray-400">
                    <p className="text-sm">
                        This faucet provides test SOL on Solana Devnet only.
                        <br />
                        These tokens have no real value.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Starter;