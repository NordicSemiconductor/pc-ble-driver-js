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
 * Class that represents a GATT descriptor.
 */
class Descriptor {
    /**
     * Create a descriptor in the Bluetooth `Device's` GATT attribute table.
     *
     * @constructor
     * @param {string} characteristicInstanceId The `Characteristic` instanceID this descriptor is to be added to.
     * @param {string} uuid A 128-bit or 16-bit unique identifier for this descriptor.
     * @param {array} value The initial value of this descriptor.
     * @param {Object} options This GATT descriptor's attribute's metadata.
     */
    constructor(characteristicInstanceId, uuid, value, options) {
        if (!characteristicInstanceId) {
            throw new Error('characteristicInstanceId must be provided.');
        }
        if (!uuid) {
            throw new Error('uuid must be provided.');
        }

        // if (!value) throw new Error('value must be provided.');

        // increment global so `descriptorInstanceId` is unique for each created service.
        i += 1;

        this._instanceId = `${characteristicInstanceId}.${i}`;
        this._characteristicInstanceId = characteristicInstanceId;
        this.uuid = uuid;

        if (this.uuid && !(this.uuid.length === 4 || this.uuid.length === 32)) {
            throw new Error('uuid must be 128-bit or 16-bit.');
        }

        this.handle = null;
        this.value = value;

        if (options) {
            this.readPerm = options.readPerm;
            this.writePerm = options.writePerm;
            this.variableLength = options.variableLength;
            this.maxLength = options.maxLength;
        }
    }

    /**
     * Get the instanceId of this descriptor (since uuid is not enough to separate between descriptors).
     * @returns {string} Unique ID of this descriptor.
     */
    get instanceId() {
        return this._instanceId;
    }

    /**
     * Get the instance Id of the GATT characteristic that this descriptor belongs to.
     * @returns {string} Unique Id of the characteristic that this descriptor belongs to.
     */
    get characteristicInstanceId() {
        return this._characteristicInstanceId;
    }
}

module.exports = Descriptor;
