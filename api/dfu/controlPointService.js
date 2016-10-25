'use strict';

const DfuNotificationStore = require('./dfuNotificationStore');
const { ControlPointOpcode, ResultCode } = require('./dfuConstants');
const {intToArray, arrayToInt} = require('../util/intArrayConv');

class ControlPointService {

    constructor(adapter, controlPointCharacteristicId) {
        this._adapter = adapter;
        this._controlPointCharacteristicId = controlPointCharacteristicId;
        this._notificationStore = new DfuNotificationStore(adapter, controlPointCharacteristicId);
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
        this._notificationStore.startListening();
        return this._writeCharacteristicValue(command)
            .then(() => this._readResponse(command[0]))
            .then(response => {
                this._notificationStore.stopListening();
                return response;
            })
            .catch(error => {
                this._notificationStore.stopListening();
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

    _readResponse(opCode) {
        return this._notificationStore.readLatest(opCode)
            .then(response => this._parseResponse(response));
    }

    _parseResponse(response) {
        // TODO: Convert response to JS object
        return Promise.resolve(response);
    }

    parseCommand(command) {
        // TODO? Check that command is a byte array.

        let commandObject = {};
        commandObject.command = command[0];

        switch(command[0]) {
            case ControlPointOpcode.CREATE:
                commandObject.type = command[1];
                commandObject.size = arrayToInt(command.slice(2, 4));
                break;
            case ControlPointOpcode.SET_PRN:
                commandObject.value = arrayToInt(command.slice(1, 2));
                break;
            case ControlPointOpcode.CALCULATE_CRC:
                break;
            case ControlPointOpcode.EXECUTE:
                break;
            case ControlPointOpcode.SELECT:
                commandObject.type = command[1];
                break;
            case ControlPointOpcode.RESPONSE:
                return parseResponse(command);
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

        responseObject.command = response[0]
        responseObject.requestOpcode = command[1];
        responseObject.resultCode = command[2];

        switch(response[1]) {
            case ConrolPointOpcode.CREATE:
                break;
            case ControlPointOpcode.SET_PRN:
                break;
            case ControlPointOpcode.CALCULATE_CRC:
                break;
            case ControlPointOpcode.EXECUTE:
                break;
            case ControlPointOpcode.SELECT:
                break;
        }
        return responseObject;
    }
}

module.exports = ControlPointService;
