module block_sampling::experiment {
    use sui::event;
    use sui::random::{Self, Random};

    const EUnauthorized: u64 = 1;
    const EAlreadyVerified: u64 = 2;

    public struct DataListing has key, store {
        id: UID,
        provider: address, 
        merkle_root: u256, 
        range_min: u64,    
        range_max: u64,    
        description: vector<u8> 
    }

    public struct ChallengeSession has key {
        id: UID,
        requester: address, 
        listing_id: ID,     
        random_seed: vector<u8>, 
        is_processed: bool
    }

    public struct TRICap has key, store {
        id: UID
    }

    public struct ChallengeStartedEvent has copy, drop {
        session_id: ID,
        listing_id: ID,
        random_seed: vector<u8> 
    }

    public struct VerificationPassedEvent has copy, drop {
        session_id: ID,
        listing_id: ID,
        timestamp_ms: u64 
    }

    public struct VerificationFailedEvent has copy, drop {
        session_id: ID,
        listing_id: ID,
        reason: vector<u8>
    }

    fun init(ctx: &mut TxContext) {
        transfer::transfer(TRICap { id: object::new(ctx) }, tx_context::sender(ctx));
    }

    public fun register_dataset(
        root: u256,
        min: u64,
        max: u64,
        desc: vector<u8>,
        ctx: &mut TxContext
    ) {
        let listing = DataListing {
            id: object::new(ctx),
            provider: tx_context::sender(ctx),
            merkle_root: root,
            range_min: min,
            range_max: max,
            description: desc
        };
        transfer::share_object(listing);
    }

    entry fun start_challenge(
        listing: &DataListing,
        r: &Random, 
        ctx: &mut TxContext
    ) {
        let mut generator = random::new_generator(r, ctx);
        let seed = random::generate_bytes(&mut generator, 32); 

        let session_uid = object::new(ctx);
        let session_id = object::uid_to_inner(&session_uid);

        let session = ChallengeSession {
            id: session_uid,
            requester: tx_context::sender(ctx),
            listing_id: object::id(listing),
            random_seed: seed,
            is_processed: false
        };

        event::emit(ChallengeStartedEvent {
            session_id: session_id,
            listing_id: object::id(listing),
            random_seed: seed
        });

        transfer::share_object(session);
    }

    entry fun submit_verification_result(
        //_: &TRICap, 
        session: &mut ChallengeSession,
        listing: &DataListing,
        is_valid: bool, 
        _ctx: &mut TxContext
    ) {
        assert!(session.listing_id == object::id(listing), EUnauthorized);
        assert!(session.is_processed == false, EAlreadyVerified);

        session.is_processed = true;

        if (is_valid) {
            event::emit(VerificationPassedEvent {
                session_id: object::id(session),
                listing_id: object::id(listing),
                timestamp_ms: tx_context::epoch_timestamp_ms(_ctx) 
            });
        } else {
            event::emit(VerificationFailedEvent {
                session_id: object::id(session),
                listing_id: object::id(listing),
                reason: b"ZKP Verification Failed or Index Mismatch"
            });
        };
    }

    #[test_only]
    public fun test_init(ctx: &mut TxContext) {
        init(ctx);
    }
}