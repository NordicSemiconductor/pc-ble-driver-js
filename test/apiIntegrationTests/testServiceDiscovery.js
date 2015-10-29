'use strict';
const assert = require('assert');
const testLib = require('./testLibrary').singletonContainer.testLibrary;
const sinon = require('sinon');

let promiseSequencer = (list, data) => {
    console.log(JSON.stringify(data));
    var p = Promise.resolve(data);
    return list.reduce((previousP, nextP) => {
        return previousP.then(nextP);
    }, p);
};

describe('Service Discovery', function() {

    const peripheralAddress = process.env.testPeripheral;
    this.timeout(10000);

    it('should be possibe to read all characteristics in the first service found', (done) => {
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
            .then(() => {done();})
            .catch((error) => {
                testLib.disconnect(theDevice.instanceId).then(() => {
                    done(error);
                });
            });
    });

    it('should be possible to discover all descriptors', (done) => {
        let theDevice;
        testLib.connectToPeripheral(peripheralAddress)
            .then((device) => {
                theDevice = device;
                return device;
            })
            .then((device) => {
                return testLib.getAllDescriptorsForAllServices(theDevice.instanceId);
            })
            .then((descriptors) => {
                assert(descriptors.length > 0);
                assert(descriptors[0].uuid);
                return testLib.disconnect(theDevice.instanceId);
            })
            .then(() => {done();})
            .catch((error) => {
                testLib.disconnect(theDevice.instanceId).then(() => {
                    done(error);
                });
            });
    });
});
