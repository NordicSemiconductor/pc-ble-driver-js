'use strict';
const assert = require('assert');
const testLib = require('./testLibrary').singletonContainer.testLibrary;

describe('Connection update', function() {
    this.timeout(100000);

    const peripheralAddress = process.env.testPeripheral;
    it('should send off a connection update and receive an event when parameters have changed.', (done) => {
        let theDevice;
        const connectionParameters = {
            minConnectionInterval: 7.5,
            maxConnectionInterval: 7.5,
            slaveLatency: 10,
            connectionSupervisionTimeout: 4000,
        };
        testLib.connectToPeripheral(peripheralAddress)
            .then((device) => {
                theDevice = device;
                return device;
            })
            .then((device) => {
                return testLib.updateConnectionParameters(device.instanceId, connectionParameters);
            })
            .then((device) => {
                assert.equal(device.minConnectionInterval, connectionParameters.minConnectionInterval);
                assert.equal(device.maxConnectionInterval, connectionParameters.maxConnectionInterval);
                assert.equal(device.slaveLatency, connectionParameters.slaveLatency);
                assert.equal(device.connectionSupervisionTimeout, connectionParameters.connectionSupervisionTimeout);
                return testLib.disconnect(theDevice.instanceId);
            })
            .then(() => {
                done();
            })
            .catch((error) => {
                console.log('error ');
                done(error);
            });
    });
});
