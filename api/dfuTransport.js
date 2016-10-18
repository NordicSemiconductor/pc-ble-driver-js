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

const DATA_PACKET_SIZE = 20;
const MAX_RETRIES = 3;


class DfuTransport {

    constructor(adapter = null) {
        this._adapter = adapter;
    }

    sendInitPacket(initPacket) {
        return this._selectObject(ObjectType.COMMAND)
            .then(response => this._validatePacketSize(initPacket.length, response.maxSize))
            .then(() => this._streamInitPacket(initPacket));
    }

    sendFirmware(firmware) {
        return this._selectObject(ObjectType.DATA)
            .then(response => this._streamFirmware(firmware, response.maxSize));
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
        return new Promise((resolve, reject) => {
            const firmwareChunks = this._createChunks(firmware, chunkSize);
            firmwareChunks.reduce((prev, curr) => {
                prev.then(() => this._streamFirmwareChunk(curr));
            }, new Promise.resolve());
        });
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
            const chunks = this._createChunks(data, DATA_PACKET_SIZE);
            // TODO: Listen for packet notifications using this._adapter.on('...')
            // TODO: Write data point with dataToSend using this._adapter
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

    _writeControlPoint(opCode) {
        return new Promise((resolve, reject) => {
            // TODO: Write control point using this._adapter and opCode
        });
    }

    _readControlPointResponse(opCode) {
        return new Promise((resolve, reject) => {
            // TODO: Read control point using this._adapter and opCode
        });
    }

    _execute() {
        return this._writeControlPoint(ControlPointOpcode.EXECUTE)
            .then(() => this._readControlPointResponse(ControlPointOpcode.EXECUTE));
    }

    _createObject(objectType, size) {
        return new Promise((resolve, reject) => {

            // TODO: Write control point using this._adapter, ControlPointOpcode.CREATE, size
            // TODO: Read control point using this._readControlPointResponse(ControlPointOpcode.CREATE)
        });
    }

    _selectObject(objectType) {
        return new Promise((resolve, reject) => {
            // TODO: Write control point using this._adapter, ControlPointOpcode.SELECT, objectType
            // TODO: Read control point response using this._readControlPointResponse(ControlPointOpcode.SELECT)
            // TODO: Return { maxSize, offset, crc } from response
        });
    }

    _validatePacketSize(packetSize, maxSize) {
        if (packetSize > maxSize) {
            throw new Error(`Init packet size (${packetSize}) is larger than max size (${maxSize})`);
        }
    }
}

module.exports = DfuTransport;
