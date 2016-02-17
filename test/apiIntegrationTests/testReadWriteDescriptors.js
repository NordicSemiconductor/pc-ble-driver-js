/* Copyright (c) 2016 Nordic Semiconductor. All Rights Reserved.
 *
 * The information contained herein is property of Nordic Semiconductor ASA.
 * Terms and conditions of usage are described in detail in NORDIC
 * SEMICONDUCTOR STANDARD SOFTWARE LICENSE AGREEMENT.
 *
 * Licensees are granted free, non-transferable use of the information. NO
 * WARRANTY of ANY KIND is provided. This heading must NOT be removed from
 * the file.
 *
 */

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
            .then(device => {
                theDevice = device;
                return device;
            })
            .then(device => {
                return testLib.getAllDescriptorsForAllServices(theDevice.instanceId);
            })
            .then(descriptors => {
                assert(descriptors.length > 0);
                cccdDescriptor =  _.find(descriptors, descriptor => {
                    return descriptor.uuid.indexOf('2902') === 4;
                });

                assert(cccdDescriptor);
                return testLib.writeDescriptorValue(cccdDescriptor.instanceId, [0x01, 0x00], true);
            })
            .then(attribute => {
                return testLib.readDescriptorValue(cccdDescriptor.instanceId);
            })
            .then(buffer => {
                assert.equal(buffer[0], 0x01);
                return testLib.disconnect(theDevice.instanceId);
            })
            .then(() => {done();})
            .catch(error => {
                console.log('error ');
                testLib.disconnect(theDevice.instanceId).then(() => {
                    done(error);
                });
            });
    });
});
