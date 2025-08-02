/// Module: sui_move
/// SUI Move implementation of cross-chain Dutch auction and escrow system
/// Corresponds to the EVM contracts: DutchAuctionEVM.sol and SUIEscrow.sol
module sui_move::cross_chain_auction {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::TxContext;
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::clock::{Self, Clock};
    use sui::event;
    use sui::table::{Self, Table};
    use sui::sui::SUI;
    use std::string::{Self, String};

    use std::hash;
    use std::option::Option;

    // ===== Error codes =====
    const EInvalidPrice: u64 = 1;
    const EInvalidDuration: u64 = 2;
    const EAuctionNotActive: u64 = 3;
    const EAuctionExpired: u64 = 4;
    const ESellerCannotBid: u64 = 5;
    const EInsufficientPayment: u64 = 6;
    const EAuctionNotEnded: u64 = 7;
    const EInvalidSecret: u64 = 8;
    const EEscrowNotRevealed: u64 = 9;
    const EEscrowAlreadyReleased: u64 = 10;
    const EEscrowAlreadyRefunded: u64 = 11;
    const ETimelockNotReached: u64 = 12;
    const ERevealWindowExpired: u64 = 13;
    const EUnauthorized: u64 = 14;
    const ESecretAlreadyRevealed: u64 = 15;

    // ===== Constants =====
    const REVEAL_WINDOW_MS: u64 = 86400000; // 24 hours in milliseconds
    const MAX_DURATION_MS: u64 = 604800000; // 7 days in milliseconds
    const PROTOCOL_FEE_BASIS_POINTS: u64 = 250; // 2.5%
    const BASIS_POINTS_DENOMINATOR: u64 = 10000;

    // ===== Structs =====

    /// Main auction registry object
    public struct AuctionRegistry has key {
        id: UID,
        auctions: Table<u64, Auction>,
        escrows: Table<u64, Escrow>,
        next_auction_id: u64,
        protocol_fee_balance: Balance<SUI>,
        admin: address,
    }

    /// Individual auction object
    public struct Auction has store {
        id: u64,
        escrow_id: u64,
        seller: address,
        start_price: u64,
        end_price: u64,
        start_time: u64,
        duration: u64,
        secret_hash: vector<u8>,
        is_active: bool,
        is_ended: bool,
        winner: Option<address>,
        final_price: Option<u64>,
        metadata: String,
    }

    /// Escrow object for cross-chain asset locking
    public struct Escrow has store {
        id: u64,
        secret_hash: vector<u8>,
        amount: u64,
        maker_address: address,
        timelock: u64,
        metadata: String,
        is_revealed: bool,
        is_released: bool,
        is_refunded: bool,
        revealed_secret: Option<String>,
        beneficiary: Option<address>,
        locked_balance: Balance<SUI>,
    }

    /// Capability for admin operations
    public struct AdminCap has key, store {
        id: UID,
    }

    // ===== Events =====

    public struct AuctionCreated has copy, drop {
        auction_id: u64,
        seller: address,
        escrow_id: u64,
        start_price: u64,
        end_price: u64,
        duration: u64,
    }

    public struct BidPlaced has copy, drop {
        auction_id: u64,
        bidder: address,
        price: u64,
        timestamp: u64,
    }

    public struct AuctionEnded has copy, drop {
        auction_id: u64,
        winner: Option<address>,
        final_price: Option<u64>,
    }

    public struct EscrowCreated has copy, drop {
        escrow_id: u64,
        maker: address,
        amount: u64,
        timelock: u64,
    }

    public struct SecretRevealed has copy, drop {
        escrow_id: u64,
        revealer: address,
        secret: String,
    }

    public struct EscrowReleased has copy, drop {
        escrow_id: u64,
        beneficiary: address,
        amount: u64,
    }

    public struct EscrowRefunded has copy, drop {
        escrow_id: u64,
        maker: address,
        amount: u64,
    }

    // ===== Init function =====

    fun init(ctx: &mut TxContext) {
        let admin_cap = AdminCap {
            id: object::new(ctx),
        };

        let registry = AuctionRegistry {
            id: object::new(ctx),
            auctions: table::new(ctx),
            escrows: table::new(ctx),
            next_auction_id: 0,
            protocol_fee_balance: balance::zero(),
            admin: tx_context::sender(ctx),
        };

        transfer::transfer(admin_cap, tx_context::sender(ctx));
        transfer::share_object(registry);
    }

    // ===== Escrow functions =====

