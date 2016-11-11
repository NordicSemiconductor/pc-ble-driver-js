'use strict';

const DfuObjectWriter = require('./dfuObjectWriter');
const ControlPointService = require('./controlPointService');
const { ObjectType, ErrorCode, createError } = require('./dfuConstants');
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
        this._objectWriter.on('packetWritten', progress => this._emitTransferEvent(progress.offset, progress.type));
        this._isOpen = false;
    }

    /**
     * Sends init packet to the device.
     *
     * @param initPacket byte array
     * @return promise with empty response
     */
    sendInitPacket(initPacket) {
        const objectType = ObjectType.COMMAND;
        this._emitInitializeEvent(objectType);
        return this.getInitPacketState(initPacket)
            .then(state => {
                const { offset, crc32, data } = state;
                if (offset > 0) {
                    return this._writeObject(data, objectType, offset, crc32);
                }
                return this._createAndWriteObject(data, objectType);
            });
    }

    /**
     * Sends firmware to the device.
     *
     * @param firmware byte array
     * @returns promise with empty response
     */
    sendFirmware(firmware) {
        const objectType = ObjectType.DATA;
        this._emitInitializeEvent(objectType);
        return this.getFirmwareState(firmware)
            .then(state => {
                const { offset, crc32, objects, partialObject } = state;
                if (partialObject) {
                    return this._writeObject(partialObject, objectType, offset, crc32).then(progress =>
                        this._createAndWriteObjects(objects, objectType, progress.offset, progress.crc32));
                }
                return this._createAndWriteObjects(objects, objectType, offset, crc32);
            });
    }

    /**
     * Wait for the connection to the DFU target to break.
     *
     * @returns promise resolving when the target device is disconnected
     */
    waitForDisconnection() {
        return new Promise((resolve, reject) => {
            const TIMEOUT_MS = 10000;

            // Get the device.
            // It would probably be better to take deviceInstanceId in the
            // constructor, and save it as a property instead.
            // FIXME: If already disconnected, the below line will fail with message
            //        'No characteristic found with id' from the adapter.
            let thisDevice = this._adapter._getDeviceByCharacteristicId(this._packetCharacteristicId);

            // Handler resolving on disconnect from the DFU target.
            const disconnectionHandler = (device => {
                if (device._instanceId === thisDevice._instanceId)
                {
                    this._adapter.removeListener('deviceDisconnected', disconnectionHandler);
                    resolve();
                }
            });
            this._adapter.on('deviceDisconnected', disconnectionHandler);

            // Check if already disconnected.
            if (!thisDevice || (thisDevice.connected === false)) {
                this._adapter.removeListener('deviceDisconnected', disconnectionHandler);
                resolve();
            }

            // Fallback: time out.
            setTimeout(() => {
                this._adapter.removeListener('deviceDisconnected', disconnectionHandler);
                reject('Timed out waiting for target device disconnection.');
            }, TIMEOUT_MS);
        });
    }

    /**
     * Sends a SELECT command to the device to determine its current initPacket state.
     * Returns the offset and crc32 starting points, including the data (bytes) that
     * remains to be written.
     *
     * @param initPacket byte array
     * @returns promise that returns { offset, crc32, data }
     */
    getInitPacketState(initPacket) {
        return this._open()
            .then(() => this._controlPointService.selectObject(ObjectType.COMMAND))
            .then(response => this._getInitPacketState(initPacket, response));
    }

    /**
     * Sends a SELECT command to the device to determine its current firmware state.
     * Returns the offset and crc32 starting points, including the object data (bytes)
     * that remains to be written. If an object has been partially written to the
     * device, then partialObject will contain the remaining data to write for that
     * object.
     *
     * @returns promise that returns { offset, crc32, objects, partialObject }
     */
    getFirmwareState(firmware) {
        return this._open()
            .then(() => this._controlPointService.selectObject(ObjectType.DATA))
            .then(response => this._getFirmwareState(firmware, response));
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
                error ? reject(createError(ErrorCode.NOTIFICATION_STOP_ERROR, error.message)) : resolve();
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
                error ? reject(createError(ErrorCode.NOTIFICATION_START_ERROR, error.message)) : resolve();
            });
        });
    }

    /**
     *
     *
     * @private
     */
    _getInitPacketState(initPacket, selectResponse) {
        const { maximumSize, offset, crc32 } = selectResponse;
        this._validateInitPacketSize(initPacket, maximumSize);
        if (this._canResumePartiallyWrittenObject(initPacket, offset, crc32)) {
            return { offset, crc32, data: initPacket.slice(offset) };
        }
        return { offset: 0, data: initPacket };
    }

    /**
     *
     *
     * @private
     */
    _getFirmwareState(firmware, selectResponse) {
        const { maximumSize, offset, crc32 } = selectResponse;
        let startOffset = offset;
        let startCrc32 = crc32;

        let partialObject = this._getRemainingPartialObject(firmware, maximumSize, offset, crc32);
        if (partialObject && partialObject.length > 0 && !this._canResumePartiallyWrittenObject(firmware, offset, crc32)) {
            startOffset = offset - maximumSize + partialObject.length;
            startCrc32 = 0;
            partialObject = null;
        }

        const dataToSend = firmware.slice(startOffset + (partialObject ? partialObject.length : 0));
        return {
            offset: startOffset,
            crc32: startCrc32,
            objects: splitArray(dataToSend, selectResponse.maximumSize),
            partialObject: partialObject
        };
    }

    /**
     *
     *
     * @private
     */
    _createAndWriteObjects(objects, type, offset, crc32) {
        return objects.reduce((prevPromise, object) => {
            return prevPromise.then(progress =>
                this._createAndWriteObject(object, type, progress.offset, progress.crc32)
            );
        }, Promise.resolve({ offset, crc32 }));
    }

    /**
     *
     *
     * @private
     */
    _createAndWriteObject(data, type, offset, crc32) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const tryWrite = () => {
                this._controlPointService.createObject(type, data.length)
                    .then(() => this._writeObject(data, type, offset, crc32))
                    .then(progress => resolve(progress))
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

    /**
     *
     *
     * @private
     */
    _writeObject(data, type, offset, crc32) {
        return this._objectWriter.writeObject(data, type, offset, crc32)
            .then(progress => {
                return this._validateProgress(progress)
                    .then(() => this._controlPointService.execute())
                    .then(() => progress);
            });
    }

    /**
     *
     *
     * @private
     */
    _shouldRetry(attempts, error) {
        if (attempts < MAX_RETRIES &&
            error.code !== ErrorCode.ABORTED &&
            error.code !== ErrorCode.NOTIFICATION_TIMEOUT) {
            return true;
        }
        return false;
    }

    /**
     *
     *
     * @private
     */
    _getRemainingPartialObject(data, maximumSize, offset, crc32) {
        if (!crc32) {
            return null;
        }
        const remainder = offset % maximumSize;
        if (offset === 0 || remainder === 0 || offset === data.length) {
            return [];
        }
        return data.slice(offset, offset + maximumSize - remainder);
    }

    /**
     *
     *
     * @private
     */
    _canResumePartiallyWrittenObject(data, offset, crc32) {
        if (offset === 0 || offset > data.length || crc32 !== crc.crc32(data.slice(0, offset))) {
            return false;
        }
        return true;
    }

    /**
     *
     *
     * @private
     */
    _validateInitPacketSize(initPacket, maxSize) {
        if (initPacket.length > maxSize) {
            throw createError(ErrorCode.INIT_PACKET_TOO_LARGE, `Init packet size (${initPacket.length}) ` +
                `is larger than max size (${maxSize})`);
        }
    }

    /**
     *
     *
     * @private
     */
    _validateProgress(progressInfo) {
        return this._controlPointService.calculateChecksum()
            .then(response => {
                // Same checks are being done in objectWriter. Could we reuse?
                if (progressInfo.offset !== response.offset) {
                    throw createError(ErrorCode.INVALID_OFFSET, `Error when validating offset. ` +
                        `Got ${response.offset}, but expected ${progressInfo.offset}.`);
                }
                if (progressInfo.crc32 !== response.crc32) {
                    throw createError(ErrorCode.INVALID_CRC, `Error when validating CRC. ` +
                        `Got ${response.crc32}, but expected ${progressInfo.crc32}.`);
                }
            });
    }

    /**
     *
     *
     * @private
     */
    _emitTransferEvent(offset, type) {
        const event = {
            stage: `Transferring ${this._getObjectTypeString(type)}`
        };
        if (type === ObjectType.DATA) {
            event.offset = offset;
        }
        this.emit('progressUpdate', event);
    }

    /**
     *
     *
     * @private
     */
    _emitInitializeEvent(type) {
        this.emit('progressUpdate', {
            stage: `Initializing ${this._getObjectTypeString(type)}`
        });
    }

    /**
     *
     *
     * @private
     */
    _getObjectTypeString(type) {
        switch (type) {
            case ObjectType.COMMAND:
                return 'init packet';
            case ObjectType.DATA:
                return 'firmware';
        }
        return 'unknown object';
    }
}

module.exports = DfuTransport;
