/* Copyright (c) 2010 - 2017, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Use in source and binary forms, redistribution in binary form only, with
 * or without modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions in binary form, except as embedded into a Nordic
 *    Semiconductor ASA integrated circuit in a product or a software update for
 *    such product, must reproduce the above copyright notice, this list of
 *    conditions and the following disclaimer in the documentation and/or other
 *    materials provided with the distribution.
 *
 * 2. Neither the name of Nordic Semiconductor ASA nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 *
 * 3. This software, with or without modification, must only be used with a Nordic
 *    Semiconductor ASA integrated circuit.
 *
 * 4. Any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

/**
 * Class that provides security functionality through the pc-ble-driver-js AddOn.
 */
class Security {
    /**
     * Create a wrapper to the security functionality of the underlying BLE driver.
     *
     * @constructor
     * @param bleDriver The underlying BLE driver `pc-ble-driver-js-sd_api_v<X>` called with bindings.
     */
    constructor(bleDriver) {
        this._bleDriver = bleDriver;
        this._bleDriver.eccInit();
    }

    /**
     * Method that generates a public/private key pair where the public key is to be distributed.
     *
     * @returns {Object} The public private key pair. TODO: double check this.
     */
    generateKeyPair() {
        return this._bleDriver.eccGenerateKeypair();
    }

    /**
     * Method that generates a public key.
     *
     * @param {string} privateKey The private key that should be used to generate the public key.
     * @returns {string} The generated public key.
     */
    generatePublicKey(privateKey) {
        return this._bleDriver.eccComputePublicKey(privateKey);
    }

    /**
     * Method that generates a shared secret.
     *
     * @param {string} privateKey The private key that should be used to generate the shared secret.
     * @param {string} publicKey The public key that should be used to generate the shared secret.
     * @returns {string} The generated shared secret.
     */
    generateSharedSecret(privateKey, publicKey) {
        return this._bleDriver.eccComputeSharedSecret(privateKey, publicKey);
    }
}

module.exports = Security;
