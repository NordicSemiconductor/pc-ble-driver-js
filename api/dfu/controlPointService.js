'use strict';

const DfuNotificationQueue = require('./dfuNotificationQueue');
const { ControlPointOpcode, ResultCode } = require('./dfuConstants');
const {intToArray, arrayToInt} = require('../util/intArrayConv');

class ControlPointService {

    constructor(adapter, controlPointCharacteristicId) {
        this._adapter = adapter;
        this._controlPointCharacteristicId = controlPointCharacteristicId;
        this._notificationQueue = new DfuNotificationQueue(adapter, controlPointCharacteristicId);
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
            .then(response => this.parseResponse(response))
            .then(response => {
                this._notificationQueue.stopListening();
                return response;
            })
            .catch(error => {
                this._notificationQueue.stopListening();
                throw error;
            });
    }

    _writeCharacteristicValue(command) {
        return new Promise((resolve, reject) => {
            this._adapter.writeCharacteristicValue(this._controlPointCharacteristicId, command, true, error => {
                error ? reject(error) : resolve();
            });
        })
    }

    parseCommand(command) {
        // TODO? Check that command is a byte array.

        let commandObject = {};
        commandObject.command = command[0];

        switch(command[0]) {
            case ControlPointOpcode.CREATE:
                commandObject.type = command[1];
                commandObject.size = arrayToInt(command.slice(2, 6));
                break;
            case ControlPointOpcode.SET_PRN:
                commandObject.value = arrayToInt(command.slice(1, 3));
                break;
            case ControlPointOpcode.CALCULATE_CRC:
                break;
            case ControlPointOpcode.EXECUTE:
                break;
            case ControlPointOpcode.SELECT:
                commandObject.type = command[1];
                break;
            case ControlPointOpcode.RESPONSE:
                return this.parseResponse(command);
                break;
        }

        return commandObject;
    }

    parseResponse(response) {
        // TODO? Check that command is a byte array.
        if (response[0] !== ControlPointOpcode.RESPONSE) {
            throw('This is not a response.');
        }

        let responseObject = {};

        responseObject.command = response[0];
        responseObject.requestOpcode = response[1];
        responseObject.resultCode = response[2];

        if (response[2] === ResultCode.SUCCESS) {
            switch(response[1]) {
                case ControlPointOpcode.CREATE:
                    break;
                case ControlPointOpcode.SET_PRN:
                    break;
                case ControlPointOpcode.CALCULATE_CRC:
                    responseObject.offset = arrayToInt(response.slice(3, 7));
                    responseObject.crc32 = arrayToInt(response.slice(7, 11));
                    break;
                case ControlPointOpcode.EXECUTE:
                    break;
                case ControlPointOpcode.SELECT:
                    responseObject.maximumSize = arrayToInt(response.slice(3, 7));
                    responseObject.offset = arrayToInt(response.slice(7, 11));
                    responseObject.crc32 = arrayToInt(response.slice(11, 15));
                    break;
            }
        }
        return responseObject;
    }
}

module.exports = ControlPointService;
