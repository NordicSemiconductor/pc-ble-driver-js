'use strict';

// Control point operation codes for DFU BLE transport.
// (Not to be confused with "NRF DFU Object codes".)
const ControlPointOpcode = Object.freeze({
    CREATE: 0x01, 0x01: 'Create',
    SET_PRN: 0x02, 0x02: 'Set Packet Receipt Notification (PRN) value', // Set Packet Receipt Notification
    CALCULATE_CRC: 0x03, 0x03: 'Calculate checksum', // Calculate CRC checksum
    EXECUTE: 0x04, 0x04: 'Execute',
    SELECT: 0x06, 0x06: 'Select',
    RESPONSE: 0x60, 0x60: 'Response Code', // Response command, only returned by the DFU target
});

// Return codes (result codes) for Control Point operations.
const ResultCode = Object.freeze({
    INVALID_CODE: 0x00, 0x00: 'Invalid code.',
    SUCCESS: 0x01, 0x01: 'Success.',
    OPCODE_NOT_SUPPORTED: 0x02, 0x02: 'Opcode not supported.',
    INVALID_PARAMETER: 0x03, 0x03: 'Invalid parameter.',
    INSUFFICIENT_RESOURCES: 0x04, 0x04: 'Insufficient resources.',
    INVALID_OBJECT: 0x05, 0x05: 'Invalid object.',
    UNSUPPORTED_TYPE: 0x07, 0x07: 'Unsupported type.',
    OPERATION_NOT_PERMITTED: 0x08, 0x08: 'Operation not permitted.',
    OPERATION_FAILED: 0x0A, 0x0A: 'Operation failed.',
});

// Object types for create/select operations.
const ObjectType = Object.freeze({
    COMMAND: 0x01,
    DATA: 0x02,
});

// Error codes returned from DFU module.
const ErrorCode = Object.freeze({
    ABORTED: 0x01,
    NOTIFICATION_TIMEOUT: 0x02,
    UNEXPECTED_NOTIFICATION: 0x03,
    INVALID_CRC: 0x04,
    INVALID_OFFSET: 0x05,
    WRITE_ERROR: 0x06,
    COMMAND_ERROR: 0x07,
    NO_DFU_CHARACTERISTIC: 0x08,
    NO_DFU_SERVICE: 0x09,
    NOTIFICATION_START_ERROR: 0x10,
    NOTIFICATION_STOP_ERROR: 0x11,
    INIT_PACKET_TOO_LARGE: 0x12,
    DISCONNECTION_TIMEOUT: 0x13,
    CONNECTION_PARAM_ERROR: 0x14,
    ATT_MTU_ERROR: 0x15,
});

function createError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

module.exports = {
    ControlPointOpcode,
    ResultCode,
    ObjectType,
    ErrorCode,
    createError,
};
