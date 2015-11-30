'use strict';

var i = 1;

class Characteristic {
    constructor(serviceInstanceId, uuid, value, properties) {
        if (!serviceInstanceId) throw new Error('serviceInstanceId must be provided.');
        if (!value) throw new Error('value must be provided.');
        if (!properties) throw new Error('properties must be provided.');

        this._instanceId = serviceInstanceId + '.' + (i++).toString();
        this._serviceInstanceId = serviceInstanceId;
        this.uuid = uuid;

        if (this.uuid && !(this.uuid.length === 4 || this.uuid.length === 32)) {
            throw new Error('uuid must be 128-bit or 16-bit.');
        }

        this.declarationHandle = null;
        this.valueHandle = null;
        this.value = value;
        this.properties = properties;
    }

    get instanceId() {
        return this._instanceId;
    }

    // The GATT service this characteristic belongs to
    get serviceInstanceId() {
        return this._serviceInstanceId;
    }

    get handle() {
        return this.valueHandle;
    }
}

module.exports = Characteristic;
