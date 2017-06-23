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
const ButtonlessControlPointOpCode = require('../dfuConstants').ButtonlessControlPointOpCode;
const ButtonlessResponseCode = require('../dfuConstants').ButtonlessResponseCode;
const getButtonlessOpCodeName = require('../dfuConstants').getButtonlessOpCodeName;
const getButtonlessResponseCodeName = require('../dfuConstants').getButtonlessResponseCodeName;
const ErrorCode = require('../dfuConstants').ErrorCode;
const createError = require('../dfuConstants').createError;

class ButtonlessControlPointService {

    constructor(adapter, buttonlessCharacteristicId) {
        this._adapter = adapter;
        this._buttonlessCharacteristicId = buttonlessCharacteristicId;
        const buttonlessCodes = {
          response: ButtonlessControlPointOpCode.RESPONSE,
          success: ButtonlessResponseCode.SUCCESS,
          extendedError: null,
          getOpCodeName: getButtonlessOpCodeName,
          getResponseCodeName: getButtonlessResponseCodeName,
          getExtendedErrorCodeName: null,
        };
        this._notificationQueue = new NotificationQueue(adapter, this._buttonlessCharacteristicId, buttonlessCodes);
    }

    enterBootloader() {
        return this._sendCommand([ButtonlessControlPointOpCode.ENTER_BOOTLOADER]);
    }

    static parseResponse(response) {
        if (response[0] !== ButtonlessControlPointOpCode.RESPONSE) {
            throw createError(ErrorCode.UNEXPECTED_NOTIFICATION, `When parsing response, expected ` +
                `operation code ${ButtonlessControlPointOpCode.RESPONSE} ` +
                `(${getOpCodeName(ButtonlessControlPointOpCode.RESPONSE)}) ` +
                `but got operation code ${response[0]} (${getOpCodeName(response[0])})`);
        }

        return {command: response[0],
                requestOpcode: response[1],
                resultCode: response[2]};
    }

    _sendCommand(command) {
        this._notificationQueue.startListening();
        return this._writeCharacteristicValue(command)
            .then(() => this._notificationQueue.readNext(command[0]))
            .then(response => ButtonlessControlPointService.parseResponse(response))
            .then(response => {
                this._notificationQueue.stopListening();
                return response;
            })
            .catch(error => {
                this._notificationQueue.stopListening();
                error.message = `When writing '${getButtonlessOpCodeName(command[0])}' ` +
                  `command to Buttonless Characteristic of DFU Target: ` + error.message;
                throw error;
            });
    }

    _writeCharacteristicValue(command) {
        return new Promise((resolve, reject) => {
            const characteristicId = this._buttonlessCharacteristicId;
            this._adapter.writeCharacteristicValue(characteristicId, command, true, error => {
                if (error) {
                    reject(createError(ErrorCode.WRITE_ERROR, `Could not write ` +
                        `${getButtonlessOpCodeName(command[0])} command: ${error.message}`));
                } else {
                    resolve();
                }
            });
        })
    }
}

module.exports = ButtonlessControlPointService;
