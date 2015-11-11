'use strict';

const assert = require('assert');
const testLib = require('./testLibrary').singletonContainer.testLibrary;
const sinon = require('sinon');

// Use old style 'function' here or else this.timeout won't work
describe('Scan', function() {
    this.timeout(10000);
    it('start and stop scan', done => {
        const deviceDiscoveredPromise = new Promise((resolve, reject) => {
            testLib._adapter.once('deviceDiscovered', device => {
                console.log('device disocvered');
                resolve(device);
            });
        });

        testLib._adapter.once('adapterStateChanged', adapterState => {
            assert.equal(adapterState.scanning, true);
        });

        testLib.startScan()
            .then(() => {
                return deviceDiscoveredPromise;
            })
            .then(device => {
                assert(device);

                testLib._adapter.once('adapterStateChanged', adapterState => {
                    assert.equal(adapterState.scanning, false);
                });

                return testLib.stopScan();
            })
            .then(() => {
                done();
            })
            .catch(done);
    });
});
