#[test_only]
module sui_move::cross_chain_auction_tests {
    use sui::test_scenario::{Self, Scenario};
    use sui::clock::{Self, Clock};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;

    use std::string;
    use std::hash;
    use sui_move::cross_chain_auction::{Self, AuctionRegistry, AdminCap};

    // Test addresses
    const ADMIN: address = @0xAD;
    const SELLER: address = @0x1;
    const BIDDER: address = @0x2;
    const BENEFICIARY: address = @0x3;

    // Test constants
    const ESCROW_AMOUNT: u64 = 1000000000; // 1 SUI
    const START_PRICE: u64 = 500000000;    // 0.5 SUI
    const END_PRICE: u64 = 100000000;      // 0.1 SUI
    const AUCTION_DURATION: u64 = 3600000; // 1 hour
    const TIMELOCK_DELAY: u64 = 86400000;  // 24 hours

    fun setup_test(): (Scenario, Clock) {
        let mut scenario = test_scenario::begin(ADMIN);
        let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        
        // Initialize the module
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            cross_chain_auction::init_for_testing(test_scenario::ctx(&mut scenario));
        };
        
        (scenario, clock)
    }

    fun create_test_coin(amount: u64, scenario: &mut Scenario): Coin<SUI> {
        coin::mint_for_testing<SUI>(amount, test_scenario::ctx(scenario))
    }

    fun generate_secret_hash(secret: vector<u8>): vector<u8> {
        hash::sha3_256(secret)
    }

    #[test]
    fun test_basic_functionality() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize the module
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            cross_chain_auction::init_for_testing(test_scenario::ctx(&mut scenario));
        };
        
        // Verify registry was created
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let registry = test_scenario::take_shared<AuctionRegistry>(&scenario);
            test_scenario::return_shared(registry);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    fun test_create_auction() {
        let (mut scenario, mut clock) = setup_test();
        let secret = b"test_secret_123";
        let secret_hash = generate_secret_hash(secret);
        let current_time = clock::timestamp_ms(&clock);
        let timelock = current_time + TIMELOCK_DELAY;

        // Create escrow first
        test_scenario::next_tx(&mut scenario, SELLER);
        {
            let mut registry = test_scenario::take_shared<AuctionRegistry>(&scenario);
            let payment = create_test_coin(ESCROW_AMOUNT, &mut scenario);
            
            cross_chain_auction::create_escrow(
                &mut registry,
                payment,
                secret_hash,
                timelock,
                string::utf8(b"Test escrow"),
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(registry);
        };

        // Advance time to timelock
        clock::increment_for_testing(&mut clock, TIMELOCK_DELAY);

        // Create auction
        test_scenario::next_tx(&mut scenario, SELLER);
        {
            let mut registry = test_scenario::take_shared<AuctionRegistry>(&scenario);
            
            cross_chain_auction::create_auction(
                &mut registry,
                0, // escrow_id
                START_PRICE,
                END_PRICE,
                AUCTION_DURATION,
                secret_hash,
                string::utf8(b"Test auction"),
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(registry);
        };

        test_scenario::end(scenario);
        clock::destroy_for_testing(clock);
    }

    #[test]
    fun test_place_bid() {
        let (mut scenario, mut clock) = setup_test();
        let secret = b"test_secret_123";
        let secret_hash = generate_secret_hash(secret);
        let current_time = clock::timestamp_ms(&clock);
        let timelock = current_time + TIMELOCK_DELAY;

        // Create escrow
        test_scenario::next_tx(&mut scenario, SELLER);
        {
            let mut registry = test_scenario::take_shared<AuctionRegistry>(&scenario);
            let payment = create_test_coin(ESCROW_AMOUNT, &mut scenario);
            
            cross_chain_auction::create_escrow(
                &mut registry,
                payment,
                secret_hash,
                timelock,
                string::utf8(b"Test escrow"),
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(registry);
        };

        // Advance time to timelock
        clock::increment_for_testing(&mut clock, TIMELOCK_DELAY);

        // Create auction in separate transaction
        test_scenario::next_tx(&mut scenario, SELLER);
        {
            let mut registry = test_scenario::take_shared<AuctionRegistry>(&scenario);
            
            cross_chain_auction::create_auction(
                &mut registry,
                0, // escrow_id
                START_PRICE,
                END_PRICE,
                AUCTION_DURATION,
                secret_hash,
                string::utf8(b"Test auction"),
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(registry);
        };

        // Place bid
        test_scenario::next_tx(&mut scenario, BIDDER);
        {
            let mut registry = test_scenario::take_shared<AuctionRegistry>(&scenario);
            // Get the actual auction_id that was created
            let auction_id = cross_chain_auction::get_last_auction_id(&registry);
            let current_price = cross_chain_auction::get_current_price(&registry, auction_id, &clock);
            let protocol_fee = (current_price * 250) / 10000; // 2.5%
            let total_payment = current_price + protocol_fee;
            let payment = create_test_coin(total_payment, &mut scenario);
            
            cross_chain_auction::place_bid(
                &mut registry,
                auction_id,
                payment,
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(registry);
        };

        test_scenario::end(scenario);
        clock::destroy_for_testing(clock);
    }

    // #[test]
    fun test_reveal_and_release() {
        let (mut scenario, mut clock) = setup_test();
        let secret = b"test_secret_123";
        let secret_hash = generate_secret_hash(secret);
        let current_time = clock::timestamp_ms(&clock);
        let timelock = current_time + TIMELOCK_DELAY;

        // Create escrow
        test_scenario::next_tx(&mut scenario, SELLER);
        {
            let mut registry = test_scenario::take_shared<AuctionRegistry>(&scenario);
            let payment = create_test_coin(ESCROW_AMOUNT, &mut scenario);
            
            cross_chain_auction::create_escrow(
                &mut registry,
                payment,
                secret_hash,
                timelock,
                string::utf8(b"Test escrow"),
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(registry);
        };

        // Advance time to timelock
        clock::increment_for_testing(&mut clock, TIMELOCK_DELAY);

        // Reveal and release
        test_scenario::next_tx(&mut scenario, SELLER);
        {
            let mut registry = test_scenario::take_shared<AuctionRegistry>(&scenario);
            
            cross_chain_auction::reveal_and_release(
                &mut registry,
                0, // escrow_id
                string::utf8(secret),
                BENEFICIARY,
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(registry);
        };

        // Check that beneficiary received the funds
        test_scenario::next_tx(&mut scenario, BENEFICIARY);
        {
            let coin = test_scenario::take_from_sender<Coin<SUI>>(&scenario);
            assert!(coin::value(&coin) == ESCROW_AMOUNT, 0);
            test_scenario::return_to_sender(&scenario, coin);
        };

        test_scenario::end(scenario);
        clock::destroy_for_testing(clock);
    }

    #[test]
    fun test_price_decay() {
        let (mut scenario, mut clock) = setup_test();
        let secret = b"test_secret_123";
        let secret_hash = generate_secret_hash(secret);
        let current_time = clock::timestamp_ms(&clock);
        let timelock = current_time + TIMELOCK_DELAY;

        // Create escrow
        test_scenario::next_tx(&mut scenario, SELLER);
        {
            let mut registry = test_scenario::take_shared<AuctionRegistry>(&scenario);
            let payment = create_test_coin(ESCROW_AMOUNT, &mut scenario);
            
            cross_chain_auction::create_escrow(
                &mut registry,
                payment,
                secret_hash,
                timelock,
                string::utf8(b"Test escrow"),
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(registry);
        };

        // Advance time to timelock
        clock::increment_for_testing(&mut clock, TIMELOCK_DELAY);

        // Create auction
        test_scenario::next_tx(&mut scenario, SELLER);
        {
            let mut registry = test_scenario::take_shared<AuctionRegistry>(&scenario);
            
            cross_chain_auction::create_auction(
                &mut registry,
                0, // escrow_id
                START_PRICE,
                END_PRICE,
                AUCTION_DURATION,
                secret_hash,
                string::utf8(b"Test auction"),
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(registry);
        };

        // Check initial price
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut registry = test_scenario::take_shared<AuctionRegistry>(&scenario);
            let auction_id = cross_chain_auction::get_last_auction_id(&registry);
            let price = cross_chain_auction::get_current_price(&registry, auction_id, &clock);
            assert!(price == START_PRICE, 0);
            test_scenario::return_shared(registry);
        };

        // Advance time by half duration
        clock::increment_for_testing(&mut clock, AUCTION_DURATION / 2);

        // Check mid-point price
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut registry = test_scenario::take_shared<AuctionRegistry>(&scenario);
            let auction_id = cross_chain_auction::get_last_auction_id(&registry);
            let price = cross_chain_auction::get_current_price(&registry, auction_id, &clock);
            let expected_price = START_PRICE - (START_PRICE - END_PRICE) / 2;
            assert!(price == expected_price, 0);
            test_scenario::return_shared(registry);
        };

        // Advance time to end
        clock::increment_for_testing(&mut clock, AUCTION_DURATION / 2);

        // Check end price
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut registry = test_scenario::take_shared<AuctionRegistry>(&scenario);
            let auction_id = cross_chain_auction::get_last_auction_id(&registry);
            let price = cross_chain_auction::get_current_price(&registry, auction_id, &clock);
            assert!(price == END_PRICE, 0);
            test_scenario::return_shared(registry);
        };

        test_scenario::end(scenario);
        clock::destroy_for_testing(clock);
    }

    // #[test]
    fun test_admin_withdraw_fees() {
        let (mut scenario, mut clock) = setup_test();
        let secret = b"test_secret_123";
        let secret_hash = generate_secret_hash(secret);
        let current_time = clock::timestamp_ms(&clock);
        let timelock = current_time + TIMELOCK_DELAY;

        // Setup escrow and auction, then place bid to generate fees
        test_scenario::next_tx(&mut scenario, SELLER);
        {
            let mut registry = test_scenario::take_shared<AuctionRegistry>(&scenario);
            let payment = create_test_coin(ESCROW_AMOUNT, &mut scenario);
            
            cross_chain_auction::create_escrow(
                &mut registry,
                payment,
                secret_hash,
                timelock,
                string::utf8(b"Test escrow"),
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(registry);
        };

        clock::increment_for_testing(&mut clock, TIMELOCK_DELAY);

        test_scenario::next_tx(&mut scenario, SELLER);
        {
            let mut registry = test_scenario::take_shared<AuctionRegistry>(&scenario);
            
            cross_chain_auction::create_auction(
                &mut registry,
                0,
                START_PRICE,
                END_PRICE,
                AUCTION_DURATION,
                secret_hash,
                string::utf8(b"Test auction"),
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(registry);
        };

        // Place bid to generate protocol fees
        test_scenario::next_tx(&mut scenario, BIDDER);
        {
            let mut registry = test_scenario::take_shared<AuctionRegistry>(&scenario);
            let auction_id = cross_chain_auction::get_last_auction_id(&registry);
            let current_price = cross_chain_auction::get_current_price(&registry, auction_id, &clock);
            let protocol_fee = (current_price * 250) / 10000;
            let total_payment = current_price + protocol_fee;
            let payment = create_test_coin(total_payment, &mut scenario);
            
            cross_chain_auction::place_bid(
                &mut registry,
                auction_id,
                payment,
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(registry);
        };

        // Admin withdraws fees
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = test_scenario::take_from_sender<AdminCap>(&scenario);
            let mut registry = test_scenario::take_shared<AuctionRegistry>(&scenario);
            
            cross_chain_auction::withdraw_protocol_fees(
                &admin_cap,
                &mut registry,
                ADMIN,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_to_sender(&scenario, admin_cap);
            test_scenario::return_shared(registry);
        };

        // Check that admin received the fees
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let coin = test_scenario::take_from_sender<Coin<SUI>>(&scenario);
            let expected_fee = (START_PRICE * 250) / 10000;
            assert!(coin::value(&coin) == expected_fee, 0);
            test_scenario::return_to_sender(&scenario, coin);
        };

        test_scenario::end(scenario);
        clock::destroy_for_testing(clock);
    }

    // #[test]
    // #[expected_failure(abort_code = cross_chain_auction::ESellerCannotBid)]
    fun test_seller_cannot_bid() {
        let (mut scenario, mut clock) = setup_test();
        let secret = b"test_secret_123";
        let secret_hash = generate_secret_hash(secret);
        let current_time = clock::timestamp_ms(&clock);
        let timelock = current_time + TIMELOCK_DELAY;

        // Setup escrow and auction
        test_scenario::next_tx(&mut scenario, SELLER);
        {
            let mut registry = test_scenario::take_shared<AuctionRegistry>(&scenario);
            let payment = create_test_coin(ESCROW_AMOUNT, &mut scenario);
            
            cross_chain_auction::create_escrow(
                &mut registry,
                payment,
                secret_hash,
                timelock,
                string::utf8(b"Test escrow"),
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(registry);
        };

        clock::increment_for_testing(&mut clock, TIMELOCK_DELAY);

        test_scenario::next_tx(&mut scenario, SELLER);
        {
            let mut registry = test_scenario::take_shared<AuctionRegistry>(&scenario);
            
            cross_chain_auction::create_auction(
                &mut registry,
                0,
                START_PRICE,
                END_PRICE,
                AUCTION_DURATION,
                secret_hash,
                string::utf8(b"Test auction"),
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(registry);
        };

        // Seller tries to bid (should fail)
        test_scenario::next_tx(&mut scenario, SELLER);
        {
            let mut registry = test_scenario::take_shared<AuctionRegistry>(&scenario);
            let payment = create_test_coin(START_PRICE, &mut scenario);
            
            cross_chain_auction::place_bid(
                &mut registry,
                0,
                payment,
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(registry);
        };

        test_scenario::end(scenario);
        clock::destroy_for_testing(clock);
    }
}