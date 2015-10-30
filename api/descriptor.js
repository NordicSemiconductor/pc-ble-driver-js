'use strict';

var i = 1;

class Descriptor {
    constructor(characteristicInstanceId, uuid, value) {
        this._instanceId = characteristicInstanceId + '.' + (i++).toString();
        this._characteristicInstanceId = characteristicInstanceId;
        this.uuid = uuid;
        this.name = null;
        this.value = value;
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