    /// Create a new escrow for cross-chain transactions
    public entry fun create_escrow(
        registry: &mut AuctionRegistry,
        payment: Coin<SUI>,
        secret_hash: vector<u8>,
        timelock: u64,
        metadata: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        assert!(timelock > current_time, ETimelockNotReached);
        assert!(!vector::is_empty(&secret_hash), EInvalidSecret);

        let amount = coin::value(&payment);
        assert!(amount > 0, EInvalidPrice);

        let escrow_id = registry.next_auction_id;
        registry.next_auction_id = registry.next_auction_id + 1;

        let escrow = Escrow {
            id: escrow_id,
            secret_hash,
            amount,
            maker_address: tx_context::sender(ctx),
            timelock,
            metadata,
            is_revealed: false,
            is_released: false,
            is_refunded: false,
            revealed_secret: option::none(),
            beneficiary: option::none(),
            locked_balance: coin::into_balance(payment),
        };

        table::add(&mut registry.escrows, escrow_id, escrow);

        event::emit(EscrowCreated {
            escrow_id,
            maker: tx_context::sender(ctx),
            amount,
            timelock,
        });
    }

    /// Reveal secret to unlock escrow
    public entry fun reveal_secret(
        registry: &mut AuctionRegistry,
        escrow_id: u64,
        secret: String,
        beneficiary: address,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let escrow = table::borrow_mut(&mut registry.escrows, escrow_id);
        let current_time = clock::timestamp_ms(clock);

        assert!(!escrow.is_revealed, ESecretAlreadyRevealed);
        assert!(!escrow.is_released, EEscrowAlreadyReleased);
        assert!(!escrow.is_refunded, EEscrowAlreadyRefunded);
        assert!(current_time >= escrow.timelock, ETimelockNotReached);
        assert!(current_time <= escrow.timelock + REVEAL_WINDOW_MS, ERevealWindowExpired);

        // Verify secret hash
        let secret_bytes = string::as_bytes(&secret);
        let computed_hash = hash::sha3_256(*secret_bytes);
        assert!(computed_hash == escrow.secret_hash, EInvalidSecret);

        escrow.is_revealed = true;
        escrow.revealed_secret = option::some(secret);
        escrow.beneficiary = option::some(beneficiary);

        event::emit(SecretRevealed {
            escrow_id,
            revealer: tx_context::sender(ctx),
            secret,
        });
    }

    /// Release funds to beneficiary after secret is revealed
    public entry fun release_escrow_funds(
        registry: &mut AuctionRegistry,
        escrow_id: u64,
        ctx: &mut TxContext
    ) {
        let escrow = table::borrow_mut(&mut registry.escrows, escrow_id);
        
        assert!(escrow.is_revealed, EEscrowNotRevealed);
        assert!(!escrow.is_released, EEscrowAlreadyReleased);
        assert!(!escrow.is_refunded, EEscrowAlreadyRefunded);
        assert!(option::is_some(&escrow.beneficiary), EUnauthorized);

        let beneficiary = *option::borrow(&escrow.beneficiary);
        let amount = escrow.amount;
        
        escrow.is_released = true;
        let released_balance = balance::withdraw_all(&mut escrow.locked_balance);
        let released_coin = coin::from_balance(released_balance, ctx);
        
        transfer::public_transfer(released_coin, beneficiary);

        event::emit(EscrowReleased {
            escrow_id,
            beneficiary,
            amount,
        });
    }

    /// Reveal and release in one transaction (gas optimization)
    public entry fun reveal_and_release(
        registry: &mut AuctionRegistry,
        escrow_id: u64,
        secret: String,
        beneficiary: address,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let escrow = table::borrow_mut(&mut registry.escrows, escrow_id);
        let current_time = clock::timestamp_ms(clock);

        assert!(!escrow.is_revealed, ESecretAlreadyRevealed);
        assert!(!escrow.is_released, EEscrowAlreadyReleased);
        assert!(!escrow.is_refunded, EEscrowAlreadyRefunded);
        assert!(current_time >= escrow.timelock, ETimelockNotReached);
        assert!(current_time <= escrow.timelock + REVEAL_WINDOW_MS, ERevealWindowExpired);

        // Verify secret hash
        let secret_bytes = string::as_bytes(&secret);
        let computed_hash = hash::sha3_256(*secret_bytes);
        assert!(computed_hash == escrow.secret_hash, EInvalidSecret);

        let amount = escrow.amount;
        escrow.is_revealed = true;
        escrow.is_released = true;
        escrow.revealed_secret = option::some(secret);
        escrow.beneficiary = option::some(beneficiary);

        let released_balance = balance::withdraw_all(&mut escrow.locked_balance);
        let released_coin = coin::from_balance(released_balance, ctx);
        
        transfer::public_transfer(released_coin, beneficiary);

        event::emit(SecretRevealed {
            escrow_id,
            revealer: tx_context::sender(ctx),
            secret,
        });

        event::emit(EscrowReleased {
            escrow_id,
            beneficiary,
            amount,
        });
    }

