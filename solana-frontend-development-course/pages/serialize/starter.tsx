import React, { FC, useCallback, useEffect, useState } from 'react';
import * as web3 from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { toast } from 'react-toastify';

import { StudentIntroReference } from '../../models/serialize/StudentIntroReference';
import { StudentIntroCoordinatorReference } from '../../scripts/serialize/StudentIntroCoordinatorReference';

// The main UI component for the Student Intros application.
// This component provides a form for users to introduce themselves and
// displays a paginated list of all introductions stored on the Solana blockchain.
const Starter: FC = () => {
    // Solana wallet connection and public key hooks
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();

    // Target Solana program ID
    const TARGET_PROGRAM_ID = 'HdE95RSVsdb315jfJtaykXhXY478h53X6okDupVfY9yf';

    // ---- STATE MANAGEMENT ----

    // Form state for new introduction
    const [name, setName] = useState('');
    const [thoughts, setThoughts] = useState('');

    // Display state for the list of introductions
    const [studentIntros, setStudentIntros] = useState<StudentIntroReference[]>([]);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Effect hook to fetch introductions whenever the page or search query changes.
    useEffect(() => {
        // Set loading state to true to provide user feedback
        setIsLoading(true);
        StudentIntroCoordinatorReference.fetchPage(
            connection,
            page,
            5, // 5 items per page
            search,
            search !== '' // Force reload if search is active
        ).then(intros => {
            setStudentIntros(intros);
        }).finally(() => {
            // Set loading state to false after fetching is complete
            setIsLoading(false);
        });
    }, [page, search, connection]);

    // Handles the form submission to create a new introduction.
    const createSubmission = useCallback(async (event: React.FormEvent) => {
        event.preventDefault();

        if (!publicKey) {
            toast.error('Please connect your wallet to submit an introduction.');
            return;
        }

        // Create a new StudentIntroReference object with form data
        const studentIntro = new StudentIntroReference(name, thoughts);

        // Submit the transaction to the Solana network
        await handleTransactionSubmit(studentIntro);

        // Clear form fields after submission
        setName('');
        setThoughts('');
    }, [publicKey, name, thoughts, connection, sendTransaction]);

    // Constructs and sends the transaction to the Solana program.
    const handleTransactionSubmit = async (studentIntro: StudentIntroReference) => {
        if (!publicKey) {
            toast.error('Wallet not connected!');
            return;
        }

        // 1. Serialize the studentIntro object into a Buffer.
        // This converts our JavaScript object into a byte array that the Solana program can understand.
        const buffer = studentIntro.serialize();

        // 2. Create a new transaction.
        const transaction = new web3.Transaction();

        // 3. Find the Program Derived Address (PDA) for the student's introduction account.
        // A PDA is a special type of address derived from the program ID and a set of seeds.
        // Here, we use the user's public key as a seed to create a unique address for their introduction.
        const [pda] = web3.PublicKey.findProgramAddressSync(
            [publicKey.toBuffer()],
            new web3.PublicKey(TARGET_PROGRAM_ID)
        );

        // 4. Create the transaction instruction.
        // This instruction tells the Solana runtime what to do.
        const instruction = new web3.TransactionInstruction({
            // The accounts that the instruction will read from or write to.
            keys: [
                {
                    pubkey: publicKey, // The user's wallet address (the signer).
                    isSigner: true,
                    isWritable: false,
                },
                {
                    pubkey: pda, // The PDA account where the introduction data will be stored.
                    isSigner: false,
                    isWritable: true,
                },
                {
                    pubkey: web3.SystemProgram.programId, // Required by the runtime for account creation.
                    isSigner: false,
                    isWritable: false,
                },
            ],
            // The serialized data (our buffer) to be passed to the program.
            data: buffer,
            // The public key of the Solana program we want to execute.
            programId: new web3.PublicKey(TARGET_PROGRAM_ID),
        });

        // 5. Add the instruction to the transaction.
        transaction.add(instruction);

        // 6. Send the transaction to the network.
        setIsLoading(true);
        try {
            const txSignature = await sendTransaction(transaction, connection);
            toast.success(
                <a href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`} target="_blank" rel="noopener noreferrer">
                    Transaction successful! Click to view on explorer.
                </a>
            );
            // After a successful transaction, we should refresh the list.
            // We can do this by triggering the useEffect again, for example by resetting the page.
            if (page !== 1) {
                setPage(1);
            } else {
                // If already on page 1, manually refetch.
                StudentIntroCoordinatorReference.fetchPage(connection, 1, 5, '', true).then(setStudentIntros);
            }
        } catch (error) {
            toast.error('Transaction failed!');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen text-white flex flex-col items-center p-4 bg-gray-900">
            <div className="w-full max-w-4xl">
                {/* Header */}
                <header className="text-center py-8">
                    <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-pink-600">
                        Solana Student Introductions
                    </h1>
                    <p className="text-gray-400 mt-2">
                        Introduce yourself to the Solana community! Your intro is stored permanently on the blockchain.
                    </p>
                </header>

                {/* Form Section */}
                <section className="mb-8">
                    <form
                        onSubmit={createSubmission}
                        className="rounded-lg p-6 bg-gray-800 border border-gray-700 shadow-lg"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold text-2xl text-white">
                                Introduce yourself ✌️
                            </h2>
                            <button
                                type="submit"
                                disabled={!publicKey || isLoading || name === '' || thoughts === ''}
                                className="disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg px-6 py-2 font-semibold transition-all duration-200"
                            >
                                {isLoading ? 'Submitting...' : 'Submit'}
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">What's your name?</label>
                                <input
                                    id="name"
                                    type="text"
                                    placeholder="e.g., Jane Doe"
                                    className="py-2 px-3 w-full bg-gray-700 text-white rounded-md outline-none border-2 border-transparent focus:border-blue-500 transition"
                                    onChange={event => setName(event.target.value)}
                                    value={name}
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="thoughts" className="block text-sm font-medium text-gray-300 mb-1">What brings you to Solana?</label>
                                <input
                                    id="thoughts"
                                    type="text"
                                    placeholder="e.g., Building the future of decentralized apps!"
                                    className="py-2 px-3 w-full bg-gray-700 text-white rounded-md outline-none border-2 border-transparent focus:border-blue-500 transition"
                                    onChange={event => setThoughts(event.target.value)}
                                    value={thoughts}
                                    required
                                />
                            </div>
                        </div>
                    </form>
                </section>

                {/* List of Responses Section */}
                <section>
                    <div className="rounded-lg p-6 bg-gray-800 border border-gray-700 shadow-lg">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="font-bold text-2xl text-white">
                                Meet the Students
                            </h2>
                            <input
                                type="text"
                                placeholder="Search by name..."
                                className="py-2 px-3 w-48 bg-gray-700 text-white rounded-md outline-none border-2 border-transparent focus:border-blue-500 transition"
                                onChange={(e) => setSearch(e.target.value)}
                                value={search}
                            />
                        </div>

                        {isLoading && <div className="text-center text-gray-400">Loading introductions...</div>}

                        {!isLoading && studentIntros.length === 0 && (
                            <div className="text-center text-gray-400 py-8">
                                No introductions found. Why not be the first?
                            </div>
                        )}

                        {!isLoading && (
                            <div className="space-y-4">
                                {studentIntros.map((intro, index) => (
                                    <div key={index} className="bg-gray-700 p-4 rounded-lg border border-gray-600">
                                        <h4 className="text-lg font-semibold text-blue-400">{intro.name}</h4>
                                        <p className="text-gray-300 mt-1">{intro.message}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Pagination Controls */}
                        <div className="mt-8 flex justify-between items-center">
                            <button
                                onClick={() => setPage(page - 1)}
                                disabled={page <= 1 || isLoading}
                                className="disabled:opacity-50 disabled:cursor-not-allowed bg-gray-600 hover:bg-gray-500 text-white rounded-lg px-4 py-2 font-semibold transition-all"
                            >
                                Previous
                            </button>
                            <span className="text-gray-400">Page {page}</span>
                            <button
                                onClick={() => setPage(page + 1)}
                                disabled={studentIntros.length < 5 || isLoading}
                                className="disabled:opacity-50 disabled:cursor-not-allowed bg-gray-600 hover:bg-gray-500 text-white rounded-lg px-6 py-2 font-semibold transition-all"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
};

export default Starter;