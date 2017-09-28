const chai = require('chai');
const expect = chai.expect;

const SuperRepo = require('../lib/index.js');

describe('Initialization', function() {
    it('Should import SuperRepo and make SuperRepo instance available.', function() {
        const repo = new SuperRepo({
            name: 'test',
            request: () => new Promise(resolve => resolve('whatever'))
        });

        expect(repo).to.be.an.instanceof(SuperRepo);
    });
});
