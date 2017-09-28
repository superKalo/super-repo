const chai = require('chai');
const expect = chai.expect;

const kindOfRegularResponse = require('./fake-api/kind-of-regular-response.json');
const arrayOfObjectsResponse = require('./fake-api/array-of-objects-response.json');

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
        let networkRequestsCount = 0;

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

    it('Should clear the currently cached data.', done => {
        repository.getData().then( () => {
            repository.clearData().then(() => {
                expect(repository.data).to.equal(null);
            }).then(done, done);
        });
    });

    it('Should return the previous data when the currently cached data is cleared', done => {
        repository.getData().then( () => {
            repository.clearData().then(prevData => {
                // TODO: More complex process.
                expect(prevData.data).to.equal(kindOfRegularResponse);
            }).then(done, done);
        });
    });

    it('Should apply the data model. Case: response is a flat Object.', done => {
        const repo = new SuperRepo({
            storage: 'LOCAL_VARIABLE',
            name: 'test',
            outOfDateAfter: 60 * 1000, // 1 min
            dataModel: {
                temperature: 't',
                windspeed: 'w'
            },
            request: () => new Promise(_r => _r(kindOfRegularResponse))
        });

        repo.getData().then( data => {
            expect(data).to.have.property('temperature');
            expect(data).to.have.property('windspeed');

            expect(kindOfRegularResponse.t).to.equal(data.temperature);
            expect(kindOfRegularResponse.w).to.equal(data.windspeed);

            expect(data).to.not.have.property('t');
            expect(data).to.not.have.property('w');
            expect(data).to.not.have.property('p');
        }).then(done, done);
    });

    it('Should apply the data model. Case: response is an Array of Objects.', done => {
        const repo = new SuperRepo({
            storage: 'LOCAL_VARIABLE',
            name: 'test',
            outOfDateAfter: 60 * 1000, // 1 min
            dataModel: [{
                day: 'day',
                temperature: 't',
                windspeed: 'w'
            }],
            request: () => new Promise(_r => _r(arrayOfObjectsResponse))
        });

        repo.getData().then( data => {
            data.forEach( (item, i) => {
                expect(item).to.have.property('temperature');
                expect(item).to.have.property('windspeed');
                expect(item).to.have.property('day');

                expect(arrayOfObjectsResponse[i].t).to.equal(item.temperature);
                expect(arrayOfObjectsResponse[i].w).to.equal(item.windspeed);
                expect(arrayOfObjectsResponse[i].day).to.equal(item.day);

                expect(item).to.not.have.property('t');
                expect(item).to.not.have.property('w');
                expect(item).to.not.have.property('p');
            });
        }).then(done, done);
    });


});
