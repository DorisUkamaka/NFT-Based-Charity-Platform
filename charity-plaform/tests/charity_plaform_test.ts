import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

// Test NFT minting functionality
Clarinet.test({
    name: "Ensure that users can mint NFTs",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const user1 = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall(
                'charity-platform',
                'mint',
                [
                    types.utf8('https://example.com/nft/1'),
                    types.utf8('art')
                ],
                user1.address
            )
        ]);
        
        // Check successful response
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok u1)');
        
        // Check NFT ownership
        let call = chain.callReadOnlyFn(
            'charity-platform',
            'get-owner',
            [types.uint(1)],
            deployer.address
        );
        assertEquals(call.result, `(some ${user1.address})`);
    },
});

// Test NFT transfer functionality
Clarinet.test({
    name: "Ensure that NFT owners can transfer their NFTs",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const user1 = accounts.get('wallet_1')!;
        const user2 = accounts.get('wallet_2')!;
        
        // First mint an NFT
        let block = chain.mineBlock([
            Tx.contractCall(
                'charity-platform',
                'mint',
                [
                    types.utf8('https://example.com/nft/1'),
                    types.utf8('art')
                ],
                user1.address
            )
        ]);
        
        // Then transfer it
        block = chain.mineBlock([
            Tx.contractCall(
                'charity-platform',
                'transfer',
                [
                    types.uint(1),
                    types.principal(user2.address)
                ],
                user1.address
            )
        ]);
        
        // Check successful response
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok true)');
        
        // Check new NFT ownership
        let call = chain.callReadOnlyFn(
            'charity-platform',
            'get-owner',
            [types.uint(1)],
            deployer.address
        );
        assertEquals(call.result, `(some ${user2.address})`);
    },
});

// Test NFT listing functionality
Clarinet.test({
    name: "Ensure that NFT owners can list NFTs for sale",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const user1 = accounts.get('wallet_1')!;
        
        // First mint an NFT
        let block = chain.mineBlock([
            Tx.contractCall(
                'charity-platform',
                'mint',
                [
                    types.utf8('https://example.com/nft/1'),
                    types.utf8('art')
                ],
                user1.address
            )
        ]);
        
        // Then list it for sale
        const listPrice = 1000000; // 1 STX
        block = chain.mineBlock([
            Tx.contractCall(
                'charity-platform',
                'list-for-sale',
                [
                    types.uint(1),
                    types.uint(listPrice)
                ],
                user1.address
            )
        ]);
        
        // Check successful response
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok true)');
        
        // Check price
        let call = chain.callReadOnlyFn(
            'charity-platform',
            'get-price',
            [types.uint(1)],
            deployer.address
        );
        assertEquals(call.result, `(some u${listPrice})`);
    },
});

// Test campaign creation
Clarinet.test({
    name: "Ensure that contract owner can create charity campaigns",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        const campaignName = "Save the Planet";
        const campaignDesc = "Help us save the planet by planting trees";
        const goal = 1000000000; // 1000 STX
        const duration = 1000; // blocks
        
        let block = chain.mineBlock([
            Tx.contractCall(
                'charity-platform',
                'create-charity-campaign',
                [
                    types.utf8(campaignName),
                    types.utf8(campaignDesc),
                    types.uint(goal),
                    types.uint(duration)
                ],
                deployer.address
            )
        ]);
        
        // Check successful response
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok u1)');
        
        // Check campaign details
        let call = chain.callReadOnlyFn(
            'charity-platform',
            'get-campaign-details',
            [types.uint(1)],
            deployer.address
        );
        
        // Parse the result for verification
        const result = call.result.replace(/\s+/g, ' ').trim();
        assertEquals(
            result.includes(`(some {name: "${campaignName}", description: "${campaignDesc}", goal: u${goal}`),
            true
        );
    },
});

// Test that only contract owner can create campaigns
Clarinet.test({
    name: "Ensure that only contract owner can create charity campaigns",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const user1 = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall(
                'charity-platform',
                'create-charity-campaign',
                [
                    types.utf8("Test Campaign"),
                    types.utf8("This should fail"),
                    types.uint(100000000),
                    types.uint(1000)
                ],
                user1.address
            )
        ]);
        
        // Check error response
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(err u100)'); // err-owner-only
    },
});

