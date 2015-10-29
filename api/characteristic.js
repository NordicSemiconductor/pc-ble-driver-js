'use strict';

var i = 1;

class Characteristic {
    constructor(serviceInstanceId, uuid, value, properties) {
        if (!serviceInstanceId) throw new Error('serviceInstanceId must be provided.');
        if (!uuid) throw new Error('uuid must be provided.');
        if (!value) throw new Error('value must be provided.');
        if (!properties) throw new Error('properties must be provided.');

        this._instanceId = serviceInstanceId + '.' + (i++).toString();
        this._serviceInstanceId = serviceInstanceId;
        this.uuid = uuid.replace(/-/g, '');
        this.value = value;
        this.properties = properties;

        this.name = null;

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
