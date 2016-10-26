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
     * @returns promise that returns the final locally calculated CRC
     */
    writeObject(data) {
        const packets = splitArray(data, this._mtuSize);
        this._notificationStore.startListening();
        return this._writePackets(packets)
            .then(crc => {
                this._notificationStore.stopListening();
                return crc;
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

    _writePackets(packets) {
        const packetWriter = this._createPacketWriter();
        const writeChain = packets.reduce((prev, curr) => {
            return prev.then(() => packetWriter.writePacket(curr))
                .then(crc => crc ? this._validateCrc(crc) : Promise.resolve());
        }, Promise.resolve());
        return writeChain.then(() => {
            return packetWriter.getAccumulatedCrc();
        });
    }

    _createPacketWriter() {
        return new DfuPacketWriter(this._adapter, this._packetCharacteristicId, this._prn);
    }

    _validateCrc(crc) {
        return this._notificationStore.readLatest(ControlPointOpcode.CALCULATE_CRC)
            .then(notification => {
                const responseCrc = this._parseCrc(notification);
                if (responseCrc !== crc) {
                    throw new Error(`Error when validating CRC. Got ${responseCrc}, but expected ${crc}.`);
                }
            });
    }

    _parseCrc(notification) {
        const crcPart = notification.slice(7, 11);
        return arrayToInt(crcPart);
    }

}

module.exports = DfuObjectWriter;