'use strict';
const assert = require('assert');
const testLib = require('./testLibrary').singletonContainer.testLibrary;
const sinon = require('sinon');

describe('Service Discovery', function() {
    this.timeout(10000);
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
                assert(characteristics[0].uuid);
            })
            .then(() => {
                return testLib.disconnect(theDevice.instanceId);
            })
            .then(() => {done()})
            .catch((error) => {
                console.log('Enumerating characteristics failed: ', JSON.stringify(error));
                done(error);
                //assert(false, error);
            });
    });
});
