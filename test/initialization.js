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

    it('Should set the default options.', function() {
        const request = () => new Promise(resolve => resolve('whatever'));
        const repo = new SuperRepo({
            name: 'test',
            request
        });

        expect(repo.config.outOfDateAfter).to.equal(1000);
        expect(repo.config.storage).to.equal('LOCAL_STORAGE');

        expect(repo.config.name).to.equal('test');
        expect(repo.config.request).to.equal(request);

        expect(repo.config.mapData).to.equal(undefined);
        expect(repo.config.dataModel).to.equal(undefined);
    });
});
