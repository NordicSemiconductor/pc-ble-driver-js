'use strict';

const assert = require('assert');
const testLib = require('./testLibrary').singletonContainer.testLibrary;
const sinon = require('sinon');

//Use old style 'function' here or else this.timeout won't work
describe('Adapter pairing', function() {
    this.timeout(40000);

    xit('should be possible to pair with a peer central', done => {
        let theDevice;
        testLib.startAdvertising()
        .then(() => {
            return testLib.waitForConnectedEvent();
        })
        .then(device => {
            theDevice = device;
            return testLib.pair(theDevice.instanceId);
        })
        .then(() => {
            done();
        })
        .catch(error => {
            console.log('error: ' + JSON.stringify(error));
            testLib.disconnect();
            done();
        });
    });

    it('should be possible to pair with a peripheral', done => {
        const errorSpy = sinon.spy();
        let theDevice;
        testLib._adapter.once('error', errorSpy);
        testLib.connectToPeripheral(process.env.testPeripheral)
        .then(device => {
            theDevice = device;
            assert(!errorSpy.calledOnce);
            assert.equal(theDevice.address, process.env.testPeripheral);

            return testLib.pair(theDevice.instanceId);
        })
        .then(event => {
            assert(!errorSpy.calledOnce);
            //assert.equal(device.address, process.env.testPeripheral);
            assert(event.auth_status === 0);

            return testLib.disconnect(theDevice.instanceId);
        })
        .then(() => {done();})
        .catch(error => {
            console.log(error);
            testLib.disconnect(theDevice.instanceId);
            done();
        });
    });

    xit('should be possible for a central to initiate pairing when receiving security request', done => {
        const errorSpy = sinon.spy();
        testLib._adapter.once('error', errorSpy);
        testLib.connectToPeripheral(process.env.testPeripheral)
        .then(() => {
            return testLib.waitForSecurityChangedEvent();
        })
        .then(event => {
            assert(event.auth_status === 0);
            done();
        })
        .catch(error => {
            console.log('error: ' + error);
            testLib.disconnect();
            done();
        });
    });
});
//C59B853D2AE7
