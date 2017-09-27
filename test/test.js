const chai = require('chai');
const expect = chai.expect;

const SuperRepo = require('../lib/index.js');
const defaultConfiguration = {
    name: 'test',
    outOfDateAfter: 3 * 1000, // 3 seconds
    request: () => ({})
};

describe('Library import', function() {
    it('Should make SuperRepo instance available.', function() {
        expect(new SuperRepo(defaultConfiguration)).to.be.an.instanceof(SuperRepo);
    });
});
