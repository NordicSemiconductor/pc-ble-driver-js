/* Copyright (c) 2016 Nordic Semiconductor. All Rights Reserved.
 *
 * The information contained herein is property of Nordic Semiconductor ASA.
 * Terms and conditions of usage are described in detail in NORDIC
 * SEMICONDUCTOR STANDARD SOFTWARE LICENSE AGREEMENT.
 *
 * Licensees are granted free, non-transferable use of the information. NO
 * WARRANTY of ANY KIND is provided. This heading must NOT be removed from
 * the file.
 *
 */

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

        testLib._adapter.once('stateChanged', state => {
            assert.equal(state.scanning, true);
        });

        testLib.startScan()
            .then(() => {
                return deviceDiscoveredPromise;
            })
            .then(device => {
                assert(device);

                testLib._adapter.once('stateChanged', state => {
                    assert.equal(state.scanning, false);
                });

                return testLib.stopScan();
            })
            .then(() => {
                done();
            })
            .catch(done);
    });
});
