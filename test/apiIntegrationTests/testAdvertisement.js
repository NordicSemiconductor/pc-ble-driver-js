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

describe('Advertisement', function() {
    const peripheralAddress = process.env.testPeripheral;
    this.timeout(10000);

    it('should be possible to start advertisement', (done) => {
        testLib.startAdvertising()
            .then(() => { done(); })
            .catch((error) => {
                done(error);
            });
    });

    it('should be possible to stop a started advertisement', (done) => {
        testLib.stopAdvertising()
            .then(() => { done(); })
            .catch((error) => {
                done(error);
            });
    });
});
