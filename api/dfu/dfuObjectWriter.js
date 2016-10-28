'use strict';

const { splitArray } = require('../util/arrayUtil');
const { arrayToInt } = require('../util/intArrayConv');
const { ControlPointOpcode } = require('./dfuConstants');
const DfuNotificationStore = require('./dfuNotificationStore');
const DfuPacketWriter = require('./dfuPacketWriter');

const DEFAULT_MTU_SIZE = 20;
const DEFAULT_PRN = 0;

class DfuObjectWriter {

    constructor(adapter, controlPointCharacteristicId, packetCharacteristicId) {
        this._adapter = adapter;
        this._packetCharacteristicId = packetCharacteristicId;
        this._notificationStore = new DfuNotificationStore(adapter, controlPointCharacteristicId);
        this._prn = DEFAULT_PRN;
        this._mtuSize = DEFAULT_MTU_SIZE;
    }

    /**
     * Writes DFU data object according to the given MTU size.
     *
     * @param data byte array that should be written
     * @param offset the offset to continue from
     * @param crc32 the CRC32 value to continue from (optional)
     * @returns promise that returns the final locally calculated CRC32 value
     */
    writeObject(data, offset, crc32) {
        const packets = splitArray(data, this._mtuSize);
        const packetWriter = this._createPacketWriter(offset, crc32);
        this._notificationStore.startListening();
        return this._writePackets(packetWriter, packets)
            .then(() => {
                this._notificationStore.stopListening();
                return {crc32: packetWriter.getCrc32(), offset: packetWriter.getOffset()};
            }).catch(error => {
                this._notificationStore.stopListening();
                throw error;
            });
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

    _writePackets(packetWriter, packets) {
        return packets.reduce((prevPromise, currentPacket) => {
            return prevPromise
                .then(() => packetWriter.writePacket(currentPacket))
                .then(progressInfo => {
                    if (progressInfo) {
                        return this._validateProgress(progressInfo);
                    }
                });
        }, Promise.resolve());
    }

    _createPacketWriter(offset, crc32) {
        const writer = new DfuPacketWriter(this._adapter, this._packetCharacteristicId);
        writer.setOffset(offset);
        writer.setCrc32(crc32);
        writer.setPrn(this._prn);
        return writer;
    }

    _validateProgress(progressInfo) {
        return this._notificationStore.readLatest(ControlPointOpcode.CALCULATE_CRC)
            .then(notification => {
                this._validateOffset(notification, progressInfo.offset);
                this._validateCrc32(notification, progressInfo.crc32);
            });
    }

    _validateOffset(notification, offset) {
        const offsetArray = notification.slice(3, 7);
        const responseOffset = arrayToInt(offsetArray);
        if (responseOffset !== offset) {
            throw new Error(`Error when validating offset. Got ${responseOffset}, ` +
                `but expected ${offset}.`);
        }
    }

    _validateCrc32(notification, crc32) {
        const crc32Array = notification.slice(7, 11);
        const responseCrc = arrayToInt(crc32Array);
        if (responseCrc !== crc32) {
            throw new Error(`Error when validating CRC. Got ${responseCrc}, ` +
                `but expected ${crc32}.`);
        }
    }
}

module.exports = DfuObjectWriter;
