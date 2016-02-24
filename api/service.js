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

var assertValidType = function(type) {
    if (type !== 'primary' && type !== 'secondary') {
        throw new Error(`Type can only be 'primary' or 'secondary', not '${type}'.`);
    }
};

class Service {
    constructor(deviceInstanceId, uuid, type) {
        this._instanceId = deviceInstanceId + '.' + (i++).toString();
        this._deviceInstanceId = deviceInstanceId;
        this.uuid = uuid;

        if (this.uuid && !(this.uuid.length === 4 || this.uuid.length === 32)) {
            throw new Error('uuid must be 128-bit or 16-bit.');
        }

        if (type !== undefined) {
            assertValidType(type);
            this._type = type;
        } else {
            this._type = null;
        }

        this.startHandle = null;
        this.endHandle = null;
    }

    // unique ID for the service (since uuid is not enough to separate between services)
    get instanceId() {
        return this._instanceId;
    }

    // device address of the remote peripheral that the GATT service belongs to. 'local.server' when local.
    get deviceInstanceId() {
        return this._deviceInstanceId;
    }

    set type(type) {
        assertValidType(type);
        this._type = type;
    }

    get type() {
        return this._type;
    }
}

module.exports = Service;
