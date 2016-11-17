'use strict';

const DfuObjectWriter = require('./dfuObjectWriter');
const DeviceInfoService = require('./deviceInfoService');
const ControlPointService = require('./controlPointService');
const { InitPacketState, FirmwareState } = require('./dfuModels');
const { ObjectType, ErrorCode, createError } = require('./dfuConstants');
const EventEmitter = require('events');

const MAX_RETRIES = 3;

const SERVICE_UUID = 'FE59';
const DFU_CONTROL_POINT_UUID = '8EC90001F3154F609FB8838830DAEA50';
const DFU_PACKET_UUID = '8EC90002F3154F609FB8838830DAEA50';


class DfuTransport extends EventEmitter {

    /**
     * Creates a DfuTransport by using the supplied transport parameters.
     *
     * Available transport parameters:
     * - adapter:           An instance of adapter (required)
     * - targetAddress:     The target address to connect to (required)
     * - targetAddressType: The target address type (required)
     * - prnValue:          Packet receipt notification number (optional)
     * - mtuSize:           Maximum transmission unit number (optional)
     *
     * @param transportParameters configuration parameters
     */
    constructor(transportParameters) {
        super();

        if (!transportParameters.adapter) {
            throw new Error('Required transport parameter "adapter" was not provided');
        }
        if (!transportParameters.targetAddress) {
            throw new Error('Required transport parameter "targetAddress" was not provided');
        }

        this._adapter = transportParameters.adapter;
        this._transportParameters = transportParameters;

        this._handleConnParamUpdateRequest = this._handleConnParamUpdateRequest.bind(this);
        this._adapter.on('connParamUpdateRequest', this._handleConnParamUpdateRequest);
        this._isInitialized = false;
    }

    /**
     * Initializes the transport. Connects to the device and sets it up according
     * to the configured transport parameters.
     *
     * @returns Promise that resolves when initialized
     */
    init() {
        if (this._isInitialized) {
            return Promise.resolve();
        }
        const targetAddress = this._transportParameters.targetAddress;
        const targetAddressType = this._transportParameters.targetAddressType;
        const prnValue = this._transportParameters.prnValue;
        const mtuSize = this._transportParameters.mtuSize;

        return this._connectIfNeeded(targetAddress, targetAddressType)
            .then(deviceInstanceId => {
                this._deviceInstanceId = deviceInstanceId;
                return this._getCharacteristicIds(deviceInstanceId);
            })
            .then(characteristicIds => {
                this._controlPointService = new ControlPointService(this._adapter, characteristicIds.controlPointId);
                this._objectWriter = new DfuObjectWriter(this._adapter, characteristicIds.controlPointId, characteristicIds.packetId);
                this._objectWriter.on('packetWritten', progress => this._emitTransferEvent(progress.offset, progress.type));
                return this._startCharacteristicsNotifications(characteristicIds.controlPointId);
            })
            .then(() => prnValue ? this._setPrn(prnValue) : null)
            .then(() => mtuSize ? this._setMtuSize(mtuSize) : null)
            .then(() => this._isInitialized = true);
    }

    /**
     * Destroys the transport. Removes all listeners, so that the transport can
     * be garbage collected.
     */
    destroy() {
        if (this._objectWriter) {
            this._objectWriter.removeAllListeners();
        }
        this._adapter.removeListener('connParamUpdateRequest', this._handleConnParamUpdateRequest);
    }


    /**
     * Find the control point and dfu packet characteristic IDs.
     *
     * @returns { controlPointId, packetId }
     * @private
     */
    _getCharacteristicIds(deviceInstanceId) {
        const deviceInfoService = new DeviceInfoService(this._adapter, deviceInstanceId);
        return deviceInfoService.getCharacteristicId(SERVICE_UUID, DFU_CONTROL_POINT_UUID)
            .then(controlPointCharacteristicId => {
                return deviceInfoService.getCharacteristicId(SERVICE_UUID, DFU_PACKET_UUID)
                    .then(packetCharacteristicId => {
                        return {
                            controlPointId: controlPointCharacteristicId,
                            packetId: packetCharacteristicId
                        };
                    });
            });
    }


    /**
     * Connect to the target device if not already connected.
     *
     * @param targetAddress the address to connect to
     * @param targetAddressType the target address type
     * @returns Promise that resolves with device instance id when connected
     * @private
     */
    _connectIfNeeded(targetAddress, targetAddressType) {
        const device = this._adapter._getDeviceByAddress(targetAddress);
        if (device && device.connected) {
            return Promise.resolve(device._instanceId);
        } else {
            return this._connect(targetAddress, targetAddressType);
        }
    }


    /**
     * Connect to the target device.
     *
     * @param targetAddress the address to connect to
     * @param targetAddressType the target address type
     * @returns Promise that resolves with device instance id when connected
     * @private
     */
    _connect(targetAddress, targetAddressType) {
        const connectionParameters = {
            min_conn_interval: 7.5,
            max_conn_interval: 7.5,
            slave_latency: 0,
            conn_sup_timeout: 4000,
        };

        const scanParameters = {
            active: true,
            interval: 100,
            window: 50,
            timeout: 20,
        };

        const options = {
            scanParams: scanParameters,
            connParams: connectionParameters,
        };

        const addressParameters = {
            address: targetAddress,
            type: targetAddressType,
        };

        return new Promise((resolve, reject) => {
            this._adapter.connect(addressParameters, options, (err, device) => {
                err ? reject(err) : resolve(device._instanceId);
            });
        });
    }


