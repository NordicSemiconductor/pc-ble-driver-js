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
        return this._sendCommand([ControlPointOpcode.CREATE, objectType, intToArray(size, 4)]);
    }

    selectObject(objectType) {
        return this._sendCommand([ControlPointOpcode.SELECT, objectType]);
    }

    calculateChecksum() {
        return this._sendCommand([ControlPointOpcode.CALCULATE_CRC]);
    }

    setPRN(value) {
        return this._sendCommand([ControlPointOpcode.SET_PRN], intToArray(value, 2));
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
}

module.exports = ControlPointService;