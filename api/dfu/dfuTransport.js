'use strict';

const DfuObjectWriter = require('./dfuObjectWriter');
const ControlPointService = require('./controlPointService');
const { ObjectType } = require('./dfuConstants');
const { splitArray } = require('../util/arrayUtil');
const crc = require('crc');

const MAX_RETRIES = 3;


class DfuTransport {

    /**
     * Creates a DfuTransport object with an adapter, plus control point and packet
     * characteristic IDs for the device to perform DFU on.
     *
     * @param adapter a connected adapter instance
     * @param controlPointCharacteristicId the DFU control point characteristic ID for the device
     * @param packetCharacteristicId the DFU packet characteristic ID for the device
     */
    constructor(adapter, controlPointCharacteristicId, packetCharacteristicId) {
        this._adapter = adapter;
        this._controlPointCharacteristicId = controlPointCharacteristicId;
        this._packetCharacteristicId = packetCharacteristicId;
        this._controlPointService = new ControlPointService(adapter, controlPointCharacteristicId);
        this._objectWriter = new DfuObjectWriter(adapter, controlPointCharacteristicId, packetCharacteristicId);
        this._isOpen = false;
    }

    /**
     * Sends init packet to the device.
     *
     * @param initPacket byte array
     * @return promise with empty response
     */
    sendInitPacket(initPacket) {
        // TODO: Resume if response.offset from selectObject is != 0
        return this._open()
            .then(()       => this._controlPointService.selectObject(ObjectType.COMMAND))
            .then(response => this._validateInitPacketSize(initPacket.length, response.maxSize))
            .then(()       => this._writeInitPacket(initPacket));
    }

    /**
     * Sends firmware to the device.
     *
     * @param firmware byte array
     * @returns promise with empty response
     */
    sendFirmware(firmware) {
        // TODO: Resume if response.offset from selectObject is != 0
        return this._open()
            .then(()       => this._controlPointService.selectObject(ObjectType.DATA))
            .then(response => this._writeFirmware(firmware, response.maxSize));
    }

    /**
     * Sets packet receipt notification (PRN) value, which specifies how many
     * packages should be sent before receiving receipt.
     *
     * @param prn the PRN value (disabled if 0)
     * @returns promise with empty response
     */
    setPrn(prn) {
        return this._open()
            .then(() => this._controlPointService.setPRN(prn))
            .then(() => {
                this._objectWriter.setPrn(prn);
                return Promise.resolve();
            });
    }

    /**
     * Sets maximum transmission unit (MTU) size. This defines the size of
     * packets that are transferred to the device. Default is 20.
     *
     * @param mtuSize the MTU size
     */
    setMtuSize(mtuSize) {
        this._objectWriter.setMtuSize(mtuSize);
    }

    /**
     * Closes the transport. This instructs the device to stop notifying about
     * changes to the DFU control point characteristic. Should be invoked by the
     * caller when being done with the transport.
     *
     * @returns promise with empty response
     */
    close() {
        if (!this._isOpen) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            this._adapter.stopCharacteristicsNotifications(this._controlPointCharacteristicId, error => {
                error ? reject(error) : resolve();
            });
        });
    }

    _open() {
        if (this._isOpen) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            this._adapter.startCharacteristicsNotifications(this._controlPointCharacteristicId, false, error => {
                error ? reject(error) : resolve();
            });
        });
    }

    _writeInitPacket(initPacket) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const tryWrite = () => {
                this._controlPointService.createObject(ObjectType.COMMAND, initPacket.length)
                    .then(()  => this._objectWriter.writeObject(initPacket))
                    .then(crc => this._validateChecksum(crc))
                    .then(()  => this._controlPointService.execute())
                    .then(()  => resolve())
                    .catch(error => {
                        attempts++;
                        if (attempts < MAX_RETRIES) {
                            tryWrite();
                        } else {
                            reject(error);
                        }
                    });
            };
            tryWrite();
        });
    }

    _writeFirmware(firmware, objectSize) {
        const objects = splitArray(firmware, objectSize);
        return objects.reduce((prev, curr) => {
            return prev.then(() => this._writeFirmwareObject(curr));
        }, Promise.resolve());
    }

    _writeFirmwareObject(data) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const tryWrite = () => {
                this._controlPointService.createObject(ObjectType.DATA, data.length)
                    .then(()  => this._objectWriter.writeObject(data))
                    .then(crc => this._validateChecksum(crc))
                    .then(()  => this._controlPointService.execute())
                    .then(()  => resolve())
                    .catch(error => {
                        attempts++;
                        if (attempts < MAX_RETRIES) {
                            tryWrite();
                        } else {
                            reject(error);
                        }
                    });
            };
            tryWrite();
        });
    }


    _validateInitPacketSize(packetSize, maxSize) {
        return Promise.resolve().then(() => {
            if (packetSize > maxSize) {
                throw new Error(`Init packet size (${packetSize}) is larger than max size (${maxSize})`);
            }
        });
    }

    _validateChecksum(crc) {
        return this._controlPointService.calculateChecksum()
            .then(remoteCrc => {
                if (crc !== remoteCrc) {
                    throw new Error(`CRC validation failed. Got ${remoteCrc}, but expected ${crc}`);
                }
            });
    }

}

module.exports = DfuTransport;
