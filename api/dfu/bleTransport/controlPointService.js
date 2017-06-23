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

const NotificationQueue = require('./notificationQueue');
const ControlPointOpcode = require('../dfuConstants').ControlPointOpcode;
const ResultCode = require('../dfuConstants').ResultCode;
const ErrorCode = require('../dfuConstants').ErrorCode;
const createError = require('../dfuConstants').createError;
const getOpCodeName = require('../dfuConstants').getOpCodeName;
const intToArray = require('../../util/intArrayConv').intToArray;
const arrayToInt = require('../../util/intArrayConv').arrayToInt;

class ControlPointService {

    constructor(adapter, controlPointCharacteristicId) {
        this._adapter = adapter;
        this._controlPointCharacteristicId = controlPointCharacteristicId;
        this._notificationQueue = new NotificationQueue(adapter, controlPointCharacteristicId);
    }

    execute() {
        return this._sendCommand([ControlPointOpcode.EXECUTE]);
    }

    createObject(objectType, size) {
        return this._sendCommand([].concat([ControlPointOpcode.CREATE, objectType], intToArray(size, 4)));
    }

    selectObject(objectType) {
        return this._sendCommand([ControlPointOpcode.SELECT, objectType]);
    }

    calculateChecksum() {
        return this._sendCommand([ControlPointOpcode.CALCULATE_CRC]);
    }

    setPRN(value) {
        return this._sendCommand([].concat([ControlPointOpcode.SET_PRN], intToArray(value, 2)));
    }

    _sendCommand(command) {
        this._notificationQueue.startListening();
        return this._writeCharacteristicValue(command)
            .then(() => this._notificationQueue.readNext(command[0]))
            .then(response => ControlPointService.parseResponse(response))
            .then(response => {
                this._notificationQueue.stopListening();
                return response;
            })
            .catch(error => {
                this._notificationQueue.stopListening();
                error.message = `When writing '${getOpCodeName(command[0])}' ` +
                  `command to Control Point Characteristic of DFU Target: ` + error.message;
                throw error;
            });
    }

    _writeCharacteristicValue(command) {
        return new Promise((resolve, reject) => {
            const characteristicId = this._controlPointCharacteristicId;
            this._adapter.writeCharacteristicValue(characteristicId, command, true, error => {
                if (error) {
                    reject(createError(ErrorCode.WRITE_ERROR, `Could not write ` +
                        `${getOpCodeName(command[0])} command: ${error.message}`));
                } else {
                    resolve();
                }
            });
        })
    }

    static parseCommand(command) {
        const returnObject = {
            command: command[0]
        };

        switch(command[0]) {
            case ControlPointOpcode.CREATE:
                returnObject.type = command[1];
                returnObject.size = arrayToInt(command.slice(2, 6));
                break;
            case ControlPointOpcode.SET_PRN:
                returnObject.value = arrayToInt(command.slice(1, 3));
                break;
            case ControlPointOpcode.CALCULATE_CRC:
                break;
            case ControlPointOpcode.EXECUTE:
                break;
            case ControlPointOpcode.SELECT:
                returnObject.type = command[1];
                break;
            case ControlPointOpcode.RESPONSE:
                return ControlPointService.parseResponse(command);
                break;
        }

        return returnObject;
    }

    static parseResponse(response) {
        if (response[0] !== ControlPointOpcode.RESPONSE) {
            throw createError(ErrorCode.UNEXPECTED_NOTIFICATION, `When parsing response, expected ` +
                `operation code ${ControlPointOpcode.RESPONSE} ` +
                `(${getOpCodeName(ControlPointOpcode.RESPONSE)}) ` +
                `but got operation code ${response[0]} (${getOpCodeName(response[0])})`);
        }

        const returnObject = {
            command: response[0],
            requestOpcode: response[1],
            resultCode: response[2],
        };

        if (response[2] === ResultCode.SUCCESS) {
            switch(response[1]) {
                case ControlPointOpcode.CREATE:
                    break;
                case ControlPointOpcode.SET_PRN:
                    break;
                case ControlPointOpcode.CALCULATE_CRC:
                    returnObject.offset = arrayToInt(response.slice(3, 7));
                    returnObject.crc32 = arrayToInt(response.slice(7, 11));
                    break;
                case ControlPointOpcode.EXECUTE:
                    break;
                case ControlPointOpcode.SELECT:
                    returnObject.maximumSize = arrayToInt(response.slice(3, 7));
                    returnObject.offset = arrayToInt(response.slice(7, 11));
                    returnObject.crc32 = arrayToInt(response.slice(11, 15));
                    break;
            }
        }
        return returnObject;
    }
}

module.exports = ControlPointService;
