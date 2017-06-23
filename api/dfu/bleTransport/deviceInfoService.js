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

const ErrorCode = require('../dfuConstants').ErrorCode;
const createError = require('../dfuConstants').createError;

class DeviceInfoService {

    /**
     * Creates a service that returns properties for a device.
     *
     * @param adapter a connected adapter instance
     * @param deviceInstanceId instance id for the device
     */
    constructor(adapter, deviceInstanceId) {
        this._adapter = adapter;
        this._deviceId = deviceInstanceId;
    }

    /**
     * Get the internal characteristic id for the given serviceUuid and
     * characteristicUuid.
     *
     * @param serviceUuid
     * @param characteristicUuid
     * @returns promise that returns characteristic id
     */
    getCharacteristicId(serviceUuid, characteristicUuid) {
        return this._getAttributes()
            .then(attributeData => this._getService(attributeData, serviceUuid))
            .then(service => this._getCharacteristicIdFromService(service, characteristicUuid));
    }

    _getAttributes() {
        return new Promise((resolve, reject) => {
            this._adapter.getAttributes(this._deviceId, (err, data) => {
                if (err) {
                    reject(createError(ErrorCode.NO_DFU_SERVICE, err.message));
                } else {
                    resolve(data);
                }
            });
        });
    }

    _getService(attributeData, serviceUuid) {
        const serviceIds = Object.keys(attributeData.services);
        const serviceId = serviceIds.find(id => {
            return attributeData.services[id].uuid === serviceUuid;
        });
        if (serviceId) {
            return Promise.resolve(attributeData.services[serviceId]);
        } else {
            return Promise.reject(createError(ErrorCode.NO_DFU_SERVICE, `Unable to find ` +
                `service ${serviceUuid} for device ${this._deviceId}`));
        }
    }

    _getCharacteristicIdFromService(service, characteristicUuid) {
        const characteristicIds = Object.keys(service.characteristics);
        const characteristicId = characteristicIds.find(id => {
            return service.characteristics[id].uuid === characteristicUuid;
        });
        if (characteristicId) {
            return Promise.resolve(characteristicId);
        } else {
            return Promise.reject(createError(ErrorCode.NO_DFU_CHARACTERISTIC,
                `Unable to find characteristic ${characteristicUuid} for service ` +
                `${service.uuid} on device ${this._deviceId}`));
        }
    }
}

module.exports = DeviceInfoService;
