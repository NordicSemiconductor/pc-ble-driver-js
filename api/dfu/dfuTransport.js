'use strict';

const DfuObjectWriter = require('./dfuObjectWriter');
const ControlPointService = require('./controlPointService');
const { ObjectType } = require('./dfuConstants');
const { splitArray } = require('../util/arrayUtil');
const crc = require('crc');

const DEFAULT_MTU_SIZE = 20;
const DEFAULT_PRN = 0;
const MAX_RETRIES = 3;


class DfuTransport {

    /**
     * Creates a DfuTransport object with an adapter, plus control point and packet
     * characteristic IDs for the device to perform DFU on.
     *
     * @param adapter a connected adapter instance
     * @param controlPointCharacteristicId the DFU control point characteristic ID for the device
     * @param packetCharacteristicId the DFU packet characteristic ID for the device
     * @param prn number of packets to send before receiving and comparing CRC (optional)
     */
    constructor(adapter, controlPointCharacteristicId, packetCharacteristicId, prn = DEFAULT_PRN) {
        this._adapter = adapter;
        this._controlPointCharacteristicId = controlPointCharacteristicId;
        this._controlPointService = new ControlPointService(adapter, controlPointCharacteristicId);
        this._objectWriter = new DfuObjectWriter(adapter, controlPointCharacteristicId, packetCharacteristicId, prn);
        this._mtuSize = DEFAULT_MTU_SIZE;
    }

    /**
     * Sends init packet to the device.
     *
     * @param initPacket byte array
     * @return promise with empty response
     */
    sendInitPacket(initPacket) {
        // TODO: Resume if response.offset from selectObject is != 0
        return this._startNotificationListener()
            .then(()       => this._controlPointService.selectObject(ObjectType.COMMAND))
            .then(response => this._validateInitPacketSize(initPacket.length, response.maxSize))
            .then(()       => this._writeInitPacket(initPacket))
            .then(()       => this._stopNotificationListener())
            .catch(error   => {
                this._stopNotificationListener()
                    .catch(notificationCloseError => {
                        console.log(notificationCloseError);
                        throw error;
                    })
                    .then(() => {
                        throw error;
                    });
            });
    }

    /**
     * Sends firmware to the device.
     *
     * @param firmware byte array
     * @returns promise with empty response
     */
    sendFirmware(firmware) {
        // TODO: Resume if response.offset from selectObject is != 0
        return this._startNotificationListener()
            .then(()       => this._controlPointService.selectObject(ObjectType.DATA))
            .then(response => this._writeFirmware(firmware, response.maxSize))
            .then(()       => this._stopNotificationListener())
            .catch(error   => {
                this._stopNotificationListener()
                    .catch(notificationCloseError => {
                        console.log(notificationCloseError);
                        throw error;
                    })
                    .then(() => {
                        throw error;
                    });
            });
    }

    _writeInitPacket(initPacket) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const tryWrite = () => {
                this._controlPointService.createObject(ObjectType.COMMAND, initPacket.length)
                    .then(()  => this._objectWriter.writeObject(initPacket, this._mtuSize))
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
        }, new Promise.resolve());
    }

    _writeFirmwareObject(data) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const tryWrite = () => {
                this._controlPointService.createObject(ObjectType.DATA, data.length)
                    .then(()  => this._controlPointService.setPRN(this._prn))
                    .then(()  => this._objectWriter.writeObject(data, this._mtuSize))
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

    _startNotificationListener() {
        return new Promise((resolve, reject) => {
            this._adapter.startCharacteristicsNotifications(this._controlPointCharacteristicId, false, error => {
                error ? reject(error) : resolve();
            });
        });
    }

    _stopNotificationListener() {
        return new Promise((resolve, reject) => {
            this._adapter.stopCharacteristicsNotifications(this._controlPointCharacteristicId, error => {
                error ? reject(error) : resolve();
            });
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
