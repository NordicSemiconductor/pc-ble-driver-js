'use strict';

const crc = require('crc');
const { ErrorCode, createError } = require('./dfuConstants');

const DEFAULT_OFFSET = 0;
const DEFAULT_CRC32 = undefined;
const DEFAULT_PRN = 0;

/**
 * Writes packets to the given packet characteristic. If packet receipt
 * notifications (PRN) is enabled, it will return progress information (offset
 * and accumulated CRC32) to the caller when the configured PRN is reached.
 */
class DfuPacketWriter {

    constructor(adapter, packetCharacteristicId) {
        this._adapter = adapter;
        this._packetCharacteristicId = packetCharacteristicId;
        this._prn = DEFAULT_PRN;
        this._offset = DEFAULT_OFFSET;
        this._crc32 = DEFAULT_CRC32;
        this._prnCount = 0;
    }

    /**
     * Writes the given packet. If PRN is reached, then the accumulated
     * CRC is returned so that the caller can verify it. Otherwise, an empty
     * promise is returned.
     *
     * @param packet byte array that should be written
     * @returns promise with offset and CRC if PRN has been reached, otherwise empty promise
     */
    writePacket(packet) {
        return this._write(packet)
            .then(() => this._accumulateCrc32(packet))
            .then(() => this._incrementOffset(packet))
            .then(() => this._incrementPrn())
            .then(() => this._returnProgressIfPrnReached());
    }

    _write(packet) {
        return new Promise((resolve, reject) => {
            const characteristicId = this._packetCharacteristicId;
            const value = packet;
            const ack = false;
            this._adapter.writeCharacteristicValue(characteristicId, value, ack, error => {
                error ? reject(createError(ErrorCode.WRITE_ERROR, error.message)) : resolve();
            });
        });
    }

    _incrementOffset(packet) {
        this._offset += packet.length;
        return Promise.resolve();
    }

    _incrementPrn() {
        this._prnCount++;
        return Promise.resolve();
    }

    _accumulateCrc32(packet) {
        this._crc32 = crc.crc32(packet, this._crc32);
        return Promise.resolve();
    }

    _returnProgressIfPrnReached() {
        if (this._prnCount === this._prn) {
            this._prnCount = 0;
            const progress = {
                offset: this._offset,
                crc32: this._crc32
            };
            return Promise.resolve(progress);
        } else {
            return Promise.resolve();
        }
    }

    setOffset(offset) {
        this._offset = offset || DEFAULT_OFFSET;
    }

    getOffset() {
        return this._offset;
    }

    setCrc32(crc32) {
        this._crc32 = crc32 || DEFAULT_CRC32;
    }

    getCrc32() {
        return this._crc32;
    }

    setPrn(prn) {
        this._prn = prn || DEFAULT_PRN;
    }

}

module.exports = DfuPacketWriter;
