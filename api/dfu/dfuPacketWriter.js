'use strict';

const crc = require('crc');
const { ErrorCode, createError } = require('./dfuConstants');

const DEFAULT_OFFSET = 0;
const DEFAULT_CRC32 = undefined;
const DEFAULT_PRN = 0;

/**
 * Writes packets to the given packet characteristic.
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
     * Writes the given packet, and returns a promise with progress information.
     *
     * @param packet byte array that should be written
     * @returns promise that returns { offset, crc32, isPrnReached }
     */
    writePacket(packet) {
        return this._write(packet)
            .then(() => this._accumulateCrc32(packet))
            .then(() => this._incrementOffset(packet))
            .then(() => this._incrementPrn())
            .then(() => this._returnProgress());
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

    _returnProgress() {
        let isPrnReached = false;
        if (this._prnCount === this._prn) {
            this._prnCount = 0;
            isPrnReached = true;
        }
        return Promise.resolve({
            offset: this._offset,
            crc32: this._crc32,
            isPrnReached: isPrnReached,
        });
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
