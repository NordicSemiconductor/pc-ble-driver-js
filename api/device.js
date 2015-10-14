'use strict';

// TODO: does it need an adapterInstanceId?

class Device {
    constructor(address, name, role, uuids) {
        this._instanceId = null;
        this._address = address;
        this.name = name;
        this._role = role;
        this._uuids = uuids;
        this._advDataUuids = uuids;
        this._scanRspUuids = [];

        this.services = {};

        this.connected = false;
        this.rssi = null;
        this.txPower = null;
        this._connectionHandle = null;
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

    get uuids() {
        return this.uuids;
    }

    get advDataUuids() {
        return this._advDataUuids;
    }

    set advDataUuids(uuids) {
        this._advDataUuids = uuids;
        this._uuids = this._advDataUuids.concat(this._scanRspUuids);
    }

    get scanRspUuids() {
        return this._scanRspUuids;
    }

    set scanRspUuids(uuids) {
        this._scanRspUuids = uuids;
        this._uuids = this._advDataUuids.concat(this._scanRspUuids);
    }

    set connectionHandle(connectionHandle) {
        // TODO: possible to set connectionHandle to undefined? will instanceID be correct?
        this._connectionHandle = connectionHandle;

        //TODO: Should instanceId involve role or is that handled by connectionHandle?
        this._instanceId = this._address + '.' + connectionHandle;
    }
}
