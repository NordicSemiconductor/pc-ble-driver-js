'use strict';

var i = 1;

class Descriptor {
    constructor(characteristicInstanceId, uuid, value, options) {
        if (!characteristicInstanceId) throw new Error('serviceInstanceId must be provided.');
        if (!uuid) throw new Error('uuid must be provided.');

        // if (!value) throw new Error('value must be provided.');

        this._instanceId = characteristicInstanceId + '.' + (i++).toString();
        this._characteristicInstanceId = characteristicInstanceId;
        this.uuid = uuid;

        if (this.uuid && !(this.uuid.length === 4 || this.uuid.length === 32)) {
            throw new Error('uuid must be 128-bit or 16-bit.');
        }

        this.handle = null;
        this.value = value;

        for (let option in options) {
            if (option === 'readPerm') {
                this.readPerm = options.readPerm;
            } else if (option === 'writePerm') {
                this.writePerm = options.writePerm;
            } else if (option === 'variableLength') {
                this.variableLength = options.variableLength;
            } else if (option === 'maxLength') {
                this.maxLength = options.maxLength;
            }
        }
    }

    get instanceId() {
        return this._instanceId;
    }

    get characteristicInstanceId() {
        return this._characteristicInstanceId;
    }
}

module.exports = Descriptor;
