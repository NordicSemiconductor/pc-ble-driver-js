'use strict';

const assert = require('assert');
const testLib = require('./testLibrary').singletonContainer.testLibrary;
const sinon = require('sinon');

//Use old style 'function' here or else this.timeout won't work
describe('Adapter pairing', function() {
    this.timeout(20000);

    xit('should be possible to pair with a peer central', done => {
        let theDevice;
        testLib.startAdvertising()
        .then(() => {
            return testLib.waitForConnectedEvent();
        })
        .then((device) => {
            theDevice = device;
            return testLib.pair(theDevice.instanceId);
        })
        .then(() => {
            done();
        })
        .catch(error => {
            console.log('error: ' + error);
            testLib.disconnect();
        });
    });

    xit('should be possible to pair with a peripheral', done => {
        const errorSpy = sinon.spy();
        testLib._adapter.once('error', errorSpy);
        testLib.connectToPeripheral(process.env.testPeripheral)
        .then(device => {
            assert(!errorSpy.calledOnce);
            assert.equal(device.address, process.env.testPeripheral);
            return device;
        })
        .then(device => {
            return testLib.pair(device);
        })
        .then((event) => {
            assert(!errorSpy.calledOnce);
            //assert.equal(device.address, process.env.testPeripheral);
            assert(event.auth_status === 0);
            done();
        })
        .catch(error => {
            console.log('error: ' + error);
            testLib.disconnect();
        });
    });
});
