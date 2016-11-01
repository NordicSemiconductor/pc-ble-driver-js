'use strict';

const DfuObjectWriter = require('./dfuObjectWriter');
const ControlPointService = require('./controlPointService');
const { ObjectType } = require('./dfuConstants');
const { splitArray } = require('../util/arrayUtil');
const EventEmitter = require('events');

const MAX_RETRIES = 3;


class DfuTransport extends EventEmitter {

    /**
     * Creates a DfuTransport object with an adapter, plus control point and packet
     * characteristic IDs for the device to perform DFU on.
     *
     * @param adapter a connected adapter instance
     * @param controlPointCharacteristicId the DFU control point characteristic ID for the device
     * @param packetCharacteristicId the DFU packet characteristic ID for the device
     */
    constructor(adapter, controlPointCharacteristicId, packetCharacteristicId) {
        super();

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
            .then(response => this._validateInitPacketSize(initPacket.length, response.maximumSize))
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
            .then(response => this._writeFirmware(firmware, response.maximumSize));
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
                    .then(()       => this._objectWriter.writeObject(initPacket, 0))
                    .then(progress => {
                        return        this._validateProgress(progress)
                        .then(()   => this._controlPointService.execute())
                        .then(()   => this.emit('progressUpdate', {stage: 'transferring init packet', offset: progress.offset}));
                    })
                    .then(()       => resolve())
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
        // TODO: Set initial progress to offset and crc32 from select response
        const initialProgress = {
            offset: 0
        };
        const objects = splitArray(firmware, objectSize);
        return objects.reduce((prevPromise, object) => {
            return prevPromise.then(progress => this._writeFirmwareObject(object, progress.offset, progress.crc32));
        }, Promise.resolve(initialProgress));
    }

    _writeFirmwareObject(data, offset, crc32) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const tryWrite = () => {
                this._controlPointService.createObject(ObjectType.DATA, data.length)
                    .then(()  => this._objectWriter.writeObject(data, offset, crc32))
                    .then(progress => {
                        return this._validateProgress(progress)
                            .then(() => this._controlPointService.execute())
                            .then(() => this.emit('progressUpdate', {stage: 'transferring firmware', offset: progress.offset}))
                            .then(() => resolve(progress))
                    })
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

    _validateProgress(progressInfo) {
        return this._controlPointService.calculateChecksum()
            .then(response => {
                if (progressInfo.crc32 !== response.crc32) {
                    throw new Error(`CRC validation failed. Got ${response.crc32}, but expected ${progressInfo.crc32}`);
                }
                if (progressInfo.offset !== response.offset) {
                    throw new Error(`Offset validation failed. Got ${response.offset}, but expected ${progressInfo.offset}`);
                }
            });
    }

}

module.exports = DfuTransport;
