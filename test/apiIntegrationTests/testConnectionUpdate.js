'use strict';
const assert = require('assert');
const testLib = require('./testLibrary').singletonContainer.testLibrary;
const sinon = require('sinon');

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
                testLib.disconnect(theDevice.instanceId).then(() => {
                    done();
                });
            });
    });

    it('should fail with NRF_ERROR_INVALID_PARAM when unreasonable connection parameters', (done) => {
        let theDevice;
        const errorSpy = sinon.spy();
        const connectionParameters = {
            minConnectionInterval: 10000,
            maxConnectionInterval: 10000,
            slaveLatency: 10,
            connectionSupervisionTimeout: 4000,
        };
        testLib.connectToPeripheral(peripheralAddress)
            .then((device) => {
                testLib._adapter.once('error', () => {});
                theDevice = device;
                return device;
            })
            .then((device) => {
                return testLib.updateConnectionParameters(device.instanceId, connectionParameters);
            })
            .then((device) => {
                console.log(device);
                assert(false);
            })
            .then(() => {
                done();
            })
            .catch((error) => {
                testLib.disconnect(theDevice.instanceId).then(() => {
                    done();
                });
                assert.equal(error.description.errcode, 'NRF_ERROR_INVALID_PARAM');
                if (error.description.errcode !== 'NRF_ERROR_INVALID_PARAM') {
                    console.log(error);
                }
            });
    });
});
