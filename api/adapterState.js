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

class AdapterState {
    constructor(instanceId, port) {
        this._instanceId = instanceId + '.' + port;
        this._port = port;

        this.baudRate = null;
        this.parity = null;
        this.flowControl = null;

        this.available = false;
        this.scanning = false;
        this.advertising = false;
        this.connecting = false;

        this._address = null;
        this._addressType = null;
        this.name = null;
        this.firmwareVersion = null;
    }

    get instanceId() {
        return this._instanceId;
    }

    get port() {
        return this._port;
    }

    get powered() {
        // TODO: ?
    }

    get address() {
        return this._address;
    }

    set address(address) {
        if (typeof address === 'string') {
            this._address = address;
            this._addressType = 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC';
        } else {
            this._address = address.address;
            this._addressType = address.type;
        }
    }

    get addressType() {
        return this._addressType;
    }
}

module.exports = AdapterState;