// Test donation to campaign
Clarinet.test({
    name: "Ensure that users can donate to campaigns",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const user1 = accounts.get('wallet_1')!;
        const charityAddress = 'SP000000000000000000002Q6VF78';
        
        // First create a campaign
        let block = chain.mineBlock([
            Tx.contractCall(
                'charity-platform',
                'create-charity-campaign',
                [
                    types.utf8("Donation Test"),
                    types.utf8("Testing donations"),
                    types.uint(1000000000),
                    types.uint(1000)
                ],
                deployer.address
            )
        ]);
        
        // Then donate to it
        const donationAmount = 50000000; // 50 STX
        block = chain.mineBlock([
            Tx.contractCall(
                'charity-platform',
                'donate-to-campaign',
                [
                    types.uint(1),
                    types.uint(donationAmount)
                ],
                user1.address
            )
        ]);
        
        // Check successful donation
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok true)');
        
        // Check updated campaign stats
        let call = chain.callReadOnlyFn(
            'charity-platform',
            'get-campaign-details',
            [types.uint(1)],
            deployer.address
        );
        
        const result = call.result.replace(/\s+/g, ' ').trim();
        assertEquals(
            result.includes(`raised: u${donationAmount}`),
            true
        );
        
        // Check donation record
        call = chain.callReadOnlyFn(
            'charity-platform',
            'get-user-donation-history',
            [
                types.principal(user1.address),
                types.uint(1)
            ],
            deployer.address
        );
        
        const donationRecord = call.result.replace(/\s+/g, ' ').trim();
        assertEquals(
            donationRecord.includes(`(some {amount: u${donationAmount}`),
            true
        );
    },
});

// Test NFT buying with charity percentage
Clarinet.test({
    name: "Ensure NFT purchases allocate the correct donation percentage",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const seller = accounts.get('wallet_1')!;
        const buyer = accounts.get('wallet_2')!;
        const charityAddress = 'SP000000000000000000002Q6VF78';
        
        // First mint an NFT
        let block = chain.mineBlock([
            Tx.contractCall(
                'charity-platform',
                'mint',
                [
                    types.utf8('https://example.com/nft/1'),
                    types.utf8('art')
                ],
                seller.address
            )
        ]);
        
        // List for sale
        const listPrice = 100000000; // 100 STX
        block = chain.mineBlock([
            Tx.contractCall(
                'charity-platform',
                'list-for-sale',
                [
                    types.uint(1),
                    types.uint(listPrice)
                ],
                seller.address
            )
        ]);
        
        // Check donation percentage - default should be 20%
        let call = chain.callReadOnlyFn(
            'charity-platform',
            'get-donation-percentage',
            [],
            deployer.address
        );
        
        // Then buy the NFT
        block = chain.mineBlock([
            Tx.contractCall(
                'charity-platform',
                'buy-nft',
                [types.uint(1)],
                buyer.address
            )
        ]);
        
        // Check successful purchase
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok true)');
        
        // Check ownership transferred
        call = chain.callReadOnlyFn(
            'charity-platform',
            'get-owner',
            [types.uint(1)],
            deployer.address
        );
        assertEquals(call.result, `(some ${buyer.address})`);
        
        // Price should be removed after purchase
        call = chain.callReadOnlyFn(
            'charity-platform',
            'get-price',
            [types.uint(1)],
            deployer.address
        );
        assertEquals(call.result, 'none');
        
        // Donation total should be increased by 20% of price (20 STX)
        call = chain.callReadOnlyFn(
            'charity-platform',
            'get-total-donations',
            [],
            deployer.address
        );
        assertEquals(call.result, `u${listPrice * 0.2}`);
    },
});

// Test donating NFT to campaign
Clarinet.test({
    name: "Ensure users can donate NFTs to campaigns",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const user1 = accounts.get('wallet_1')!;
        
        // First create a campaign
        let block = chain.mineBlock([
            Tx.contractCall(
                'charity-platform',
                'create-charity-campaign',
                [
                    types.utf8("NFT Donation Campaign"),
                    types.utf8("Donate your NFTs for a good cause"),
                    types.uint(1000000000),
                    types.uint(1000)
                ],
                deployer.address
            )
        ]);
        
        // Mint an NFT
        block = chain.mineBlock([
            Tx.contractCall(
                'charity-platform',
                'mint',
                [
                    types.utf8('https://example.com/nft/1'),
                    types.utf8('art')
                ],
                user1.address
            )
        ]);
        
        // List it for a price first to give it value
        const nftValue = 50000000; // 50 STX
        block = chain.mineBlock([
            Tx.contractCall(
                'charity-platform',
                'list-for-sale',
                [
                    types.uint(1),
                    types.uint(nftValue)
                ],
                user1.address
            )
        ]);
        
        // Donate the NFT to the campaign
        block = chain.mineBlock([
            Tx.contractCall(
                'charity-platform',
                'donate-nft-to-campaign',
                [
                    types.uint(1),
                    types.uint(1)
                ],
                user1.address
            )
        ]);
        
        // Check successful donation
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok true)');
        
        // Check campaign NFT list
        let call = chain.callReadOnlyFn(
            'charity-platform',
            'get-campaign-nfts',
            [types.uint(1)],
            deployer.address
        );
        assertEquals(call.result.includes('u1'), true);
        
        // Check user participation stats
        call = chain.callReadOnlyFn(
            'charity-platform',
            'get-user-campaign-stats',
            [
                types.principal(user1.address),
                types.uint(1)
            ],
            deployer.address
        );
        
        const result = call.result.replace(/\s+/g, ' ').trim();
        assertEquals(result.includes(`nfts-donated: [u1]`), true);
        assertEquals(result.includes(`total-value: u${nftValue}`), true);
        
        // Check campaign raised amount
        call = chain.callReadOnlyFn(
            'charity-platform',
            'get-campaign-details',
            [types.uint(1)],
            deployer.address
        );
        
        const campaignResult = call.result.replace(/\s+/g, ' ').trim();
        assertEquals(campaignResult.includes(`raised: u${nftValue}`), true);
    },
});

