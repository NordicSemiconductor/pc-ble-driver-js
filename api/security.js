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

const _bleDriver = require('bindings')('pc-ble-driver-js');

let _singleton = Symbol();

class Security {
    constructor(singletonToken, bleDriver) {
        if (_singleton !== singletonToken)
            throw new Error('Cannot instantiate directly.');

        this._bleDriver = bleDriver;

        this._bleDriver.eccInit();
    }

    static getInstance(bleDriver) {
        if (bleDriver === undefined)
            bleDriver = _bleDriver;

        if (!this[_singleton])
            this[_singleton] = new Security(_singleton, bleDriver);

        return this[_singleton];
    }

    generateKeyPair() {
        return this._bleDriver.eccGenerateKeypair();
    }

    generatePublicKey(privateKey) {
        return this._bleDriver.eccComputePublicKey(privateKey);
    }

    generateSharedSecret(privateKey, publicKey) {
        return this._bleDriver.eccComputeSharedSecret(privateKey, publicKey);
    }
}

module.exports = Security;
