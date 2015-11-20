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
        this.securityRequestPending = false;

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