// Test campaign milestone features
Clarinet.test({
    name: "Ensure contract owner can create milestones and users can claim rewards",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const user1 = accounts.get('wallet_1')!;
        
        // Create a campaign
        let block = chain.mineBlock([
            Tx.contractCall(
                'charity-platform',
                'create-charity-campaign',
                [
                    types.utf8("Milestone Campaign"),
                    types.utf8("Campaign with milestones"),
                    types.uint(1000000000),
                    types.uint(1000)
                ],
                deployer.address
            )
        ]);
        
        // Add a milestone
        const milestoneTargetAmount = 50000000; // 50 STX
        block = chain.mineBlock([
            Tx.contractCall(
                'charity-platform',
                'add-campaign-milestone',
                [
                    types.uint(1), // campaign-id
                    types.uint(1), // milestone-id
                    types.utf8("First milestone"),
                    types.uint(milestoneTargetAmount),
                    types.utf8("https://example.com/reward/1")
                ],
                deployer.address
            )
        ]);
        
        // Check successful milestone creation
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok true)');
        
        // Mint an NFT and list it
        block = chain.mineBlock([
            Tx.contractCall(
                'charity-platform',
                'mint',
                [
                    types.utf8('https://example.com/nft/1'),
                    types.utf8('art')
                ],
                user1.address
            ),
            Tx.contractCall(
                'charity-platform',
                'list-for-sale',
                [
                    types.uint(1),
                    types.uint(milestoneTargetAmount)
                ],
                user1.address
            )
        ]);
        
        // Donate the NFT to reach the milestone
        block = chain.mineBlock([
            Tx.contractCall(
                'charity-platform',
                'donate-nft-to-campaign',
                [
                    types.uint(1),
                    types.uint(1)
                ],
                user1.address
            )
        ]);
        
        // Claim milestone reward
        block = chain.mineBlock([
            Tx.contractCall(
                'charity-platform',
                'check-and-claim-milestone-reward',
                [
                    types.uint(1), // campaign-id
                    types.uint(1)  // milestone-id
                ],
                user1.address
            )
        ]);
        
        // Check successful reward claim (should return NFT token ID)
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok u2)'); // Second NFT minted
        
        // Check user rewards
        let call = chain.callReadOnlyFn(
            'charity-platform',
            'get-user-rewards',
            [types.principal(user1.address)],
            deployer.address
        );
        
        const result = call.result.replace(/\s+/g, ' ').trim();
        assertEquals(result.includes('u2'), true);
        
        // Check milestone status (should be reached)
        call = chain.callReadOnlyFn(
            'charity-platform',
            'get-campaign-milestone',
            [
                types.uint(1),
                types.uint(1)
            ],
            deployer.address
        );
        
        const milestoneResult = call.result.replace(/\s+/g, ' ').trim();
        assertEquals(milestoneResult.includes('reached: true'), true);
    },
});

// Test administrative functions
Clarinet.test({
    name: "Ensure contract owner can use administrative functions",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const newCharityAddress = accounts.get('wallet_3')!.address;
        
        // Set new charity address
        let block = chain.mineBlock([
            Tx.contractCall(
                'charity-platform',
                'set-charity-address',
                [types.principal(newCharityAddress)],
                deployer.address
            )
        ]);
        
        // Check successful update
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok true)');
        
        // Set new donation percentage
        const newPercentage = 30; // 30%
        block = chain.mineBlock([
            Tx.contractCall(
                'charity-platform',
                'set-donation-percentage',
                [types.uint(newPercentage)],
                deployer.address
            )
        ]);
        
        // Check successful update
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok true)');
        
        // Toggle pause state
        block = chain.mineBlock([
            Tx.contractCall(
                'charity-platform',
                'toggle-pause',
                [],
                deployer.address
            )
        ]);
        
        // Check successful toggle
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok true)');
        
        // Create a campaign and then end it
        block = chain.mineBlock([
            Tx.contractCall(
                'charity-platform',
                'create-charity-campaign',
                [
                    types.utf8("Admin Test Campaign"),
                    types.utf8("Testing admin functions"),
                    types.uint(1000000000),
                    types.uint(1000)
                ],
                deployer.address
            )
        ]);
        
        // End the campaign
        block = chain.mineBlock([
            Tx.contractCall(
                'charity-platform',
                'end-campaign',
                [types.uint(1)],
                deployer.address
            )
        ]);
        
        // Check successful campaign end
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok true)');
        
        // Verify campaign is marked as inactive
        let call = chain.callReadOnlyFn(
            'charity-platform',
            'get-campaign-details',
            [types.uint(1)],
            deployer.address
        );
        
        const result = call.result.replace(/\s+/g, ' ').trim();
        assertEquals(result.includes('active: false'), true);
    },
});