    /// Refund to maker if secret not revealed in time
    public entry fun refund_escrow(
        registry: &mut AuctionRegistry,
        escrow_id: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let escrow = table::borrow_mut(&mut registry.escrows, escrow_id);
        let current_time = clock::timestamp_ms(clock);

        assert!(!escrow.is_revealed, ESecretAlreadyRevealed);
        assert!(!escrow.is_released, EEscrowAlreadyReleased);
        assert!(!escrow.is_refunded, EEscrowAlreadyRefunded);
        assert!(current_time > escrow.timelock + REVEAL_WINDOW_MS, ERevealWindowExpired);

        let amount = escrow.amount;
        let maker = escrow.maker_address;
        escrow.is_refunded = true;

        let refunded_balance = balance::withdraw_all(&mut escrow.locked_balance);
        let refunded_coin = coin::from_balance(refunded_balance, ctx);
        
        transfer::public_transfer(refunded_coin, maker);

        event::emit(EscrowRefunded {
            escrow_id,
            maker,
            amount,
        });
    }

    /// Emergency refund by maker before timelock
    public entry fun emergency_refund(
        registry: &mut AuctionRegistry,
        escrow_id: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let escrow = table::borrow_mut(&mut registry.escrows, escrow_id);
        let current_time = clock::timestamp_ms(clock);
        let sender = tx_context::sender(ctx);

        assert!(sender == escrow.maker_address, EUnauthorized);
        assert!(current_time < escrow.timelock, ETimelockNotReached);
        assert!(!escrow.is_released, EEscrowAlreadyReleased);
        assert!(!escrow.is_refunded, EEscrowAlreadyRefunded);

        let amount = escrow.amount;
        escrow.is_refunded = true;

        let refunded_balance = balance::withdraw_all(&mut escrow.locked_balance);
        let refunded_coin = coin::from_balance(refunded_balance, ctx);
        
        transfer::public_transfer(refunded_coin, sender);

        event::emit(EscrowRefunded {
            escrow_id,
            maker: sender,
            amount,
        });
    }

    // ===== Auction functions =====

    /// Create a Dutch auction linked to an escrow
    public entry fun create_auction(
        registry: &mut AuctionRegistry,
        escrow_id: u64,
        start_price: u64,
        end_price: u64,
        duration: u64,
        secret_hash: vector<u8>,
        metadata: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(start_price > end_price, EInvalidPrice);
        assert!(end_price > 0, EInvalidPrice);
        assert!(duration > 0 && duration <= MAX_DURATION_MS, EInvalidDuration);
        assert!(!vector::is_empty(&secret_hash), EInvalidSecret);
        assert!(table::contains(&registry.escrows, escrow_id), EInvalidSecret);

        // Verify escrow can be revealed
        let escrow = table::borrow(&registry.escrows, escrow_id);
        assert!(can_reveal_escrow(escrow, clock), EEscrowNotRevealed);

        let auction_id = registry.next_auction_id;
        registry.next_auction_id = registry.next_auction_id + 1;

        let auction = Auction {
            id: auction_id,
            escrow_id,
            seller: tx_context::sender(ctx),
            start_price,
            end_price,
            start_time: clock::timestamp_ms(clock),
            duration,
            secret_hash,
            is_active: true,
            is_ended: false,
            winner: option::none(),
            final_price: option::none(),
            metadata,
        };

        table::add(&mut registry.auctions, auction_id, auction);

        event::emit(AuctionCreated {
            auction_id,
            seller: tx_context::sender(ctx),
            escrow_id,
            start_price,
            end_price,
            duration,
        });
    }

    /// Place a bid in the Dutch auction (first bid wins)
    public entry fun place_bid(
        registry: &mut AuctionRegistry,
        auction_id: u64,
        payment: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let auction = table::borrow_mut(&mut registry.auctions, auction_id);
        let current_time = clock::timestamp_ms(clock);
        let bidder = tx_context::sender(ctx);

        assert!(auction.is_active, EAuctionNotActive);
        assert!(!auction.is_ended, EAuctionNotActive);
        assert!(current_time < auction.start_time + auction.duration, EAuctionExpired);
        assert!(bidder != auction.seller, ESellerCannotBid);

        let current_price = get_current_price_internal(auction, current_time);
        let protocol_fee = (current_price * PROTOCOL_FEE_BASIS_POINTS) / BASIS_POINTS_DENOMINATOR;
        let total_required = current_price + protocol_fee;
        let payment_amount = coin::value(&payment);

        assert!(payment_amount >= total_required, EInsufficientPayment);

        // End the auction immediately (Dutch auction - first bid wins)
        auction.is_ended = true;
        auction.is_active = false;
        auction.winner = option::some(bidder);
        auction.final_price = option::some(current_price);

        // Split payment: protocol fee and seller payment
        let mut payment_balance = coin::into_balance(payment);
        let protocol_fee_balance = balance::split(&mut payment_balance, protocol_fee);
        balance::join(&mut registry.protocol_fee_balance, protocol_fee_balance);
        
        let seller_payment = coin::from_balance(payment_balance, ctx);
        transfer::public_transfer(seller_payment, auction.seller);

        event::emit(BidPlaced {
            auction_id,
            bidder,
            price: current_price,
            timestamp: current_time,
        });

        event::emit(AuctionEnded {
            auction_id,
            winner: option::some(bidder),
            final_price: option::some(current_price),
        });
    }

