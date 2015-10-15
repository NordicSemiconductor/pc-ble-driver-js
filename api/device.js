'use strict';

// TODO: does it need an adapterInstanceId?

class Device {
    constructor(address, role) {
        this._instanceId = null;
        this._address = address;
        this.name = null;
        this._role = role;
        this.uuids = [];

        this.services = {};

        this.connected = false;
        this.rssi = null;
        this.txPower = null;
        this._connectionHandle = null;

        this.minConnectionInterval = null;
        this.maxConnectionInterval = null;
        this.slaveLatency = null;
        this.connectionSupervisionTimeout = null;
    }

    // null if not connected
    get instanceId() {
        return this._instanceId;
    }

    // Get the BLE address. 'local': local/adapter, non-'local': other device
    get address() {
        return this._address;
    }

    // 'peripheral', 'central'
    get role() {
        return this._role;
    }

    get connectionHandle() {
        return this._connectionHandle;
    }

    set connectionHandle(connectionHandle) {
        // TODO: possible to set connectionHandle to undefined? will instanceID be correct?
        this._connectionHandle = connectionHandle;

        //TODO: Should instanceId involve role or is that handled by connectionHandle?
        this._instanceId = this._address + '.' + connectionHandle;
    }
}

module.exports = Device;
