const chai = require('chai');
const expect = chai.expect;
const sinon  = require('sinon');

const kindOfRegularResponse = require('./fake-api/kind-of-regular-response.json');

const SuperRepo = require('../lib/index.js');

describe('Data Status', () => {
    var repository;
    var clock;

    beforeEach(() => {
        clock = sinon.useFakeTimers();
        repository = new SuperRepo({
            storage: 'LOCAL_VARIABLE',
            name: 'test',
            outOfDateAfter: 3 * 1000, // 3 seconds
            request: () => new Promise(resolve => resolve(kindOfRegularResponse))
        });
    });
    afterEach(() => {
        clock.restore();
    });

    it('Should have up to date data.', done => {
        repository.getData().then( () => {
            repository.getDataUpToDateStatus().then(_res => {
                expect(_res.isDataUpToDate).to.equal(true);
            }).then(done, done);
        });
    });

    it('Should have all the data status params for up to date data.', done => {
        repository.getData().then( () => {
            repository.getDataUpToDateStatus().then(_res => {
                expect(_res.isDataUpToDate).to.equal(true);
                expect(_res.isInvalid).to.equal(false);
                expect(_res.localData).to.equal(kindOfRegularResponse);

                expect(_res.lastFetched).to.equal(repository.data.lastFetched);
                expect(_res.lastFetched).to.be.closeTo(new Date().valueOf(), 2000);
            }).then(done, done);
        });
    });

    it('Should initially have outdated data.', done => {
        repository.getDataUpToDateStatus().then(_res => {
            expect(_res.isDataUpToDate).to.equal(false);
            expect(_res.isInvalid).to.equal(false);
            expect(_res.lastFetched).to.equal(null);
            expect(_res.localData).to.equal(null);
        }).then(done, done);
    });

    it('Should have outdated data, when data gets invalidated.', done => {
        repository.getData().then( () => {

            repository.invalidateData().then( () => {
                repository.getDataUpToDateStatus().then(_res => {
                    expect(_res.isDataUpToDate).to.equal(false);
                    expect(_res.isInvalid).to.equal(true);
                    expect(_res.lastFetched).to.equal(repository.data.lastFetched);
                    expect(_res.localData).to.equal(kindOfRegularResponse);
                }).then(done, done);
            });

        });
    });

    it('Should have outdated data, when data gets cleared.', done => {
        repository.getData().then( () => {

            repository.clearData().then( () => {
                repository.getDataUpToDateStatus().then(_res => {
                    expect(_res.isDataUpToDate).to.equal(false);
                    expect(_res.isInvalid).to.equal(false);
                    expect(_res.lastFetched).to.equal(null);
                    expect(_res.localData).to.equal(null);
                }).then(done, done);
            });

        });
    });

    it('Should consider the cached data as always up to date', done => {
        const repo = new SuperRepo({
            storage: 'LOCAL_VARIABLE',
            name: 'test',
            outOfDateAfter: 0,
            request: () => new Promise(resolve => resolve('whatever'))
        });

        repo.getData().then( () => {
            clock.tick(31 * 24 * 60 * 1000); // 1 month

            repo.getDataUpToDateStatus().then( _res => {
                expect(_res.isDataUpToDate).to.equal(true);
            }).then(done, done);
        });
    });

    it('Should consider the cached data as always up to date, unless is invalidated', done => {
        const repo = new SuperRepo({
            storage: 'LOCAL_VARIABLE',
            name: 'test',
            outOfDateAfter: 0,
            request: () => new Promise(resolve => resolve('whatever'))
        });

        repo.getData().then( () => {

            repo.invalidateData().then(() => {
                repo.getDataUpToDateStatus().then( _res => {
                    expect(_res.isDataUpToDate).to.equal(false);
                }).then(done, done);
            });

        });
    });

    it('Should consider the cached data as always up to date, unless is missing', done => {
        const repo = new SuperRepo({
            storage: 'LOCAL_VARIABLE',
            name: 'test',
            outOfDateAfter: 0,
            request: () => new Promise(resolve => resolve('whatever'))
        });

        repo.getDataUpToDateStatus().then( _res => {
            expect(_res.isDataUpToDate).to.equal(false);
        }).then(done, done);
    });

    it('Should consider the cached data as always up to date, unless is cleared', done => {
        const repo = new SuperRepo({
            storage: 'LOCAL_VARIABLE',
            name: 'test',
            outOfDateAfter: 0,
            request: () => new Promise(resolve => resolve('whatever'))
        });

        repo.getData().then( () => {

            repo.clearData().then(() => {
                repo.getDataUpToDateStatus().then( _res => {
                    expect(_res.isDataUpToDate).to.equal(false);
                }).then(done, done);
            });

        });
    });

});
