
// TODO: Add DI to AdapterFactory. whatever that means.
'use strict';

class AdapterState {
    constructor(instanceId, port) {
        this._instanceId = instanceId + '.' + port;
        this._port = port;

        this._available = false;

        this._scanning = false;
        this._advertising = false;
        this._connecting = false;
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

    // true if adapter is opened and functional
    get available() {
        return this._available;
    }

    set available(available) {
        this._available = available;
    }

    // Is scanning more appropriate
    get scanning() {
        return this._scanning;
    }

    set scanning(scanning) {
        this._scanning = scanning;
    }

    get advertising() {
        return this._advertising;
    }

    set advertising(advertising) {
        this._advertising = advertising;
    }

    get connecting() {
        return this._connecting;
    }

    set connecting(connecting) {
        this._connecting = connecting;
    }

    get address() {
        return this._address;
    }

    set address(address) {
        this._address = address;
    }

    get name() {
        return this._name;
    }

    set name(name) {
        this._name = name;
    }

    get firmwareVersion() {
        return this._firmwareVersion;
    }

    set firmwareVersion(firmwareVersion) {
        this._firmwareVersion = firmwareVersion;
    }

    get baudRate() {
        return this._baudRate;
    }

    set baudRate(baudRate) {
        this._baudRate = baudRate;
    }

    get parity() {
        return this._parity;
    }

    set parity(parity) {
        this._parity = parity;
    }

    get flowControl() {
        return this._flowControl;
    }

    set flowControl(flowControl) {
        this._flowControl = flowControl;
    }
}

module.exports = AdapterState;