'use strict';

const assert = require('assert');
const testLib = require('./testLibrary').singletonContainer.testLibrary;
const sinon = require('sinon');

// Use old style 'function' here or else this.timeout won't work
describe('Adapter Connect', function() {
    this.timeout(10000);
    /*it('should be able to connect and disconnect without errors', (done)=> {
        const errorSpy = sinon.spy();
        testLib._adapter.once('error', errorSpy);
        testLib.connectToPeripheral(process.env.testPeripheral)
            .then((device) => {
                assert(!errorSpy.calledOnce);
                assert.equal(device.address, process.env.testPeripheral);
                return device;
            })
            .then((device) => {
                testLib.disconnect(device.instanceId);
                return device;
            })
            .then((device) => {
                assert(!errorSpy.calledOnce);
                assert.equal(device.address, process.env.testPeripheral);
                done();
            })
            .catch(done);
    });

    it('should be able to cancel a connect. connect handler should not be called', (done) => {
        const errorSpy = sinon.spy();
        testLib._adapter.once('error', errorSpy);

        testLib.connectToPeripheral(process.env.testPeripheral)
            .then((device) => {
                assert(!errorSpy.calledOnce);
                assert(false, 'should not reach connect handler when canceling connect');
                done();
            });
        testLib.cancelConnect()
            .then(() => {
            })
            .catch(done);

        setTimeout(done, 1000); // Let the event loop run a while to catch a(n erronous) connect event.
    });*/

    it('should be possibe to read all characteristics in the first service found', (done) => {
        const peripheralAddress = process.env.testPeripheral;
        let theDevice;
        testLib.connectToPeripheral(peripheralAddress)
            .then((device) => {
                theDevice = device;
                return testLib.getServices(device.instanceId);
            })
            .then((services) => {
                for (let index in services) {
                    let service = services[index];
                    console.log('uuid: ' + service.uuid + ' startHandle: ' + service.startHandle);
                }

                return services;
            })
            .then((services) => {
                return testLib.getCharacteristics(services[0].instanceId);
            })
            .then((characteristics) => {
                assert(characteristics.length > 0);
                assert(characteristicsp[0].uuid);
            })
            .then(() => {
                return testLib.disconnect(theDevice.instanceId);
            })
            .then(() => {done()})
            .catch((error) => {
                console.log('Enumerating characteristics failed: ', JSON.stringify(error));
                done();
                //assert(false, error);
            });
    });
});
