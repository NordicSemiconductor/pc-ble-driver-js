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

module.exports = {
    ControlPointOpcode,
    ResultCode,
    ObjectType,
};
