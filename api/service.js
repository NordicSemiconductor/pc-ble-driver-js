'use strict';

var i = 1;

var assertValidType = function(type) {
    if (type !== 'primary' && type !== 'secondary') {
        throw new Error(`Type can only be 'primary' or 'secondary', not '${type}'.`);
    }
};

class Service {
    constructor(deviceInstanceId, uuid, type) {
        this._instanceId = deviceInstanceId + '.' + (i++).toString();
        this._deviceInstanceId = deviceInstanceId;
        this.uuid = uuid;

        if (this.uuid && !(this.uuid.length === 4 || this.uuid.length === 32)) {
            throw new Error('uuid must be 128-bit or 16-bit.');
        }

        this.name = null;

        if (type !== undefined) {
            assertValidType(type);
            this._type = type;
        } else {
            this._type = null;
        }

        this.startHandle = null;
        this.endHandle = null;
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

    set type(type) {
        assertValidType(type);
        this._type = type;
    }

    get type() {
        return this._type;
    }
}

module.exports = Service;