// Test campaign reports
Clarinet.test({
    name: "Ensure campaign reports provide correct information",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const user1 = accounts.get('wallet_1')!;
        
        // Create a campaign
        const goal = 1000000000; // 1000 STX
        let block = chain.mineBlock([
            Tx.contractCall(
                'charity-platform',
                'create-charity-campaign',
                [
                    types.utf8("Report Test Campaign"),
                    types.utf8("Testing campaign reports"),
                    types.uint(goal),
                    types.uint(1000)
                ],
                deployer.address
            )
        ]);
        
        // Donate to campaign
        const donationAmount = 250000000; // 250 STX (25% of goal)
        block = chain.mineBlock([
            Tx.contractCall(
                'charity-platform',
                'donate-to-campaign',
                [
                    types.uint(1),
                    types.uint(donationAmount)
                ],
                user1.address
            )
        ]);
        
        // Generate campaign report
        let call = chain.callReadOnlyFn(
            'charity-platform',
            'generate-campaign-report',
            [types.uint(1)],
            deployer.address
        );
        
        const result = call.result.replace(/\s+/g, ' ').trim();
        
        // Check report contains correct information
        assertEquals(result.includes(`total-raised: u${donationAmount}`), true);
        assertEquals(result.includes('goal-percentage: u25'), true); // 25% of goal
        assertEquals(result.includes('total-nfts: u0'), true); // No NFTs yet
        assertEquals(result.includes('is-active: true'), true);
    },
});

// Test failure conditions and edge cases
Clarinet.test({
    name: "Ensure proper error handling for invalid operations",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const user1 = accounts.get('wallet_1')!;
        const user2 = accounts.get('wallet_2')!;
        
        // Attempt to transfer NFT not owned by user
        let block = chain.mineBlock([
            Tx.contractCall(
                'charity-platform',
                'mint',
                [
                    types.utf8('https://example.com/nft/1'),
                    types.utf8('art')
                ],
                user1.address
            ),
            Tx.contractCall(
                'charity-platform',
                'transfer',
                [
                    types.uint(1),
                    types.principal(user2.address)
                ],
                user2.address // Not the owner
            )
        ]);
        
        // Check for error
        assertEquals(block.receipts.length, 2);
        assertEquals(block.receipts[0].result, '(ok u1)');
        assertEquals(block.receipts[1].result, '(err u101)'); // err-not-token-owner
        
        // Attempt to list NFT not owned by user
        block = chain.mineBlock([
            Tx.contractCall(
                'charity-platform',
                'list-for-sale',
                [
                    types.uint(1),
                    types.uint(1000000)
                ],
                user2.address // Not the owner
            )
        ]);
        
        // Check for error
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(err u101)'); // err-not-token-owner
        
        // Attempt to donate to non-existent campaign
        block = chain.mineBlock([
            Tx.contractCall(
                'charity-platform',
                'donate-to-campaign',
                [
                    types.uint(999), // Non-existent campaign
                    types.uint(1000000)
                ],
                user1.address
            )
        ]);
        
        // Check for error
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(err u104)'); // err-campaign-not-found
        
        // Create a campaign then end it and try to donate
        block = chain.mineBlock([
            Tx.contractCall(
                'charity-platform',
                'create-charity-campaign',
                [
                    types.utf8("Test Campaign"),
                    types.utf8("For testing errors"),
                    types.uint(1000000000),
                    types.uint(1000)
                ],
                deployer.address
            ),
            Tx.contractCall(
                'charity-platform',
                'end-campaign',
                [types.uint(1)],
                deployer.address
            )
        ]);
        
        // Try to donate to ended campaign
        block = chain.mineBlock([
            Tx.contractCall(
                'charity-platform',
                'donate-to-campaign',
                [
                    types.uint(1),
                    types.uint(1000000)
                ],
                user1.address
            )
        ]);
        
        // Check for error
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(err u104)'); // err-campaign-not-found (inactive)
    },
});