    /// End auction if time expired without bids
    public entry fun end_expired_auction(
        registry: &mut AuctionRegistry,
        auction_id: u64,
        clock: &Clock,
        _ctx: &mut TxContext
    ) {
        let auction = table::borrow_mut(&mut registry.auctions, auction_id);
        let current_time = clock::timestamp_ms(clock);

        assert!(auction.is_active, EAuctionNotActive);
        assert!(current_time >= auction.start_time + auction.duration, EAuctionNotEnded);

        auction.is_active = false;
        auction.is_ended = true;

        event::emit(AuctionEnded {
            auction_id,
            winner: option::none(),
            final_price: option::none(),
        });
    }

    // ===== View functions =====

    /// Get the last created auction ID
    public fun get_last_auction_id(registry: &AuctionRegistry): u64 {
        if (registry.next_auction_id == 0) {
            abort 0 // No auctions created yet
        } else {
            registry.next_auction_id - 1
        }
    }

    /// Get current price for an active auction
    public fun get_current_price(
        registry: &AuctionRegistry,
        auction_id: u64,
        clock: &Clock
    ): u64 {
        let auction = table::borrow(&registry.auctions, auction_id);
        let current_time = clock::timestamp_ms(clock);
        get_current_price_internal(auction, current_time)
    }

    fun get_current_price_internal(auction: &Auction, current_time: u64): u64 {
        if (!auction.is_active || auction.is_ended) {
            return if (option::is_some(&auction.final_price)) {
                *option::borrow(&auction.final_price)
            } else {
                auction.end_price
            }
        };

        let elapsed = current_time - auction.start_time;
        
        if (elapsed >= auction.duration) {
            return auction.end_price
        };

        // Linear price decay
        let price_reduction = ((auction.start_price - auction.end_price) * elapsed) / auction.duration;
        auction.start_price - price_reduction
    }

    /// Check if auction is active and can receive bids
    public fun is_auction_active(
        registry: &AuctionRegistry,
        auction_id: u64,
        clock: &Clock
    ): bool {
        let auction = table::borrow(&registry.auctions, auction_id);
        let current_time = clock::timestamp_ms(clock);
        
        auction.is_active && 
        !auction.is_ended && 
        current_time < auction.start_time + auction.duration
    }

    /// Check if escrow can be revealed
    public fun can_reveal_escrow(escrow: &Escrow, clock: &Clock): bool {
        let current_time = clock::timestamp_ms(clock);
        !escrow.is_revealed && 
        !escrow.is_released && 
        !escrow.is_refunded &&
        current_time >= escrow.timelock && 
        current_time <= escrow.timelock + REVEAL_WINDOW_MS
    }

    /// Check if escrow can be refunded
    public fun can_refund_escrow(escrow: &Escrow, clock: &Clock): bool {
        let current_time = clock::timestamp_ms(clock);
        !escrow.is_revealed && 
        !escrow.is_released && 
        !escrow.is_refunded &&
        current_time > escrow.timelock + REVEAL_WINDOW_MS
    }

    /// Get time remaining in auction
    public fun get_time_remaining(
        registry: &AuctionRegistry,
        auction_id: u64,
        clock: &Clock
    ): u64 {
        let auction = table::borrow(&registry.auctions, auction_id);
        let current_time = clock::timestamp_ms(clock);
        
        if (!auction.is_active || auction.is_ended) {
            return 0
        };
        
        let end_time = auction.start_time + auction.duration;
        
        if (current_time >= end_time) {
            0
        } else {
            end_time - current_time
        }
    }

    // ===== Admin functions =====

    /// Withdraw protocol fees (admin only)
    public entry fun withdraw_protocol_fees(
        _: &AdminCap,
        registry: &mut AuctionRegistry,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let fee_amount = balance::value(&registry.protocol_fee_balance);
        assert!(fee_amount > 0, EInsufficientPayment);
        
        let fee_balance = balance::withdraw_all(&mut registry.protocol_fee_balance);
        let fee_coin = coin::from_balance(fee_balance, ctx);
        
        transfer::public_transfer(fee_coin, recipient);
    }

    // ===== Test functions =====
    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}


