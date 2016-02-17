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

describe('Long Read and write operations', function() {
    this.timeout(30000);

    const peripheralAddress = process.env.testPeripheral;
    xit('should write a value to a descriptor and read it back. (short write)', done => {
        let theDevice;
        let longWriteCharacteristic;
        const longValue = [
                            0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10, 0x11,
                            0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F, 0x20, 0x21, 0x22, 0x23,
                            0x24,
                          ];

        testLib.startAdvertising()
            .then(() => {
                return testLib.waitForConnectedEvent();
            })
            .then(device => {
                theDevice = device;
                return testLib.getAllCharacteristicsForAllServices(theDevice.instanceId);
            })
            .then(characteristics => {
                assert(characteristics.length > 0);
                longWriteCharacteristic =  _.find(characteristics, characteristic => {
                    return characteristic.uuid.indexOf('5678') === 4;
                });

                assert(longWriteCharacteristic);

                return testLib.writeCharacteristicValue(longWriteCharacteristic.instanceId, longValue, true);
            })
            .then(attribute => {
                return testLib.readCharacteristicValue(longWriteCharacteristic.instanceId);
            })
            .then(readValue => {
                assert(_.isEqual(longValue, readValue));
                return testLib.disconnect(theDevice.instanceId);
            })
            .then(() => {done();})
            .catch(error => {
                console.log(error);
                testLib.disconnect(theDevice.instanceId).then(() => {
                    done(error);
                });
            });
    });
});
