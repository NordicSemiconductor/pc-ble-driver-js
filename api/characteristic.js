'use strict';

var i = 1;

class Characteristic {
    constructor(serviceInstanceId, uuid, properties, value) {
        this._instanceId = serviceInstanceId + '.' + (i++).toString();
        this._serviceInstanceId = serviceInstanceId;
        this.uuid = uuid.replace(/-/g, '');
        this.name = null;
        this.properties = properties;
        this.value = value;

        this.declarationHandle = null;
        this.valueHandle = null;
    }

    get instanceId() {
        return this._instanceId;
    }

    // The GATT service this characteristic belongs to
    get serviceInstanceId() {
        return this._serviceInstanceId;
    }

    get name() {
        if (this._name) {
            return this._name;
        }

        // TODO: return a name looked up in uuid_definitions
        return this.uuid;
    }

    set name(name) {
        this._name = name;
    }

    get handle() {
        return this.valueHandle;
    }
}

module.exports = Characteristic;
