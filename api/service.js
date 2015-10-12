
let i = 1;

class Service {
    constructor(deviceInstanceId, uuid) {
        this._instanceId = deviceInstanceId + '.' + (i++).toString();
        this._deviceInstanceId = deviceInstanceId;
        this._uuid = uuid;
        this._characteristics = {};
    }

    // unique ID for the service (since uuid is not enough to separate between services)
    get instanceId() {
        return this._instanceId;
    }

    // device address of the remote peripheral that the GATT service belongs to. 'local' when local.
    get deviceInstanceId() {
        return this._deviceInstanceId;
    }

    get uuid() {
        return this._uuid;
    }

    get name() {
        if (this._name) {
            return this._name;
        }

        // TODO: return a name looked up in uuid_definitions
        return this.uuid;
    }
}
