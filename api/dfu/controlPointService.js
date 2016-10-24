'use strict';

const { ControlPointOpcode, ResultCode } = require('./dfuConstants');
const {intToArray, arrayToInt} = require('../util/intArrayConv');

const DEFAULT_TIMEOUT = 20000;

class ControlPointService {

    constructor(adapter, controlPointCharacteristicId) {
        this._adapter = adapter;
        this._controlPointCharacteristicId = controlPointCharacteristicId;
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
        let onValueChanged;
        const removeListener = () => {
            this._adapter.removeListener('characteristicValueChanged', onValueChanged);
        };
        const timeout = new Promise((resolve, reject) => {
            setTimeout(() => {
                removeListener();
                reject(`Timed out when waiting for ${command[0]} response.`);
            }, DEFAULT_TIMEOUT);
        });
        const writeAndReceive = new Promise((resolve, reject) => {
            onValueChanged = characteristic => {
                if (characteristic._instanceId !== this._controlPointCharacteristicId) {
                    return;
                }
                let response = characteristic.value;
                if (response[0] === ControlPointOpcode.RESPONSE) {
                    removeListener();
                    if (response[1] === command[0]) {
                        if (response[2] === ResultCode.SUCCESS) {
                            resolve(response.slice(3));
                        } else {
                            reject(`Control Point operation ${command} returned error ${response[2]}: ${ResultCode[response[2]]}`);
                        }
                    } else {
                        reject(`Got unexpected response. Expected ${command[0]}, but got ${response[1]}.`);
                    }
                }
            };
            this._adapter.on('characteristicValueChanged', onValueChanged);
            this._adapter.writeCharacteristicValue(this._controlPointCharacteristicId, command, true, error => {
                if (error) {
                    removeListener();
                    reject(error);
                }
            });
        });
        return Promise.race([writeAndReceive, timeout]);
    }
}

module.exports = ControlPointService;