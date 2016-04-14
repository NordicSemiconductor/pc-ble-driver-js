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

class Security {
    constructor(bleDriver) {
        this._bleDriver = bleDriver;

        this._bleDriver.eccInit();
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
