import React, { useState, useEffect, useCallback } from 'react';
import * as web3 from '@solana/web3.js';
import { toast } from 'react-toastify';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { ExternalLinkIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/outline';

const Starter = () => {
    // ========================================
    // STATE MANAGEMENT
    // ========================================

    // State to store the recipient's wallet address
    const [recipientAddress, setRecipientAddress] = useState('');

    // State to store the amount of SOL to send
    const [amount, setAmount] = useState('');

    // State to track the user's current wallet balance
    const [balance, setBalance] = useState(0);

    // State to store the transaction signature after successful transfer
    const [txSig, setTxSig] = useState('');

    // State to track if a transaction is currently being processed
    const [isLoading, setIsLoading] = useState(false);

    // State to store any error messages
    const [error, setError] = useState('');

    // State to track if the recipient address is valid
    const [isValidAddress, setIsValidAddress] = useState(false);

    // ========================================
    // WALLET & CONNECTION HOOKS
    // ========================================

    // Get the connection to the Solana network
    const { connection } = useConnection();

    // Get wallet information and functions:
    // - publicKey: The user's wallet address (null if not connected)
    // - sendTransaction: Function to send transactions for user approval
    const { publicKey, sendTransaction } = useWallet();

    // ========================================
    // UTILITY FUNCTIONS
    // ========================================

    // Function to fetch and update the user's wallet balance
    const fetchBalance = useCallback(async () => {
        if (!connection || !publicKey) return;

        try {
            // Get account information from the Solana network
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
            toast.error('Failed to fetch wallet balance');
        }
    }, [connection, publicKey]);

    // Function to validate if a string is a valid Solana public key
    const validateSolanaAddress = (address) => {
        try {
            // Attempt to create a PublicKey object - if it fails, address is invalid
            new web3.PublicKey(address);
            return true;
        } catch (error) {
            return false;
        }
    };

    // Function to handle recipient address input changes
    const handleAddressChange = (event) => {
        const address = event.target.value;
        setRecipientAddress(address);

        // Clear any previous errors when user starts typing
        setError('');

        // Validate the address if it's not empty
        if (address.trim()) {
            setIsValidAddress(validateSolanaAddress(address.trim()));
        } else {
            setIsValidAddress(false);
        }
    };

    // Function to handle amount input changes
    const handleAmountChange = (event) => {
        const value = event.target.value;
        setAmount(value);

        // Clear errors when user starts typing
        setError('');
    };

    // ========================================
    // MAIN TRANSACTION FUNCTIONALITY
    // ========================================

    // Main function to send SOL to another wallet
    const handleSendTransaction = async (event) => {
        // Prevent form from refreshing the page
        event.preventDefault();

        // Clear any previous errors
        setError('');

        // VALIDATION CHECKS

        // Check if wallet is connected
        if (!connection || !publicKey) {
            const errorMsg = 'Please connect your wallet first!';
            toast.error(errorMsg);
            setError(errorMsg);
            return;
        }

        // Check if recipient address is provided and valid
        if (!recipientAddress.trim()) {
            const errorMsg = 'Please enter a recipient address';
            toast.error(errorMsg);
            setError(errorMsg);
            return;
        }

        if (!isValidAddress) {
            const errorMsg = 'Please enter a valid Solana address';
            toast.error(errorMsg);
            setError(errorMsg);
            return;
        }

        // Check if amount is provided and valid
        if (!amount || parseFloat(amount) <= 0) {
            const errorMsg = 'Please enter a valid amount greater than 0';
            toast.error(errorMsg);
            setError(errorMsg);
            return;
        }

        // Check if user has sufficient balance
        const amountToSend = parseFloat(amount);
        if (amountToSend > balance) {
            const errorMsg = `Insufficient balance. You have ${balance.toFixed(4)} SOL`;
            toast.error(errorMsg);
            setError(errorMsg);
            return;
        }

        // Check if user is trying to send to themselves
        if (recipientAddress.trim() === publicKey.toString()) {
            const errorMsg = 'Cannot send SOL to yourself';
            toast.error(errorMsg);
            setError(errorMsg);
            return;
        }

        // Set loading state to show transaction is processing
        setIsLoading(true);

        try {
            // STEP 1: Create the recipient's public key object
            const recipientPubkey = new web3.PublicKey(recipientAddress.trim());

            // STEP 2: Create a new transaction
            const transaction = new web3.Transaction();

            // STEP 3: Create a transfer instruction
            // This tells Solana to move SOL from one account to another
            const transferInstruction = web3.SystemProgram.transfer({
                fromPubkey: publicKey,                                    // From: user's wallet
                toPubkey: recipientPubkey,                               // To: recipient's wallet
                lamports: amountToSend * web3.LAMPORTS_PER_SOL,         // Amount: convert SOL to lamports
            });

            // STEP 4: Add the instruction to the transaction
            transaction.add(transferInstruction);

            // STEP 5: Send the transaction to the user's wallet for approval
            toast.info('Please approve the transaction in your wallet...');

            const signature = await sendTransaction(transaction, connection);

            // STEP 6: Transaction successful!
            setTxSig(signature);
            toast.success(`🎉 Successfully sent ${amountToSend} SOL!`);

            // Update the balance to reflect the sent amount
            setBalance(prevBalance => prevBalance - amountToSend);

            // Clear the form
            setRecipientAddress('');
            setAmount('');
            setIsValidAddress(false);

            // Refresh the actual balance from the network after a moment
            setTimeout(fetchBalance, 2000);

        } catch (err) {
            // Handle any errors that occurred during the transaction
            console.error('Transaction error:', err);

            let errorMsg = 'Transaction failed. Please try again.';

            // Provide more specific error messages based on the error type
            if (err.message?.includes('User rejected')) {
                errorMsg = 'Transaction was cancelled by user';
            } else if (err.message?.includes('insufficient funds')) {
                errorMsg = 'Insufficient funds for transaction';
            } else if (err.message?.includes('blockhash')) {
                errorMsg = 'Transaction expired. Please try again.';
            } else if (err.message) {
                errorMsg = err.message;
            }

            toast.error(errorMsg);
            setError(errorMsg);
        } finally {
            // Always reset loading state when done
            setIsLoading(false);
        }
    };

    // ========================================
    // EFFECTS (AUTO-RUNNING CODE)
    // ========================================

    // Effect to fetch balance when wallet connects or changes
    useEffect(() => {
        fetchBalance();
    }, [fetchBalance]);

    // ========================================
    // RENDER HELPERS
    // ========================================

    // Function to render the wallet connection status
    const renderConnectionStatus = () => {
        if (!publicKey) {
            return (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                        <ExclamationCircleIcon className="w-5 h-5 text-red-400 mr-3" />
                        <span className="text-red-200">Wallet not connected</span>
                    </div>
                    <p className="text-sm text-red-300 mt-2">
                        Please connect your wallet to send SOL
                    </p>
                </div>
            );
        }

        return (
            <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <CheckCircleIcon className="w-5 h-5 text-green-400 mr-3" />
                        <span className="text-green-200">Wallet connected</span>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-green-300">Available Balance</p>
                        <p className="text-xl font-bold text-green-200">
                            {balance.toFixed(4)} SOL
                        </p>
                    </div>
                </div>
                <p className="text-sm text-green-300 mt-2">
                    {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}
                </p>
            </div>
        );
    };

    // Function to render input validation feedback
    const renderAddressValidation = () => {
        if (!recipientAddress) return null;

        if (isValidAddress) {
            return (
                <div className="flex items-center mt-2 text-green-400 text-sm">
                    <CheckCircleIcon className="w-4 h-4 mr-1" />
                    Valid Solana address
                </div>
            );
        } else {
            return (
                <div className="flex items-center mt-2 text-red-400 text-sm">
                    <ExclamationCircleIcon className="w-4 h-4 mr-1" />
                    Invalid Solana address
                </div>
            );
        }
    };

    // ========================================
    // MAIN COMPONENT RENDER
    // ========================================

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4">
            <div className="max-w-2xl mx-auto">
                {/* Header Section */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">
                        💸 Send SOL
                    </h1>
                    <p className="text-gray-300">
                        Transfer SOL tokens to any Solana wallet address
                    </p>
                </div>

                {/* Main Card */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 shadow-2xl">
                    {/* Connection Status */}
                    {renderConnectionStatus()}

                    {/* Error Display */}
                    {error && (
                        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
                            <div className="flex items-center">
                                <ExclamationCircleIcon className="w-5 h-5 text-red-400 mr-2" />
                                <p className="text-red-200">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Send SOL Form */}
                    <form onSubmit={handleSendTransaction} className="space-y-6">
                        {/* Recipient Address Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Recipient Address
                            </label>
                            <input
                                type="text"
                                value={recipientAddress}
                                onChange={handleAddressChange}
                                placeholder="Enter Solana wallet address (e.g., 7xKX...y8Hs)"
                                className={`w-full px-4 py-3 rounded-xl bg-gray-700/50 border ${recipientAddress
                                    ? isValidAddress
                                        ? 'border-green-500'
                                        : 'border-red-500'
                                    : 'border-gray-600'
                                    } text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200`}
                            />
                            {renderAddressValidation()}
                        </div>

                        {/* Amount Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Amount (SOL)
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={handleAmountChange}
                                    placeholder="0.00"
                                    min="0"
                                    step="0.0001"
                                    className="w-full px-4 py-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200"
                                />
                                {/* Max Button */}
                                {balance > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setAmount(balance.toString())}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-400 hover:text-purple-300 text-sm font-medium"
                                    >
                                        MAX
                                    </button>
                                )}
                            </div>
                            {amount && balance > 0 && (
                                <div className="flex justify-between text-sm text-gray-400 mt-2">
                                    <span>Sending: {amount} SOL</span>
                                    <span>Remaining: {(balance - parseFloat(amount || 0)).toFixed(4)} SOL</span>
                                </div>
                            )}
                        </div>

                        {/* Send Button */}
                        <button
                            type="submit"
                            disabled={!publicKey || !isValidAddress || !amount || parseFloat(amount) <= 0 || isLoading}
                            className={`
                                w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200
                                ${!publicKey || !isValidAddress || !amount || parseFloat(amount) <= 0 || isLoading
                                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-1'
                                }
                            `}
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-2"></div>
                                    Sending Transaction...
                                </div>
                            ) : !publicKey ? (
                                'Connect Wallet First'
                            ) : !isValidAddress || !amount ? (
                                'Enter Valid Details'
                            ) : (
                                `Send ${amount || '0'} SOL`
                            )}
                        </button>

                        {/* Information Box */}
                        <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
                            <h3 className="text-blue-200 font-semibold mb-2">💡 How to send SOL:</h3>
                            <ul className="text-sm text-blue-300 space-y-1">
                                <li>• Enter the recipient's Solana wallet address</li>
                                <li>• Specify the amount of SOL to send</li>
                                <li>• Click "Send SOL" and approve in your wallet</li>
                                <li>• Transaction will be processed on Solana network</li>
                            </ul>
                        </div>
                    </form>

                    {/* Transaction Result */}
                    {txSig && (
                        <div className="mt-6 bg-green-500/20 border border-green-500/50 rounded-lg p-4">
                            <h3 className="text-green-200 font-semibold mb-2 flex items-center">
                                <CheckCircleIcon className="w-5 h-5 mr-2" />
                                Transaction Successful!
                            </h3>
                            <div className="space-y-2">
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
                                <p className="text-xs text-green-400">
                                    Click the signature to view on Solana Explorer
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="text-center mt-8 text-gray-400">
                    <p className="text-sm">
                        Transactions on Solana Devnet are free and for testing only.
                        <br />
                        Always double-check recipient addresses before sending.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Starter;