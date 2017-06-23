/* Copyright (c) 2010 - 2017, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Use in source and binary forms, redistribution in binary form only, with
 * or without modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions in binary form, except as embedded into a Nordic
 *    Semiconductor ASA integrated circuit in a product or a software update for
 *    such product, must reproduce the above copyright notice, this list of
 *    conditions and the following disclaimer in the documentation and/or other
 *    materials provided with the distribution.
 *
 * 2. Neither the name of Nordic Semiconductor ASA nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 *
 * 3. This software, with or without modification, must only be used with a Nordic
 *    Semiconductor ASA integrated circuit.
 *
 * 4. Any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

const _ = require('underscore');

// Control point operation codes for DFU BLE transport.
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
    EXTENDED_ERROR: 0x0B,
});

// Extended error codes
const ExtendedErrorCode = Object.freeze({
    NO_ERROR: 0x00,
    INVALID_ERROR_CODE: 0x01,
    WRONG_COMMAND_FORMAT: 0x02,
    UNKNOWN_COMMAND: 0x03,
    INIT_COMMAND_INVALID: 0x04,
    FW_VERSION_FAILURE: 0x05,
    HW_VERSION_FAILURE: 0x06,
    SD_VERSION_FAILURE: 0x07,
    SIGNATURE_MISSING: 0x08,
    WRONG_HASH_TYPE: 0x09,
    HASH_FAILED: 0x0A,
    WRONG_SIGNATURE_TYPE: 0x0B,
    VERIFICATION_FAILED: 0x0C,
    INSUFFICIENT_SPACE: 0x0D,
})

const ButtonlessControlPointOpCode = Object.freeze({
    RESERVED: 0x00,
    ENTER_BOOTLOADER: 0x01,
    SET_ADVERTISEMENT_NAME: 0x02, // Only used by certain platforms
    RESPONSE: 0x20,
});

const ButtonlessResponseCode = Object.freeze({
    RESERVED: 0x00,
    SUCCESS: 0x01,
    OP_CODE_NOT_SUPPORTED: 0x02,
    OPERATION_FAILED: 0x04,
    ADVERTISEMENT_NAME_INVALID: 0x05,
    BUSY: 0x06,
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
    INDICATION_START_ERROR: 0x11,
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

function getResultCodeName(resultCode) {
    return _getCodeName(ResultCode, resultCode);
}

function getOpCodeName(opCode) {
    return _getCodeName(ControlPointOpcode, opCode);
}

function getExtendedErrorCodeName(extendedErrorCode) {
    return _getCodeName(ExtendedErrorCode, extendedErrorCode);
}

function getButtonlessResponseCodeName(responseCode) {
    return _getCodeName(ButtonlessResponseCode, responseCode);
}

function getButtonlessOpCodeName(OpCode) {
    return _getCodeName(ButtonlessControlPointOpCode, OpCode);
}

function _getCodeName(codeObject, value) {
    return _.invert(codeObject)[value] || 'UNKNOWN';
}

module.exports = {
    ControlPointOpcode,
    ResultCode,
    ExtendedErrorCode,
    ButtonlessControlPointOpCode,
    ButtonlessResponseCode,
    ObjectType,
    ErrorCode,
    createError,
    getResultCodeName,
    getOpCodeName,
    getExtendedErrorCodeName,
    getButtonlessOpCodeName,
    getButtonlessResponseCodeName,
};
