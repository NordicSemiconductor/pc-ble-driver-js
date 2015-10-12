// TODO: does it need an adapterInstanceId?
class Device {
    constructor(address, name, role, uuids) {
        this._address = address;
        this._name = name;
        this._role = role;
        this._uuids = uuids;

        this._connected = false;

        this._services = {};
    }

    // null if not connected
    get instanceId() {
        return this._instanceId;
    }

    // Get the BLE address. 'local': local/adapter, non-'local': other device
    get address() {
        return this._address;
    }

    // Get GAP name
    get name() {
        return this._name;
    }

    set name(name) {
        this._name = name;
    }

    // 'peripheral', 'central'
    get role() {
        return this._role;
    }

    // List of uuids,
    get uuids() {
        return this._uuids;
    }

    set uuids(uuids) {
        this._uuids = uuids;
    }

    // Is connected
    get connected() {
        return this._connected;
    }

    set connected(isConnected) {
        this._connected = isConnected;
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

    get rssi() {
        return this._rssi;
    }

    set rssi(rssi) {
        this._rssi = rssi;
    }

    get txPower() {
        return this._txPower;
    }

    set txPower(txPower) {
        this._txPower = txPower;
    }
}
