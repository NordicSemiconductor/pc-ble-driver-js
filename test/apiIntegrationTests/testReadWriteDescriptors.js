'use strict';
const assert = require('assert');
const testLib = require('./testLibrary').singletonContainer.testLibrary;
const _ = require('underscore');

describe('Read and write operations', function() {
    this.timeout(10000);

    const peripheralAddress = process.env.testPeripheral;
    it('should write a value to a descriptor and read it back. (short write)', (done) => {
        let theDevice;
        let cccdDescriptor;
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
                cccdDescriptor =  _.find(descriptors, (descriptor) => {
                    return descriptor.uuid.indexOf('2902') === 4;
                });

                assert(cccdDescriptor);
                return testLib.writeDescriptorValue(cccdDescriptor.instanceId, [0x01, 0x00], true);
            })
            .then((attribute) => {
                return testLib.readDescriptorValue(cccdDescriptor.instanceId);
            })
            .then((buffer) => {
                assert.equal(buffer[0], 0x01);
                return testLib.disconnect(theDevice.instanceId);
            })
            .then(() => {done();})
            .catch((error) => {
                console.log('error ');
                testLib.disconnect(theDevice.instanceId).then(() => {
                    done(error);
                });
            });
    });

    xit('should do a long write and long read', (done) => {
        let theDevice;
        let cccdDescriptor;
        testLib.connectToPeripheral(peripheralAddress)
            .then((device) => {
                theDevice = device;
                return device;
            })
            .then((device) => {
                return testLib.getServices(theDevice.instanceId);
            })
            .then((services) => {
                assert(services.length > 0);
                return testLib.getCharacteristics(services[0].instanceId);
            })
            .then((characteristics) => {
                const characteristic = _.find(characteristics, characteristic => {
                    return (characteristic.uuid.indexOf('2A00') === 4);
                });
                console.log(characteristic);
                return testLib.writeCharacteristicValue(characteristic.instanceId, [77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77], true);
            })
            .then((attribute) => {
                console.log(attribute);
                return testLib.readDescriptorValue(cccdDescriptor.instanceId);
            })
            .then((buffer) => {
                console.log(buffer);
                console.log(buffer[0].readUIntLE(0, 2));
                return testLib.disconnect(theDevice.instanceId);
            })
            .then(() => {done();})
            .catch((error) => {
                console.log('error ');
                done(error);
            });
    });
});
