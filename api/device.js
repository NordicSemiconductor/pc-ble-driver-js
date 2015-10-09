// TODO: does it need an adapterInstanceId?
class Device {
    constructor(address, name, role, uuids) {
        // TODO: should it know what adapter it is related to? would it not need to know about the adapter to send driver calls?
        this._address = address;
        this._name = name;
        this._role = role;
        this._uuids = uuids;

        this._connected = false;
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
        // TODO: ask device or get from advertisment packet?
        return this._name;
    }

    // 'peripheral', 'central'
    get role() {
        return this._role;
    }

    // List of uuids,
    get uuids() {
        // TODO: how is this known? advertisment packet? updated when doing service discovery?
        return this._uuids;
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
        this._connectionHandle = connectionHandle;
        this._instanceId = this._address + '.' + connectionHandle;
    }

    get inqueryRssi() {
        // TODO: Ask device
    }

    get inqueryTxPower() {
        // TODO: Ask device
    }
}
