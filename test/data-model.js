const chai = require('chai');
const expect = chai.expect;

const kindOfRegularResponse = require('./fake-api/kind-of-regular-response.json');
const nestedObjectResponse = require('./fake-api/nested-object-response.json');
const arrayOfObjectsResponse = require('./fake-api/array-of-objects-response.json');

const SuperRepo = require('../lib/index.js');

describe('Data Model', () => {
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

    it('Should apply the data model. Case: response is a nested Object.', done => {
        const repo = new SuperRepo({
            storage: 'LOCAL_VARIABLE',
            name: 'test',
            outOfDateAfter: 60 * 1000, // 1 min
            dataModel: {
                currentday: 'day'
            },
            request: () => new Promise(_r => _r(nestedObjectResponse))
        });

        repo.getData().then( data => {
            expect(data).to.have.property('currentday');

            expect(nestedObjectResponse.day).to.equal(data.currentday);

            expect(data).to.not.have.property('day');
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