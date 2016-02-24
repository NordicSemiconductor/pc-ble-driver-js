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
