'use strict';

const assert = require('assert');
const testLib = require('./testLibrary').singletonContainer.testLibrary;

describe('Advertisement', function() {
    const peripheralAddress = process.env.testPeripheral;
    this.timeout(10000);

    it('should be possible to start advertisement', (done) => {
        testLib.startAdvertising()
            .then(() => { done(); })
            .catch((error) => {
                done(error);
            });
    });

    it('should be possible to stop a started advertisement', (done) => {
        testLib.stopAdvertising()
            .then(() => { done(); })
            .catch((error) => {
                done(error);
            });
    });
});
