'use strict';

const DfuObjectWriter = require('./dfuObjectWriter');
const ControlPointService = require('./controlPointService');
const { ObjectType, ErrorCode } = require('./dfuConstants');
const { splitArray } = require('../util/arrayUtil');
const EventEmitter = require('events');
const crc = require('crc');

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
        return this._open()
            .then(() => this._controlPointService.selectObject(ObjectType.COMMAND))
            .then(response => {
                const { maximumSize, offset, crc32 } = response;
                this._validateInitPacketSize(initPacket, maximumSize);
                if (this._canResumePartiallyWrittenObject(initPacket, offset, crc32)) {
                    return this._writeObject(initPacket.slice(offset), offset, crc32);
                }
                return this._createAndWriteObject(initPacket, ObjectType.COMMAND);
            });
    }

    /**
     * Sends firmware to the device.
     *
     * @param firmware byte array
     * @returns promise with empty response
     */
    sendFirmware(firmware) {
        return this._open()
            .then(() => this._controlPointService.selectObject(ObjectType.DATA))
            .then(response => {
                const transferData = this._getFirmwareTransferData(firmware, response);
                const { offset, crc32, objects, partialObject } = transferData;
                if (partialObject.length > 0) {
                    return this._writeObject(partialObject, offset, crc32).then(progress =>
                        this._createAndWriteObjects(objects, ObjectType.DATA, progress.offset, progress.crc32));
                }
                return this._createAndWriteObjects(objects, ObjectType.DATA, offset, crc32);
            });
    }

    /**
     * Specifies that the transfer in progress should be interrupted. This will
     * abort before the next packet is written, and throw an error object with
     * code ABORTED.
     */
    abort() {
        this._objectWriter.abort();
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
            .then(() => this._objectWriter.setPrn(prn));
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

    /**
     * Opens the transport. Instructs the device to start notifying about changes
     * to the DFU control point characteristic. Private method - not intended to
     * be used outside of the class.
     *
     * @returns promise with empty response
     * @private
     */
    _open() {
        if (this._isOpen) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            const ack = false;
            this._adapter.startCharacteristicsNotifications(this._controlPointCharacteristicId, ack, error => {
                error ? reject(error) : resolve();
            });
        });
    }

    _getFirmwareTransferData(firmware, selectResponse) {
        const { maximumSize, offset, crc32 } = selectResponse;
        let startOffset = offset;
        let startCrc32 = crc32;

        let partialObject = this._getRemainingPartialObject(firmware, maximumSize, offset);
        if (partialObject.length > 0 && !this._canResumePartiallyWrittenObject(firmware, offset, crc32)) {
            startOffset = offset - maximumSize + partialObject.length;
            startCrc32 = crc.crc32(firmware.slice(0, startOffset));
            partialObject = [];
        }

        const dataToSend = firmware.slice(startOffset + partialObject.length);
        return {
            offset: startOffset,
            crc32: startCrc32,
            objects: splitArray(dataToSend, selectResponse.maximumSize),
            partialObject: partialObject
        };
    }

    _createAndWriteObjects(objects, type, offset, crc32) {
        return objects.reduce((prevPromise, object) => {
            return prevPromise.then(progress =>
                this._createAndWriteObject(object, type, progress.offset, progress.crc32)
            );
        }, Promise.resolve({ offset, crc32 }));
    }

    _createAndWriteObject(data, type, offset, crc32) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const tryWrite = () => {
                this._controlPointService.createObject(type, data.length)
                    .then(() => this._writeObject(data, offset, crc32))
                    .then(progress => {
                        this._emitProgress(progress.offset, type);
                        resolve(progress);
                    })
                    .catch(error => {
                        attempts++;
                        if (this._shouldRetry(attempts, error)) {
                            tryWrite();
                        } else {
                            reject(error);
                        }
                    });
            };
            tryWrite();
        });
    }

    _shouldRetry(attempts, error) {
        if (attempts < MAX_RETRIES &&
            error.code !== ErrorCode.ABORTED &&
            error.code !== ErrorCode.NOTIFICATION_TIMEOUT) {
            return true;
        }
        return false;
    }

    _writeObject(data, offset, crc32) {
        return this._objectWriter.writeObject(data, offset, crc32)
            .then(progress => {
                return this._validateProgress(progress)
                    .then(() => this._controlPointService.execute())
                    .then(() => progress);
            });
    }

    _getRemainingPartialObject(data, maximumSize, offset) {
        const remainder = offset % maximumSize;
        if (offset === 0 || remainder === 0 || offset === data.length) {
            return [];
        }
        return data.slice(offset, offset + maximumSize - remainder);
    }

    _canResumePartiallyWrittenObject(data, offset, crc32) {
        if (offset === 0 || offset > data.length || crc32 !== crc.crc32(data.slice(0, offset))) {
            return false;
        }
        return true;
    }

    _validateInitPacketSize(initPacket, maxSize) {
        if (initPacket.length > maxSize) {
            throw new Error(`Init packet size (${initPacket.length}) is larger than max size (${maxSize})`);
        }
    }

    _validateProgress(progressInfo) {
        return this._controlPointService.calculateChecksum()
            .then(response => {
                // Same checks are being done in objectWriter. Could we reuse?
                if (progressInfo.offset !== response.offset) {
                    throw new Error(`Error when validating offset. Got ${response.offset}, ` +
                        `but expected ${progressInfo.offset}.`);
                }
                if (progressInfo.crc32 !== response.crc32) {
                    throw new Error(`Error when validating CRC. Got ${response.crc32}, ` +
                        `but expected ${progressInfo.crc32}`);
                }
            });
    }

    _emitProgress(offset, type) {
        let typeString;
        switch (type) {
            case ObjectType.COMMAND:
                typeString = 'init packet';
                break;
            case ObjectType.DATA:
                typeString = 'firmware';
                break;
            default:
                typeString = 'unknown object';
        }
        this.emit('progressUpdate', {
            stage: 'Transferring ' + typeString,
            offset: offset
        });
    }
}

module.exports = DfuTransport;
