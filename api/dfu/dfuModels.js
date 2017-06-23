/* Copyright (c) 2010 - 2017, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Use in source and binary forms, redistribution in binary form only, with
 * or without modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions in binary form, except as embedded into a Nordic
 *    Semiconductor ASA integrated circuit in a product or a software update for
 *    such product, must reproduce the above copyright notice, this list of
 *    conditions and the following disclaimer in the documentation and/or other
 *    materials provided with the distribution.
 *
 * 2. Neither the name of Nordic Semiconductor ASA nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 *
 * 3. This software, with or without modification, must only be used with a Nordic
 *    Semiconductor ASA integrated circuit.
 *
 * 4. Any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

const crc = require('crc');
const createError = require('./dfuConstants').createError;
const ErrorCode = require('./dfuConstants').ErrorCode;
const splitArray = require('../util/arrayUtil').splitArray;


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
        this._hasResumablePartialObject = _canResumeWriting(this._data, deviceState.offset, deviceState.crc32);
    }

    get offset() {
        if (this._hasResumablePartialObject) {
            return this._deviceState.offset;
        }
        return 0;
    }

    get crc32() {
        if (this._hasResumablePartialObject) {
            return this._deviceState.crc32;
        }
        return 0;
    }

    get remainingData() {
        if (this._hasResumablePartialObject) {
            return this._data.slice(this._deviceState.offset);
        }
        return this._data;
    }

    get hasResumablePartialObject() {
        return this._hasResumablePartialObject;
    }

    _validateSize(size, deviceMaxSize) {
        if (size > deviceMaxSize) {
            throw createError(ErrorCode.INIT_PACKET_TOO_LARGE, `Init packet size (${size}) ` +
                `is larger than max size (${deviceMaxSize})`);
        }
    }

    toString() {
        return `{ hasResumablePartialObject: ${this.hasResumablePartialObject}, offset: ${this.offset}, ` +
            `crc32: ${this.crc32}, remainingData.length: ${this.remainingData.length} }`;
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
        this._hasResumablePartialObject = _canResumeWriting(this._data, deviceState.offset, deviceState.crc32);
    }

    get offset() {
        if (this._partialObject.length > 0 && !this._hasResumablePartialObject) {
            // There is a partial object on the device, but crc32 is invalid.
            // Object must be re-created, so return offset at the beginning of object.
            return this._deviceState.offset - this._deviceState.maximumSize + this._partialObject.length;
        }
        return this._deviceState.offset;
    }

    get crc32() {
        if (this._partialObject.length > 0 && !this._hasResumablePartialObject) {
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
        return this._hasResumablePartialObject ? this._partialObject : [];
    }

    get hasResumablePartialObject() {
        return this._hasResumablePartialObject;
    }

    toString() {
        return `{ hasResumablePartialObject: ${this.hasResumablePartialObject}, offset: ${this.offset}, ` +
            `crc32: ${this.crc32}, remainingPartialObject.length: ${this.remainingPartialObject.length}, ` +
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
