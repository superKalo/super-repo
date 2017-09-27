const chai = require('chai');
const expect = chai.expect;
const sinon  = require('sinon');

const kindOfRegularResponse = require('./fake-api/kind-of-regular-response.json');

const SuperRepo = require('../lib/index.js');
const defaultConfiguration = {
    storage: 'LOCAL_VARIABLE',
    name: 'test',
    outOfDateAfter: 3 * 1000, // 3 seconds
    request: () => new Promise(resolve => resolve(kindOfRegularResponse))
};

describe('Library import', function() {
    it('Should make SuperRepo instance available.', function() {
        expect(new SuperRepo(defaultConfiguration)).to.be.an.instanceof(SuperRepo);
    });
});

describe('Data Management', () => {
    var repository;

    before(() => {
        repository = new SuperRepo(defaultConfiguration);
    });

    it('Should resolve to the server-side data', done => {
        repository.getData().then( result => {
            expect(result).to.equal(kindOfRegularResponse);
        }).then(done, done);
    });

    it('Should resolve the same data, no matter if it is taken from cache or from a network request', done => {
        repository.getData().then( () => {
            repository.getData().then( () => {

                repository.getData().then( result => {
                    expect(result).to.equal(kindOfRegularResponse);
                }).then(done, done);
            });
        });
    });

    it('Should do a network request only once', done => {
        var networkRequestsCount = 0;

        const repo = new SuperRepo({
            storage: 'LOCAL_VARIABLE',
            name: 'test',
            outOfDateAfter: 60 * 1000, // 1 min
            request: () => {
                networkRequestsCount++;

                return new Promise(resolve => resolve(kindOfRegularResponse));
            }
        });

        repo.getData().then( () => {
            repo.getData().then( () => {

                repo.getData().then( result => {
                    expect(networkRequestsCount).to.equal(1);
                }).then(done, done);

            });
        });
    });

    it('Should wait if there is a Promise pending and should NOT fire another one', done => {
        var networkRequestsCount = 0;

        const repo = new SuperRepo({
            storage: 'LOCAL_VARIABLE',
            name: 'test',
            outOfDateAfter: 60 * 1000, // 1 min
            request: () => {
                networkRequestsCount++;

                return new Promise(resolve =>
                    setTimeout(() => resolve(kindOfRegularResponse), 1000)
                );
            }
        });

        repo.getData();
        repo.getData();
        repo.getData();

        repo.getData().then( result => {
            expect(networkRequestsCount).to.equal(1);
        }).then(done, done);
    });

});


describe('Data Sync', () => {
    var clock;

    before(function () {
        clock = sinon.useFakeTimers();
    });
    after(function () { clock.restore(); });

    it('Initiates a background data sync process that fires a network request as soon as the data gets out of date', done => {
        var networkRequestsCount = 0;

        var repository = new SuperRepo({
            storage: 'LOCAL_VARIABLE',
            name: 'test',
            outOfDateAfter: 3 * 1000, // 3 sec
            request: () => {
                networkRequestsCount++;

                return new Promise(resolve => resolve(kindOfRegularResponse));
            }
        });

        expect(networkRequestsCount).to.equal(0);

        repository.initSyncer().then( () => {
            expect(networkRequestsCount).to.equal(1);

            // TODO: Figure out why this doesn't work
            // clock.tick(3000);

            // expect(networkRequestsCount).to.equal(2);
        }).then(done, done);
    });
});
