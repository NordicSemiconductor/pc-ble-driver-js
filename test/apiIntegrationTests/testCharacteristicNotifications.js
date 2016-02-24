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
describe('Characteristic notifications', function() {
    this.timeout(10000);

    const peripheralAddress = process.env.testPeripheral;
    it('starting characteristic notification', (done) => {
        let theDevice;
        let notificationCharacteristic;
        let cccdDescriptor;
        let i = 0;

        testLib.connectToPeripheral(peripheralAddress)
            .then((device) => {
                theDevice = device;
                return device;
            }).then((device) => {
                return testLib.getAllDescriptorsForAllServices(theDevice.instanceId);
            })
            .then((descriptors) => {
                const characteristics = testLib.getAllCharacteristicsForAllServices(theDevice.instanceId);
                return characteristics;
            })
            .then((characteristics) => {
                assert(characteristics.length > 0);
                notificationCharacteristic =  _.find(characteristics, (characteristic) => {
                    return characteristic.properties.notify;
                });

                assert(notificationCharacteristic);
                testLib._adapter.once('descriptorValueChanged', descriptor => {
                    assert(descriptor.uuid.indexOf('2902') === 4);
                    assert.equal(descriptor.value[0], 0x01);
                    assert.equal(descriptor.value[1], 0x00);
                });
                return testLib.startCharacteristicsNotifications(notificationCharacteristic.instanceId, false);
            })
            .then(() => {
                return testLib.getAllDescriptorsForAllServices(theDevice.instanceId);
            })
            .then((descriptors) => {
                assert(descriptors.length > 0);
                cccdDescriptor =  _.find(descriptors, (descriptor) => {
                    if (notificationCharacteristic.instanceId === descriptor.characteristicInstanceId) {
                        return descriptor.uuid.indexOf('2902') === 4;
                    }

                    return false;
                });

                assert(cccdDescriptor);
                return testLib.readDescriptorValue(cccdDescriptor.instanceId);
            })
            .then((buffer) => {
                assert.equal(buffer[0], 0x01);

                return testLib.stopCharacteristicsNotifications(notificationCharacteristic.instanceId);
            })
            .then(() => {
                return testLib.disconnect(theDevice.instanceId);
            })
            .then(() => {
                done();
            })
            .catch((error) => {
                console.log(error);
                done(error);
            });
    });
});
