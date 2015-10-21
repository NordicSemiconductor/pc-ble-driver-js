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

        this.address = null;
        this.name = null;
        this.firmwareVersion = null;
        this.gattBusyMap = {}; // map from device instance id to bool
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
}

module.exports = AdapterState;
