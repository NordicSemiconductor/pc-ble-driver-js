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
