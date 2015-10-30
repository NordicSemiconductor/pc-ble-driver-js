'use strict';
const assert = require('assert');
const testLib = require('./testLibrary').singletonContainer.testLibrary;
const _ = require('underscore');
describe('Read write ', function() {
    this.timeout(100000);
    const peripheralAddress = process.env.testPeripheral;
    it('should be possible to write a value to a descriptor and read back what was written', (done) => {
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
                let buffer = new Buffer([ 8, 6]);
                return testLib.writeDescriptorValue(cccdDescriptor.instanceId, buffer, true);
            })
            .then((attribute) => {
                console.log(attribute);
                return testLib.readDescriptorValue(cccdDescriptor.instanceId);
            })
            .then((byteArray) => {
                console.log(byteArray);
                return testLib.disconnect(theDevice.instanceId);
            })
            .then(() => {done();})
            .catch((error) => {
                console.log('error ');
                done(error);
            });
    });
});
