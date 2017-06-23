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

const EventEmitter = require('events');
const splitArray = require('../../util/arrayUtil').splitArray;
const arrayToInt = require('../../util/intArrayConv').arrayToInt;
const ControlPointOpcode = require('../dfuConstants').ControlPointOpcode;
const ErrorCode = require('../dfuConstants').ErrorCode;
const createError = require('../dfuConstants').createError;
const NotificationQueue = require('./notificationQueue');
const PacketWriter = require('./packetWriter');

const DEFAULT_MTU_SIZE = 20;

class ObjectWriter extends EventEmitter {

    constructor(adapter, controlPointCharacteristicId, packetCharacteristicId) {
        super();
        this._adapter = adapter;
        this._packetCharacteristicId = packetCharacteristicId;
        this._notificationQueue = new NotificationQueue(adapter, controlPointCharacteristicId);
        this._mtuSize = DEFAULT_MTU_SIZE;
        this._abort = false;
    }

    /**
     * Writes DFU data object according to the given MTU size.
     *
     * @param data byte array that should be written
     * @param type the ObjectType that we are writing
     * @param offset the offset to continue from (optional)
     * @param crc32 the CRC32 value to continue from (optional)
     * @returns promise that returns progress info (CRC32 value and offset)
     */
    writeObject(data, type, offset, crc32) {
        const packets = splitArray(data, this._mtuSize);
        const packetWriter = this._createPacketWriter(offset, crc32);
        this._notificationQueue.startListening();
        return this._writePackets(packetWriter, packets, type)
            .then(() => {
                this._notificationQueue.stopListening();
                return {
                    offset: packetWriter.getOffset(),
                    crc32: packetWriter.getCrc32()
                };
            }).catch(error => {
                this._notificationQueue.stopListening();
                throw error;
            });
    }

    /*
     * Specifies that the object writer should abort before the next packet is
     * written. An error with code ABORTED will be thrown.
     */
    abort() {
        this._abort = true;
    }

    /**
     * Sets packet receipt notification (PRN) value, which specifies how many
     * packages should be sent before receiving receipt.
     *
     * @param prn the PRN value (disabled if 0)
     */
    setPrn(prn) {
        this._prn = prn;
    }

    /**
     * Sets maximum transmission unit (MTU) size. This defines the size of
     * packets that are transferred to the device. Default is 20.
     *
     * @param mtuSize the MTU size
     */
    setMtuSize(mtuSize) {
        this._mtuSize = mtuSize;
    }

    _writePackets(packetWriter, packets, objectType) {
        return packets.reduce((prevPromise, packet) => {
            return prevPromise.then(() => this._writePacket(packetWriter, packet, objectType));
        }, Promise.resolve());
    }

    _writePacket(packetWriter, packet, objectType) {
        return this._checkAbortState()
            .then(() => packetWriter.writePacket(packet))
            .then(progressInfo => {
                if (progressInfo.isPrnReached) {
                    return this._validateProgress(progressInfo);
                }
                this.emit('packetWritten', {
                    offset: progressInfo.offset,
                    type: objectType
                });
            });
    }

    _createPacketWriter(offset, crc32) {
        const writer = new PacketWriter(this._adapter, this._packetCharacteristicId);
        writer.setOffset(offset);
        writer.setCrc32(crc32);
        writer.setPrn(this._prn);
        return writer;
    }

    _checkAbortState() {
        if (this._abort) {
            return Promise.reject(createError(ErrorCode.ABORTED, 'Abort was triggered.'));
        }
        return Promise.resolve();
    }

    _validateProgress(progressInfo) {
        return this._notificationQueue.readNext(ControlPointOpcode.CALCULATE_CRC)
            .then(notification => {
                this._validateOffset(notification, progressInfo.offset);
                this._validateCrc32(notification, progressInfo.crc32);
            });
    }

    _validateOffset(notification, offset) {
        const offsetArray = notification.slice(3, 7);
        const responseOffset = arrayToInt(offsetArray);
        if (responseOffset !== offset) {
            throw createError(ErrorCode.INVALID_OFFSET, `Error when validating offset. ` +
                `Got ${responseOffset}, but expected ${offset}.`);
        }
    }

    _validateCrc32(notification, crc32) {
        const crc32Array = notification.slice(7, 11);
        const responseCrc = arrayToInt(crc32Array);
        if (responseCrc !== crc32) {
            throw createError(ErrorCode.INVALID_CRC, `Error when validating CRC. ` +
                `Got ${responseCrc}, but expected ${crc32}.`);
        }
    }
}

module.exports = ObjectWriter;
