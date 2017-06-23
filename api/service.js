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

function _assertValidType(type) {
    if (type !== 'primary' && type !== 'secondary') {
        throw new Error(`Type can only be 'primary' or 'secondary', not '${type}'.`);
    }
}

/**
 * Class that represents a GATT service.
 */
class Service {
    /**
     * Create a service in the Bluetooth `Device's` GATT attribute table.
     *
     * @constructor
     * @param {string} deviceInstanceId The unique ID of the Bluetooth device to add `Service` to.
     * @param {string} uuid A 128-bit or 16-bit unique identifier for this service.
     * @param {string} type The server service type. 'primary' or `secondary`.
     */
    constructor(deviceInstanceId, uuid, type) {
        // increment global so `serviceInstanceId` is unique for each created service.
        i += 1;

        this._instanceId = `${deviceInstanceId}.${i}`;
        this._deviceInstanceId = deviceInstanceId;
        this.uuid = uuid;

        if (this.uuid && !(this.uuid.length === 4 || this.uuid.length === 32)) {
            throw new Error('uuid must be 128-bit or 16-bit.');
        }

        if (type !== undefined) {
            _assertValidType(type);
            this._type = type;
        } else {
            this._type = null;
        }

        this.startHandle = null;
        this.endHandle = null;
    }

    /**
     * Get the instanceId of this service (since uuid is not enough to differentiate services).
     * @returns {string} Unique ID of this service.
     */
    get instanceId() {
        return this._instanceId;
    }

    /**
     * Get the Id of the Bluetooth device that this service belongs to.
     * 'local.server': local/adapter, non-'local.server': remote peripheral.
     * @returns {string} The unique Id of the Bluetooth device that this service belongs to.
     */
    get deviceInstanceId() {
        return this._deviceInstanceId;
    }

    /**
     * Method that sets the `type` of this service.
     *
     * @param {string} type The type of this service. 'primary' or `secondary`.
     * @returns {void}
     */
    set type(type) {
        _assertValidType(type);
        this._type = type;
    }

    /**
     * Get the type of this service. 'primary' or `secondary`.
     * @returns {string} type The type of this service.
     */
    get type() {
        return this._type;
    }
}

module.exports = Service;
