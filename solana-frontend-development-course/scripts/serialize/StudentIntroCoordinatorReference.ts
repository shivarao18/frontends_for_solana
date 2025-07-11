import bs58 from 'bs58'
import * as web3 from '@solana/web3.js'

import { StudentIntroReference } from '../../models/serialize/StudentIntroReference'

/**
 * The `StudentIntroCoordinator` class serves as a manager for fetching and handling
 * student introduction data from the Solana blockchain. It is designed with static methods,
 * meaning you can call its methods directly on the class itself without needing to create an instance.
 * This class is responsible for two main asynchronous operations:
 *
 * 1.  `prefetchAccounts`: This method scans the blockchain for all accounts associated with the
 *     student introductions program. It can filter these accounts based on a search string.
 *     The public keys of these accounts are then stored in a static `accounts` array,
 *     acting as a cache. This prefetching mechanism is an optimization to avoid repeatedly
 *     querying all program accounts, which can be slow.
 *
 * 2.  `fetchPage`: This method provides a paginated way to get the actual data for the student
 *     introductions. It uses the cached list of public keys from `prefetchAccounts` and fetches
 *     the detailed account information for a specific page. It then deserializes this data
 *     into structured `StudentIntro` objects that are easy to work with in the application.
 */

// This is the unique identifier (public key) of the Solana program that stores all the student introductions.
// All the data we want to fetch is owned by this program.
const STUDENT_INTRO_PROGRAM_ID = 'HdE95RSVsdb315jfJtaykXhXY478h53X6okDupVfY9yf'

export class StudentIntroCoordinatorReference {
    // This static array holds the public keys of all student introduction accounts that match the last search criteria.
    // It acts as a cache to avoid re-fetching the same list of accounts from the network repeatedly.
    static accounts: web3.PublicKey[] = []

    /**
     * `prefetchAccounts` is responsible for retrieving and caching a list of account public keys
     * from the student introductions program. It allows for filtering accounts based on a search term.
     * @param connection - An active connection to the Solana network.
     * @param search - A string to filter the accounts by. If empty, all accounts for the program are fetched.
     */
    static async prefetchAccounts(connection: web3.Connection, search: string) {
        // We use `getProgramAccounts` to query the Solana RPC node for all accounts owned by our program.
        const accounts = await connection.getProgramAccounts(
            new web3.PublicKey(STUDENT_INTRO_PROGRAM_ID),
            {
                // `dataSlice` is an optimization. Instead of downloading the entire data for each account (which can be large),
                // we're only asking for a small chunk of it. Here, we're fetching 12 bytes starting from the 2nd byte (offset 1).
                // This small slice contains just enough information to sort the accounts.
                dataSlice: { offset: 1, length: 12 },
                // `filters` allow us to ask the RPC node to filter the accounts for us on the server-side,
                // which is much more efficient than fetching all accounts and filtering them on the client-side.
                filters: search === '' ? [] : [
                    {
                        // `memcmp` (memory comparison) is a filter that compares a slice of the account's data with a given set of bytes.
                        memcmp:
                        {
                            // We start the comparison at an offset of 5 bytes into the account data.
                            // This is because the account data is structured with some metadata before the actual student name.
                            offset: 5,
                            // The `bytes` to compare against are derived from the `search` string.
                            // We first convert the string to a `Buffer` (a representation of binary data),
                            // and then we encode it into a Base58 string, which is the format `memcmp` expects.
                            bytes: bs58.encode(new TextEncoder().encode(search))
                        }
                    }
                ]
            }
        );

        // After fetching the accounts, we sort them. The sorting is based on the student's name,
        // which is part of the account data. This ensures a consistent and predictable order for pagination.
        accounts.sort((a, b) => {
            // The first 4 bytes of the data slice contain the length of the student's name (as a 32-bit unsigned integer).
            // We read this length to know how many bytes represent the name.
            const lengthA = a.account.data.readUInt32LE(0)
            const lengthB = b.account.data.readUInt32LE(0)

            // We then extract the name data itself from the account data.
            // Borsh serialization for a string includes its length as a `u32` at the beginning.
            // We create a slice of the data starting 4 bytes in (to skip the length) and with the determined length.
            const dataA = a.account.data.slice(4, 4 + lengthA)
            const dataB = b.account.data.slice(4, 4 + lengthB)

            // `compare` is a method on Buffers that lexicographically compares two buffers.
            // It returns -1, 0, or 1, which is what the `sort` function uses to order the elements.
            // We perform a manual comparison to avoid type issues with Buffer definitions.
            const len = Math.min(dataA.length, dataB.length);
            for (let i = 0; i < len; i++) {
                if (dataA[i] < dataB[i]) {
                    return -1;
                }
                if (dataA[i] > dataB[i]) {
                    return 1;
                }
            }
            return dataA.length - dataB.length;
        });

        // Once the accounts are sorted, we extract just their public keys and store them in our static `accounts` cache.
        // We don't need to keep the sliced data in memory anymore.
        this.accounts = accounts.map(account => account.pubkey);
    };

    /**
     * `fetchPage` retrieves a specific "page" of student introductions.
     * It uses the cached public keys from `prefetchAccounts` and fetches the full data for that page.
     * @param connection - An active connection to the Solana network.
     * @param page - The page number to fetch (1-indexed).
     * @param perPage - The number of introductions to fetch per page.
     * @param search - The search string to filter by. This is passed to `prefetchAccounts` if a refetch is needed.
     * @param reload - A boolean flag. If true, it forces a refetch of the accounts list, ignoring the cache.
     * @returns A promise that resolves to an array of `StudentIntro` objects for the requested page.
     */
    static async fetchPage(connection: web3.Connection, page: number, perPage: number, search: string, reload: boolean = false): Promise<StudentIntroReference[]> {
        // First, we check if our accounts cache is empty or if a reload is being forced.
        // If either is true, we need to call `prefetchAccounts` to populate/update the cache.
        if (this.accounts.length === 0 || reload) {
            await this.prefetchAccounts(connection, search)
        }

        // We calculate which slice of the `accounts` array corresponds to the requested page.
        // For example, for page 2 with 5 items per page, this would be `slice(5, 10)`.
        const paginatedPublicKeys = this.accounts.slice(
            (page - 1) * perPage,
            page * perPage,
        );

        // If the calculated slice is empty, it means the requested page has no accounts (e.g., a page number that's too high).
        // In this case, we can return an empty array right away.
        if (paginatedPublicKeys.length === 0) {
            return []
        }

        // Now, we use `getMultipleAccountsInfo` to fetch the full account data for the public keys on the current page.
        // This is much more efficient than fetching them one by one in a loop, as it batches the request to the RPC node.
        const accounts = await connection.getMultipleAccountsInfo(paginatedPublicKeys);

        // We process the array of account infos we received from the network.
        // We use `reduce` to build up an array of `StudentIntro` objects.
        const studentIntros = accounts.reduce((accum: StudentIntroReference[], account) => {
            // For each account info, we deserialize its data from the binary format into a structured `StudentIntroReference` object.
            // The `deserialize` method handles the logic of parsing the raw buffer.
            const studentIntro = StudentIntroReference.deserialize(account?.data);

            // It's possible for an account to not be found (e.g., if it was deleted between the prefetch and this call),
            // or for its data to be invalid. If deserialization fails, it will return `null`. We simply skip these.
            if (!studentIntro) {
                return accum
            }

            // If deserialization is successful, we add the new `StudentIntro` object to our accumulator array.
            return [...accum, studentIntro];
        }, []);

        // Finally, we return the array of populated `StudentIntro` objects.
        return studentIntros;
    };
};