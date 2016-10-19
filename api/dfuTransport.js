'use strict';


// DFU control point procedure operation codes.
// (Not to be confused with "NRF DFU Object codes".)
const ControlPointOpcode = Object.freeze({
    CREATE: 0x01,
    SET_PRN: 0x02, // Set Packet Receipt Notification
    CALCULATE_CRC: 0x03, // Calculate CRC checksum
    EXECUTE: 0x04,
    SELECT: 0x06,
    RESPONSE: 0x60, // Response command, only returned by the DFU target
});

// Return codes (result codes) for Control Point operations.
const ResultCode = Object.freeze({
    INVALID_CODE: 0x00,
    SUCCESS: 0x01,
    OPCODE_NOT_SUPPORTED: 0x02,
    INVALID_PARAMETER: 0x03,
    INSUFFICIENT_RESOURCES: 0x04,
    INVALID_OBJECT: 0x05,
    UNSUPPORTED_TYPE: 0x07,
    OPERATION_NOT_PERMITTED: 0x08,
    OPERATION_FAILED: 0x0A,
});

// Object types for create/select operations.
const ObjectType = Object.freeze({
    COMMAND: 0x01,
    DATA: 0x02,
});

const DEFAULT_DATA_PACKET_SIZE = 20;
const DEFAULT_TIMEOUT = 20000;
const DEFAULT_POLL_INTERVAL = 50;
const MAX_RETRIES = 3;


class DfuTransport {

    constructor(adapter, controlPointCharacteristicId, packetCharacteristicId) {
        this._adapter = adapter;
        this._controlPointCharacteristicId = controlPointCharacteristicId;
        this._packetCharacteristicId = packetCharacteristicId;
        this._dataPacketSize = DEFAULT_DATA_PACKET_SIZE;
        this._timeout = DEFAULT_TIMEOUT;
        this._pollInterval = DEFAULT_POLL_INTERVAL;
        this._notifications = [];
        this._startNotificationListener();
    }

    sendInitPacket(initPacket) {
        // TODO: Try to resume if possible
        return this._selectObject(ObjectType.COMMAND)
            .then(response => this._validatePacketSize(initPacket.length, response.maxSize))
            .then(() => this._streamInitPacket(initPacket));
    }

    sendFirmware(firmware) {
        // TODO: Try to resume if possible
        return this._selectObject(ObjectType.DATA)
            .then(response => this._streamFirmware(firmware, response.maxSize));
    }

    setPollInterval(pollInterval) {
        this._pollInterval = pollInterval;
    }

    setTimeout(timeout) {
        this._timeout = timeout;
    }

    _startNotificationListener() {
        this._adapter.startCharacteristicsNotifications(this._controlPointCharacteristicId, false, error => {
            if (error) {
                throw new Error(error);
            } else {
                this._adapter.on('characteristicValueChanged', this._onCharacteristicNotification);
            }
        });
    }

    _stopNotificationListener() {
        this._adapter.stopCharacteristicsNotifications(this._controlPointCharacteristicId, error => {
            if (error) {
                throw new Error(error);
            } else {
                this._adapter.removeListener('characteristicValueChanged', this._onCharacteristicNotification);
            }
        });
    }

    _onCharacteristicNotification(characteristic) {
        if (characteristic._instanceId == this._controlPointCharacteristicId) {
            this._notifications.push(characteristic);
        }
    }

    _streamInitPacket(initPacket) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const tryStream = () => {
                this._createObject(ObjectType.COMMAND, initPacket.length)
                    .then(() => this._streamData(initPacket))
                    .then(() => this._execute())
                    .then(() => resolve())
                    .catch(error => {
                        attempts++;
                        if (attempts < MAX_RETRIES) {
                            tryStream();
                        } else {
                            reject(error);
                        }
                    });
            };
        });
    }

    _streamFirmware(firmware, chunkSize) {
        const firmwareChunks = this._createChunks(firmware, chunkSize);
        return firmwareChunks.reduce((prev, curr) => {
            return prev.then(() => this._streamFirmwareChunk(curr));
        }, new Promise.resolve());
    }

    _streamFirmwareChunk(chunk) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const tryStream = () => {
                this._createObject(ObjectType.DATA, chunk.length)
                    .then(() => this._streamData(chunk))
                    .then(() => this._execute())
                    .then(() => resolve())
                    .catch(error => {
                        attempts++;
                        if (attempts < MAX_RETRIES) {
                            tryStream();
                        } else {
                            reject(error);
                        }
                    });
            };
        });
    }

    _streamData(data) {
        return new Promise((resolve, reject) => {
            const chunks = this._createChunks(data, this._dataPacketSize);
            // TODO: Listen for packet notifications using this._adapter.on('...')
            // TODO: Write data point with chunks using this._adapter
            // TODO: Calculate CRC using crc.crc32(dataToSend)
            // TODO: Compare calculated CRC with the one received in PRN - throw if mismatch
            // TODO: Remove packet notification listener
        });
    }

    static _createChunks(data, chunkSize) {
        if (chunkSize < 1) {
            throw new Error(`Invalid chunk size: ${chunkSize}`);
        }
        const chunks = [];
        for (let i = 0; i < data.length; i += chunkSize) {
            if (i + chunkSize >= data.length) {
                chunks.push(data.slice(i));
            } else {
                chunks.push(data.slice(i, i + chunkSize));
            }
        }
        return chunks;
    }

    _sendCommand(command) {
        return this._writeControlPoint(command)
            .then(() => this._readControlPointResponse(command[0]));
    }

    _writeControlPoint(command) {
        return new Promise((resolve, reject) => {
            this._adapter.writeCharacteristicValue(this._controlPointCharacteristicId, command, true, error => {
                error ? reject(error) : resolve();
            });
        });
    }

    _readControlPointResponse(opCode) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const readResponse = () => {
                while (this._notifications.length > 0) {
                    const response = this._notifications.shift();
                    if (response[0] === ControlPointOpcode.RESPONSE &&
                        response[1] === opCode) {
                        resolve(response);
                        break;
                    }
                }
                attempts++;
                if (attempts * this._pollInterval > this._timeout) {
                    reject(`Timed out when waiting for ${opCode} response.`);
                } else {
                    setTimeout(readResponse, this._pollInterval);
                }
            };
            readResponse();
        });
    }

    _execute() {
        return this._sendCommand([ControlPointOpcode.EXECUTE]);
    }

    _createObject(objectType, size) {
        return this._sendCommand([ControlPointOpcode.CREATE, objectType]);
    }

    _selectObject(objectType) {
        return this._sendCommand([ControlPointOpcode.SELECT, objectType]);
    }

    _validatePacketSize(packetSize, maxSize) {
        return Promise.resolve().then(() => {
            if (packetSize > maxSize) {
                throw new Error(`Init packet size (${packetSize}) is larger than max size (${maxSize})`);
            }
        });
    }
}

module.exports = DfuTransport;
