'use strict';

var i = 1;

class Descriptor {
    constructor(characteristicInstanceId, uuid, value, properties) {
        if (!characteristicInstanceId) throw new Error('serviceInstanceId must be provided.');
        if (!uuid) throw new Error('uuid must be provided.');
        if (!value) throw new Error('value must be provided.');
        if (!properties) throw new Error('properties must be provided.');

        this._instanceId = characteristicInstanceId + '.' + (i++).toString();
        this._characteristicInstanceId = characteristicInstanceId;
        this.uuid = uuid.replace(/-/g, '');
        this.value = value;
        this.properties = properties;

        this.name = null;
        this.handle = null;
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

    set uuid(uuid) {
        if (uuid) {
            this._uuid = uuid.replace(/-/g, '');
        } else {
            this._uuid = uuid;
        }
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
}

module.exports = Descriptor;
