
let i = 1;

class Descriptor {
    constructor(characteristicInstanceId, uuid, value) {
        this._instanceId = characteristicInstanceId + '.' + (i++).toString();
        this._characteristicInstanceId = characteristicInstanceId;
        this._uuid = uuid;
        this._value = value;
    }

    get instanceId() {
        return this._instanceId;
    }

    get characteristicInstanceId() {
        return this._characteristicInstanceId;
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

    // ArrayBuffer (cached descriptor value)
    get value() {
        return this._value;
    }
}
