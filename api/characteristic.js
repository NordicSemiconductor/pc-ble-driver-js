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

var i = 1;

class Characteristic {
    constructor(serviceInstanceId, uuid, value, properties) {
        if (!serviceInstanceId) throw new Error('serviceInstanceId must be provided.');
        if (!value) throw new Error('value must be provided.');
        if (!properties) throw new Error('properties must be provided.');

        this._instanceId = serviceInstanceId + '.' + (i++).toString();
        this._serviceInstanceId = serviceInstanceId;
        this.uuid = uuid;

        if (this.uuid && !(this.uuid.length === 4 || this.uuid.length === 32)) {
            throw new Error('uuid must be 128-bit or 16-bit.');
        }

        this.declarationHandle = null;
        this.valueHandle = null;
        this.value = value;
        this.properties = properties;
    }

    get instanceId() {
        return this._instanceId;
    }

    // The GATT service this characteristic belongs to
    get serviceInstanceId() {
        return this._serviceInstanceId;
    }

    get handle() {
        return this.valueHandle;
    }
}

module.exports = Characteristic;