    /**
     * Sends init packet to the device. If parts of the same init packet has
     * already been sent, then the transfer is resumed.
     *
     * @param data byte array to send to the device
     * @return Promise with empty response
     */
    sendInitPacket(data) {
        this._emitInitializeEvent(ObjectType.COMMAND);
        return this.getInitPacketState(data)
            .then(state => {
                if (state.isResumable) {
                    return this._writeObject(state.remainingData, ObjectType.COMMAND, state.offset, state.crc32);
                }
                return this._createAndWriteObject(state.remainingData, ObjectType.COMMAND);
            });
    }

    /**
     * Sends firmware to the device. If parts of the same firmware has already
     * been sent, then the transfer is resumed.
     *
     * @param data byte array to send to the device
     * @returns Promise with empty response
     */
    sendFirmware(data) {
        this._emitInitializeEvent(ObjectType.DATA);
        return this.getFirmwareState(data)
            .then(state => {
                const offset = state.offset;
                const crc32 = state.crc32;
                const objects = state.remainingObjects;
                if (state.isResumable) {
                    const partialObject = state.remainingPartialObject;
                    return this._writeObject(partialObject, ObjectType.DATA, offset, crc32).then(progress =>
                        this._createAndWriteObjects(objects, ObjectType.DATA, progress.offset, progress.crc32));
                }
                return this._createAndWriteObjects(objects, ObjectType.DATA, offset, crc32);
        });
    }

    /**
     * Wait for the connection to the DFU target to break.
     *
     * @returns Promise resolving when the target device is disconnected
     */
    waitForDisconnection() {
        return new Promise((resolve, reject) => {
            const TIMEOUT_MS = 10000;

            // Handler resolving on disconnect from the DFU target.
            const disconnectionHandler = (device => {
                if (device._instanceId === this._deviceInstanceId) {
                    this._adapter.removeListener('deviceDisconnected', disconnectionHandler);
                    resolve();
                }
            });
            this._adapter.on('deviceDisconnected', disconnectionHandler);

            // Check if already disconnected.
            if (!this._adapter.getDevice(this._deviceInstanceId) ||
                !this._adapter.getDevice(this._deviceInstanceId).connected) {
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
     * Returns the current init packet transfer state.
     *
     * @param data the complete init packet byte array
     * @returns Promise that returns an instance of InitPacketState
     */
    getInitPacketState(data) {
        return this.init()
            .then(() => this._controlPointService.selectObject(ObjectType.COMMAND))
            .then(response => new InitPacketState(data, response));
    }

    /**
     * Returns the current firmware transfer state.
     *
     * @param data the complete firmware byte array
     * @returns Promise that returns an instance of FirmwareState
     */
    getFirmwareState(data) {
        return this.init()
            .then(() => this._controlPointService.selectObject(ObjectType.DATA))
            .then(response => new FirmwareState(data, response));
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
     * @returns Promise with empty response
     * @private
     */
    _setPrn(prn) {
        return this.init()
            .then(() => this._controlPointService.setPRN(prn))
            .then(() => this._objectWriter.setPrn(prn));
    }

    /**
     * Sets maximum transmission unit (MTU) size. This defines the size of
     * packets that are transferred to the device. Default is 20.
     *
     * @param mtuSize the MTU size
     * @private
     */
    _setMtuSize(mtuSize) {
        this._objectWriter.setMtuSize(mtuSize);
    }


    /**
     * Instructs the device to start notifying about changes to the given characteristic id.
     *
     * @returns Promise with empty response
     * @private
     */
    _startCharacteristicsNotifications(characteristicId) {
        return new Promise((resolve, reject) => {
            const ack = false;
            this._adapter.startCharacteristicsNotifications(characteristicId, ack, error => {
                if (error) {
                    reject(createError(ErrorCode.NOTIFICATION_START_ERROR, error.message));
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Handle connection parameter update requests from the target device.
     *
     * @param device the device that requested connection parameter update
     * @param connectionParameters connection parameters from device
     * @private
     */
    _handleConnParamUpdateRequest(device, connectionParameters) {
        if (device._instanceId === this._deviceInstanceId) {
            this._adapter.updateConnectionParameters(this._deviceInstanceId, connectionParameters, err => {
                if (err) {
                    throw err;
                }
            });
        }
    }

    /**
     * Write an array of objects with the given type, starting at the given
     * offset and crc32.
     *
     * @param objects array of objects (array of byte arrays)
     * @param type the ObjectType to write
     * @param offset the offset to start from
     * @param crc32 the crc32 to start from
     * @return Promise that resolves when the objects have been created and written
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
     * Create and write one object with the given type, starting at the
     * given offset and crc32.
     *
     * @param data the object data to write (byte array)
     * @param type the ObjectType to write
     * @param offset the offset to start from
     * @param crc32 the crc32 to start from
     * @return Promise that resolves when the object has been created and written
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
     * Write one object with the given type, starting at the given offset
     * and crc32.
     *
     * @param data the object data to write (byte array)
     * @param type the ObjectType to write
     * @param offset the offset to start from
     * @param crc32 the crc32 to start from
     * @return Promise that resolves when the object has been written
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

    _shouldRetry(attempts, error) {
        if (attempts < MAX_RETRIES &&
            error.code !== ErrorCode.ABORTED &&
            error.code !== ErrorCode.NOTIFICATION_TIMEOUT) {
            return true;
        }
        return false;
    }

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

    _emitTransferEvent(offset, type) {
        const event = {
            stage: `Transferring ${this._getObjectTypeString(type)}`
        };
        if (type === ObjectType.DATA) {
            event.offset = offset;
        }
        this.emit('progressUpdate', event);
    }

    _emitInitializeEvent(type) {
        this.emit('progressUpdate', {
            stage: `Initializing ${this._getObjectTypeString(type)}`
        });
    }

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
