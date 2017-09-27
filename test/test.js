const chai = require('chai');
const expect = chai.expect;

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
});
