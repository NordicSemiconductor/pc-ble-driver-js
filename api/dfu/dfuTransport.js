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
        return this._open()
            .then(() => this._controlPointService.selectObject(ObjectType.COMMAND))
            .then(response => {
                const { maximumSize, offset, crc32 } = response;
                return this._validateInitPacketSize(initPacket.length, maximumSize).then(() => {
                    return this._canResumeWriting(initPacket, offset, crc32) ?
                        this._writeObject(initPacket.slice(offset), offset, crc32) :
                        this._createAndWriteObject(initPacket, ObjectType.COMMAND);
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
        return this._open()
            .then(() => this._controlPointService.selectObject(ObjectType.DATA))
            .then(response => {
                return this._recoverIncompleteTransfer(firmware, response)
                    .then(progress => {
                        const { offset, crc32 } = progress;
                        const dataToSend = firmware.slice(offset);
                        const objects = splitArray(dataToSend, response.maximumSize);
                        return this._createAndWriteObjects(objects, ObjectType.DATA, offset, crc32);
                    });
            });
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

    /**
     * Recovers from a previous firmware transfer. If the previous transfer stopped
     * in the middle of an object, it will write the remaining parts of the object.
     * Returns new offset and crc32 after recovery.
     *
     * @param firmware byte array with complete firmware data
     * @param selectResponse response from SELECT command
     * @returns promise with offset and crc32 values after recovery
     * @private
     */
    _recoverIncompleteTransfer(firmware, selectResponse) {
        let { maximumSize, offset, crc32 } = selectResponse;
        return Promise.resolve().then(() => {
            const incompleteObjectData = this._getIncompleteObjectData(firmware, maximumSize, offset);
            if (incompleteObjectData.length === 0) {
                return { offset, crc32 };
            }
            if (this._canResumeWriting(firmware, offset, crc32)) {
                return this._writeObject(incompleteObjectData, offset, crc32);
            }
            // Unable to resume transfer of incomplete object. Backtrack to
            // where the object begins, so that it can be sent again.
            const objectStartOffset = offset - maximumSize + incompleteObjectData.length;
            return {
                offset: objectStartOffset,
                crc32: crc.crc32(firmware.slice(0, objectStartOffset))
            };
        });
    }

    _createAndWriteObjects(objects, type, offset, crc32) {
        return objects.reduce((prevPromise, object) => {
            return prevPromise.then(progress => {
                return this._createAndWriteObject(object, type, progress.offset, progress.crc32)
            });
        }, Promise.resolve({ offset, crc32 }));
    }

    _createAndWriteObject(data, type, offset, crc32) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const tryWrite = () => {
                this._controlPointService.createObject(type, data.length)
                    .then(() => this._writeObject(data, offset, crc32))
                    .then(progress => resolve(progress))
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

    _writeObject(data, offset, crc32) {
        return this._objectWriter.writeObject(data, offset, crc32)
            .then(progress => {
                return this._validateProgress(progress)
                    .then(() => this._controlPointService.execute())
                    .then(() => progress);
            });
    }

    _getIncompleteObjectData(data, maximumSize, offset) {
        const remainder = offset % maximumSize;
        if (offset === 0 || remainder === 0 || offset === data.length) {
            return [];
        }
        return data.slice(offset, offset + maximumSize - remainder);
    }

    _canResumeWriting(data, offset, crc32) {
        if (offset === 0 || offset > data.length || crc32 !== crc.crc32(data.slice(0, offset))) {
            return false;
        }
        return true;
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
}

module.exports = DfuTransport;
