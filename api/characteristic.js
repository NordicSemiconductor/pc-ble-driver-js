
let i = 1;

class  Characteristic {
    constructor(serviceInstanceId, uuid, properties, value) {
        this._instanceId = serviceInstanceId + '.' + (i++).toString();
        this._serviceInstanceId = serviceInstanceId;
        this._uuid = uuid;
        this._properties = properties;
        this._value = value;
    }

    get instanceId() {
        return this._instanceId;
    }

    // The GATT service this characteristic belongs to
    get serviceInstanceId() {
        return this._serviceInstanceId;
    }

    get uuid() {
        return this._uuid;
    }

    // ArrayBuffer (cached characteristic value)
    get value() {
        return this._value;
    }

    // The properties of this characteristic "broadcast", "read", "writeWithoutResponse", "write", "notify", "indicate", "authenticatedSignedWrites", "extendedProperties", "reliableWrite", or "writableAuxiliaries"
    get properties() {
        return this._properties;
    }
}
