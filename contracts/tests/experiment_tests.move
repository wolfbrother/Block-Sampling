#[test_only]
module block_sampling::experiment_tests {
    use block_sampling::experiment::{Self, DataListing, ChallengeSession, TRICap};
    use sui::test_scenario::{Self as ts};
    use sui::random::{Self, Random};

    const ADMIN: address = @0xA;
    const USER: address = @0xB;

    #[test]
    fun test_end_to_end_flow() {
        let mut scenario = ts::begin(ADMIN);
        {
            let ctx = ts::ctx(&mut scenario); 
            experiment::test_init(ctx); 
        };

        ts::next_tx(&mut scenario, @0x0); 
        {
            let ctx = ts::ctx(&mut scenario);
            random::create_for_testing(ctx);
        };

        ts::next_tx(&mut scenario, ADMIN);
        {
            let ctx = ts::ctx(&mut scenario);
            experiment::register_dataset(123456789, 0, 100, b"Test Dataset", ctx);
        };

        ts::next_tx(&mut scenario, USER);
        {
            let listing = ts::take_shared<DataListing>(&scenario);
            let r = ts::take_shared<Random>(&scenario);

            let ctx = ts::ctx(&mut scenario);
            
            experiment::start_challenge(&listing, &r, ctx);

            ts::return_shared(r);
            ts::return_shared(listing);
        };

        ts::next_tx(&mut scenario, ADMIN);
        {
            let cap = ts::take_from_sender<TRICap>(&scenario);
            let listing = ts::take_shared<DataListing>(&scenario);
            let mut session = ts::take_shared<ChallengeSession>(&scenario);

            let ctx = ts::ctx(&mut scenario);

            experiment::submit_verification_result(
                &cap,
                &mut session,
                &listing,
                true,
                ctx
            );

            ts::return_to_sender(&scenario, cap);
            ts::return_shared(listing);
            ts::return_shared(session);
        };

        ts::end(scenario);
    }
}