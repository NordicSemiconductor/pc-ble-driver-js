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
        this.uuid = uuid.replace(/-/g, '');

        if (this.uuid.length !== 2 && this.uuid.length !== 32) {
            throw new Error('uuid must be 128-bit (32 chars in hex) or 16-bit (2 chars in hex)');
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
