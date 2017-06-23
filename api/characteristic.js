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

let i = 1;

/**
 * Class that represents a GATT characteristic.
 */
class Characteristic {
    /**
     * Create a characteristic in the Bluetooth `Device's` GATT attribute table.
     *
     * @constructor
     * @param {string} serviceInstanceId The `Service` instanceID this characteristic is to be added to.
     * @param {string} uuid A 128-bit or 16-bit unique identifier for this characteristic.
     * @param {array} value The initial value of this characteristic.
     * @param {Object} properties This GATT characteristic's metadata.
     * @param {Object} options This GATT characteristic's attribute's metadata.
     */
    constructor(serviceInstanceId, uuid, value, properties, options) {
        if (!serviceInstanceId) {
            throw new Error('serviceInstanceId must be provided.');
        }
        if (!value) {
            throw new Error('value must be provided.');
        }
        if (!properties) {
            throw new Error('properties must be provided.');
        }

        // increment global so `characteristicInstanceId` is unique for each created service.
        i += 1;

        this._instanceId = `${serviceInstanceId}.${i}`;
        this._serviceInstanceId = serviceInstanceId;
        this.uuid = uuid;

        if (this.uuid && !(this.uuid.length === 4 || this.uuid.length === 32)) {
            throw new Error('uuid must be 128-bit or 16-bit.');
        }

        this.declarationHandle = null;
        this.valueHandle = null;
        this.value = value;
        this.properties = properties;

        if (options) {
            this.readPerm = options.readPerm;
            this.writePerm = options.writePerm;
            this.variableLength = options.variableLength;
            this.maxLength = options.maxLength;
        }
    }

    /**
     * Get the instanceId of this characteristic (since uuid is not enough to separate between characteristics).
     * @returns {string} Unique ID of this characteristic.
     */
    get instanceId() {
        return this._instanceId;
    }

    /**
     * Get the instance Id of the GATT service that this characteristic belongs to.
     * @returns {string} Unique Id of the service that this characteristic belongs to.
     */
    get serviceInstanceId() {
        return this._serviceInstanceId;
    }

    /**
     * Get the handle of this characteristic in the `Device's` GATT attribute table.
     * @returns {string} The handle of this characteristic in the `Device's` GATT attribute table.
     */
    get handle() {
        return this.valueHandle;
    }
}

module.exports = Characteristic;
