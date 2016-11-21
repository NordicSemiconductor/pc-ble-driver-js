'use strict';

const crc = require('crc');
const { createError, ErrorCode } = require('./dfuConstants');
const { splitArray } = require('../util/arrayUtil');


class InitPacketState {

    /**
     * Create InitPacketState based on the total init packet data and the current
     * state on the device.
     *
     * @param data complete initPacket data (byte array)
     * @param deviceState current state ({offset, crc32, maximumSize}) on device
     */
    constructor(data, deviceState) {
        this._validateSize(data.length, deviceState.maximumSize);
        this._deviceState = deviceState;
        this._data = data;
        this._isResumable = _canResumeWriting(this._data, deviceState.offset, deviceState.crc32);
    }

    get offset() {
        if (this._isResumable) {
            return this._deviceState.offset;
        }
        return 0;
    }

    get crc32() {
        if (this._isResumable) {
            return this._deviceState.crc32;
        }
        return 0;
    }

    get remainingData() {
        if (this._isResumable) {
            return this._data.slice(this._deviceState.offset);
        }
        return this._data;
    }

    get isResumable() {
        return this._isResumable;
    }

    _validateSize(size, deviceMaxSize) {
        if (size > deviceMaxSize) {
            throw createError(ErrorCode.INIT_PACKET_TOO_LARGE, `Init packet size (${size}) ` +
                `is larger than max size (${deviceMaxSize})`);
        }
    }

    toString() {
        return `{ isResumable: ${this.isResumable}, offset: ${this.offset}, crc32: ${this.crc32}, ` +
            `remainingData.length: ${this.remainingData.length} }`;
    }
}

class FirmwareState {

    /**
     * Create FirmwareState based on the total firmware data and the current deviceState
     * on the device.
     *
     * @param data complete firmware data (byte array)
     * @param deviceState current state ({offset, crc32, maximumSize}) on device
     */
    constructor(data, deviceState) {
        this._data = data;
        this._deviceState = deviceState;
        this._partialObject = _getRemainingPartialObject(this._data, deviceState.maximumSize, deviceState.offset);
        this._isResumable = _canResumeWriting(this._data, deviceState.offset, deviceState.crc32);
    }

    get offset() {
        if (this._partialObject.length > 0 && !this._isResumable) {
            // There is a partial object on the device, but crc32 is invalid.
            // Object must be re-created, so return offset at the beginning of object.
            return this._deviceState.offset - this._deviceState.maximumSize + this._partialObject.length;
        }
        return this._deviceState.offset;
    }

    get crc32() {
        if (this._partialObject.length > 0 && !this._isResumable) {
            // There is a partial object on the device, but crc32 is invalid.
            // Object must be re-created, so clear the crc32 value.
            return 0;
        }
        return this._deviceState.crc32;
    }

    get totalSize() {
        return this._data.length;
    }

    get remainingObjects() {
        const remainingData = this._data.slice(this.offset + this.remainingPartialObject.length);
        return splitArray(remainingData, this._deviceState.maximumSize);
    }

    get remainingPartialObject() {
        return this._isResumable ? this._partialObject : [];
    }

    get isResumable() {
        return this._isResumable;
    }

    toString() {
        return `{ isResumable: ${this.isResumable}, offset: ${this.offset}, crc32: ${this.crc32}, ` +
            `remainingPartialObject.length: ${this.remainingPartialObject.length}, ` +
            `remainingObjects.length: ${this.remainingObjects.length}, totalSize: ${this.totalSize} }`;
    }
}


function _getRemainingPartialObject(data, maximumSize, offset) {
    const remainder = offset % maximumSize;
    if (offset === 0 || remainder === 0 || offset === data.length) {
        return [];
    }
    return data.slice(offset, offset + maximumSize - remainder);
}

function _canResumeWriting(data, offset, crc32) {
    if (offset === 0 || offset > data.length || crc32 !== crc.crc32(data.slice(0, offset))) {
        return false;
    }
    return true;
}

module.exports = {
    InitPacketState,
    FirmwareState,
};