'use strict';

const crc = require('crc');

/**
 * Writes packets to the given packet characteristic. If packet receipt
 * notifications (PRN) is enabled, it will return CRC to the caller each
 * time the configured PRN is reached.
 */
class DfuPacketWriter {

    constructor(adapter, packetCharacteristicId, prn) {
        this._adapter = adapter;
        this._packetCharacteristicId = packetCharacteristicId;
        this._prn = prn;
        this._prnCount = 0;
        this._accumulatedCrc = undefined;
    }

    /**
     * Writes the given packet. If PRN is reached, then the accumulated
     * CRC is returned so that the caller can verify it. Otherwise, an empty
     * promise is returned.
     *
     * @param packet byte array that should be written
     * @returns promise with CRC if PRN has been reached, otherwise empty promise
     */
    writePacket(packet) {
        return this._calculateCrc(packet)
            .then(() => this._write(packet))
            .then(() => this._incrementPrn())
            .then(() => this._returnCrcIfPrnReached());
    }

    /**
     * Returns the accumulated CRC value.
     *
     * @returns the CRC value
     */
    getAccumulatedCrc() {
        return this._accumulatedCrc;
    }

    _calculateCrc(packet) {
        this._accumulatedCrc = crc.crc32(packet, this._accumulatedCrc);
        return Promise.resolve();
    }

    _write(packet, attempts = 0) {
        return new Promise((resolve, reject) => {
            const characteristicId = this._packetCharacteristicId;
            const value = packet;
            const ack = false;
            const callback = error => {
                if (error) {
                    if (error.errno === 12292 && ++attempts < 10) {
                        // NO_TX_PACKETS error. Try again after a delay.
                        setTimeout(() => this._write(packet, attempts).then(() => resolve()).catch(err => reject(err)), 5);
                    } else {
                        reject(error);
                    }
                } else {
                    resolve();
                }
            };
            this._adapter.writeCharacteristicValue(characteristicId, value, ack, callback);
        });
    }

    _incrementPrn() {
        this._prnCount++;
        return Promise.resolve();
    }

    _returnCrcIfPrnReached() {
        if (this._prnCount === this._prn) {
            this._prnCount = 0;
            return Promise.resolve(this._accumulatedCrc);
        } else {
            return Promise.resolve();
        }
    }
}

module.exports = DfuPacketWriter;
