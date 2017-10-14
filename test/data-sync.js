const chai = require('chai');
const expect = chai.expect;
const sinon  = require('sinon');

const SuperRepo = require('../lib/index.js');

describe('Data Sync', () => {
    var clock;

    let repository;
    const TIMEFRAME = 60 * 1000; // 1 min
    let networkRequestsCount;

    beforeEach(() => {
        clock = sinon.useFakeTimers();
        networkRequestsCount = 0;

        repository = new SuperRepo({
            storage: 'LOCAL_VARIABLE',
            name: 'test',
            outOfDateAfter: TIMEFRAME,
            request: () => {
                networkRequestsCount++;

                return new Promise(resolve => resolve({ whatever: true }));
            }
        });
    });
    afterEach(() => {
        clock.restore();
    });

    it('Should initiate a background data sync process that fires a network request as soon as the data gets out of date. Initially, data is outdated, therefore, the process should start with a network request. ', done => {
        expect(networkRequestsCount).to.equal(0);

        repository.initSyncer().then( () => {
            expect(networkRequestsCount).to.equal(1);

            clock.tick(TIMEFRAME - 1);
            expect(networkRequestsCount).to.equal(1);

            clock.tick(1);
            expect(networkRequestsCount).to.equal(2);

            clock.tick(TIMEFRAME);
            expect(networkRequestsCount).to.equal(3);

            clock.tick(5 * TIMEFRAME);
            expect(networkRequestsCount).to.equal(8);
        }).then(done, done);
    });

    it('Should initiate a background data sync process that fires a network request as soon as the data gets out of date. Initially, data is NOT outdated, therefore, the process should NOT start with a network request. Case: there is NO delay between getting the data and initiating the sync process.', done => {
        repository.getData().then(() => {

            expect(networkRequestsCount).to.equal(1);

            repository.initSyncer().then( () => {
                expect(networkRequestsCount).to.equal(1);

                clock.tick(TIMEFRAME - 1);

                expect(networkRequestsCount).to.equal(1);

                clock.tick(1);
                expect(networkRequestsCount).to.equal(2);

                clock.tick(TIMEFRAME);
                expect(networkRequestsCount).to.equal(3);

                clock.tick(10 * TIMEFRAME);
                expect(networkRequestsCount).to.equal(13);
            }).then(done, done);

        });
    });

    it('Should initiate a background data sync process that fires a network request as soon as the data gets out of date. Initially, data is NOT outdated, therefore, the process should NOT start with a network request. Case: there is delay between getting the data and initiating the sync process.', done => {
        repository.getData().then(() => {
            expect(networkRequestsCount).to.equal(1);

            clock.tick(TIMEFRAME - 2000);

            repository.initSyncer().then( () => {
                expect(networkRequestsCount).to.equal(1);

                clock.tick(2000);
                expect(networkRequestsCount).to.equal(2);

                clock.tick(TIMEFRAME);
                expect(networkRequestsCount).to.equal(3);

                clock.tick(100 * TIMEFRAME);
                expect(networkRequestsCount).to.equal(103);
            }).then(done, done);
        });
    });

    it('Should initiate a background data sync process that fires a network request as soon as the data gets out of date. Initially, data is NOT outdated, therefore, the process should NOT start with a network request. Case: there is delay LESS THAN 1 SECOND between getting the data and initiating the sync process.', done => {
        repository.getData().then(() => {
            expect(networkRequestsCount).to.equal(1);

            clock.tick(TIMEFRAME - 500);

            repository.initSyncer().then( () => {
                expect(networkRequestsCount).to.equal(1);

                clock.tick(1000);
                expect(networkRequestsCount).to.equal(2);

                clock.tick(TIMEFRAME);
                expect(networkRequestsCount).to.equal(3);

                clock.tick(100 * TIMEFRAME);
                expect(networkRequestsCount).to.equal(103);
            }).then(done, done);
        });
    });

    it('Should stop the background data sync process.', done => {
        repository.initSyncer().then( () => {
            expect(networkRequestsCount).to.equal(1);

            clock.tick(TIMEFRAME);
            expect(networkRequestsCount).to.equal(2);

            repository.destroySyncer();

            clock.tick(100 * TIMEFRAME);
            expect(networkRequestsCount).to.equal(2);

            repository.initSyncer().then( () => {
                expect(networkRequestsCount).to.equal(3);

                clock.tick(TIMEFRAME);
                expect(networkRequestsCount).to.equal(4);

                repository.destroySyncer();

                clock.tick(100 * TIMEFRAME);
                expect(networkRequestsCount).to.equal(4);
            }).then(done, done);
        });
    });

    it('Should NOT initiate a background data sync process faster than 1 second when `outOfDateAfter` option is less than 1 second', done => {
        let networkRequestsCount = 0;

        const repo = new SuperRepo({
            storage: 'LOCAL_VARIABLE',
            name: 'test',
            outOfDateAfter: 500,
            request: () => {
                networkRequestsCount++;

                return new Promise(resolve => resolve({ whatever: true }));
            }
        });

        repo.initSyncer().then( () => {
            expect(networkRequestsCount).to.equal(1);

            clock.tick(500);
            expect(networkRequestsCount).to.equal(1);

            clock.tick(500);
            expect(networkRequestsCount).to.equal(2);

            clock.tick(1000);
            expect(networkRequestsCount).to.equal(3);

            clock.tick(10 * 1000);
            expect(networkRequestsCount).to.equal(13);
        }).then(done, done);
    });

    it('Should initiate a background data sync process on every 1 second when `outOfDateAfter` option is not defined', done => {
        let networkRequestsCount = 0;

        const repo = new SuperRepo({
            storage: 'LOCAL_VARIABLE',
            name: 'test',
            request: () => {
                networkRequestsCount++;

                return new Promise(resolve => resolve({ whatever: true }));
            }
        });

        repo.initSyncer().then( () => {
            expect(networkRequestsCount).to.equal(1);

            clock.tick(500);
            expect(networkRequestsCount).to.equal(1);

            clock.tick(500);
            expect(networkRequestsCount).to.equal(2);

            clock.tick(1000);
            expect(networkRequestsCount).to.equal(3);

            clock.tick(10 * 1000);
            expect(networkRequestsCount).to.equal(13);
        }).then(done, done);
    });

    it('Should initiate a background data sync process on every 1 second when `outOfDateAfter` option is set to -1', done => {
        let networkRequestsCount = 0;

        const repo = new SuperRepo({
            storage: 'LOCAL_VARIABLE',
            name: 'test',
            request: () => {
                networkRequestsCount++;

                return new Promise(resolve => resolve({ whatever: true }));
            }
        });

        repo.initSyncer().then( () => {
            expect(networkRequestsCount).to.equal(1);

            clock.tick(500);
            expect(networkRequestsCount).to.equal(1);

            clock.tick(500);
            expect(networkRequestsCount).to.equal(2);

            clock.tick(1000);
            expect(networkRequestsCount).to.equal(3);

            clock.tick(10 * 1000);
            expect(networkRequestsCount).to.equal(13);
        }).then(done, done);
    });

    it('Should initiate a background data sync process on every 1 second when `outOfDateAfter` option is set to 0', done => {
        let networkRequestsCount = 0;

        const repo = new SuperRepo({
            storage: 'LOCAL_VARIABLE',
            name: 'test',
            outOfDateAfter: 0,
            request: () => {
                networkRequestsCount++;

                return new Promise(resolve => resolve({ whatever: true }));
            }
        });

        repo.initSyncer().then( () => {
            expect(networkRequestsCount).to.equal(1);

            clock.tick(500);
            expect(networkRequestsCount).to.equal(1);

            clock.tick(500);
            expect(networkRequestsCount).to.equal(2);

            clock.tick(1000);
            expect(networkRequestsCount).to.equal(3);

            clock.tick(10 * 1000);
            expect(networkRequestsCount).to.equal(13);
        }).then(done, done);
    });

    it('Should fire a success callback as soon as the background data sync process gets fresh data.', done => {
        const callback = sinon.spy();

        repository.initSyncer(callback).then( () => {
            expect(callback.callCount).to.equal(1);

            clock.tick(TIMEFRAME - 1);
            expect(callback.callCount).to.equal(1);

            clock.tick(1);
            expect(callback.callCount).to.equal(2);

            clock.tick(TIMEFRAME);
            expect(callback.callCount).to.equal(3);
        }).then(done, done);
    });
});
