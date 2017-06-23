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

const ControlPointOpcode = require('../dfuConstants').ControlPointOpcode;
const ResultCode = require('../dfuConstants').ResultCode;
const ExtendedErrorCode = require('../dfuConstants').ExtendedErrorCode;
const ErrorCode = require('../dfuConstants').ErrorCode;
const createError = require('../dfuConstants').createError;
const getOpCodeName = require('../dfuConstants').getOpCodeName;
const getResultCodeName = require('../dfuConstants').getResultCodeName;
const getExtendedErrorCodeName = require('../dfuConstants').getExtendedErrorCodeName;

/**
 * Listens to notifications for the given control point characteristic,
 * and keeps them in an internal queue. It is the callers responsibility
 * to read from the queue when it expects a notification.
 */
class NotificationQueue {

    /**
     * Creates a NotificationQueue
     *
     * Available fields for the (optional) codes parameter:
     * - response: the RESPONSE opcode
     * - success: the SUCCESS response code
     * - extendedError: the EXTENDED_ERROR response code
     * - getOpCodeName: function for getting the name of an opcode
     * - getResponseCodeName: function for getting the name of a response code
     * - getExtendedErrorCodeName: function for getting the name of an extended error response code
     *
     * @constructor
     * @param adapter the adapter
     * @param controlPointCharacteristicId the characteristic to operate on
     * @param [codes] for using a custom set of opcodes and response codes.
     */
    constructor(adapter, controlPointCharacteristicId, codes) {
        this._adapter = adapter;
        this._controlPointCharacteristicId = controlPointCharacteristicId;
        this._notifications = [];
        this._onNotificationReceived = this._onNotificationReceived.bind(this);
        const _defaultCodes = {
            response: ControlPointOpcode.RESPONSE,
            success: ResultCode.SUCCESS,
            extendedError: ResultCode.EXTENDED_ERROR,
            getOpCodeName: getOpCodeName,
            getResponseCodeName: getResultCodeName,
            getExtendedErrorCodeName: getExtendedErrorCodeName,
        };
        this._codes = codes || _defaultCodes;
    }

    /**
     * Starts listening to notifications.
     */
    startListening() {
        this._adapter.on('characteristicValueChanged', this._onNotificationReceived);
    }

    /**
     * Stops listening to notifications. Also clears the queue.
     */
    stopListening() {
        this._notifications = [];
        this._adapter.removeListener('characteristicValueChanged', this._onNotificationReceived);
    }

    _onNotificationReceived(notification) {
        this._notifications.push(notification);
    }

    /**
     * Waits for and returns the latest notification that matches the given opCode.
     *
     * @param opCode the opCode to read
     * @returns promise with notification, or timeout if no notification was received
     */
    readNext(opCode) {
        const timeout = 20000;
        const pollInterval = 0;
        const timeoutPromise = new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(createError(ErrorCode.NOTIFICATION_TIMEOUT,
                    `Timed out while waiting for response to operation code ${opCode} ` +
                    `(${this._codes.getOpCodeName(opCode)})`));
            }, timeout);
        });
        return Promise.race([
            this._waitForNotification(opCode, pollInterval),
            timeoutPromise
        ]);
    }

    _waitForNotification(opCode, pollInterval) {
        return new Promise((resolve, reject) => {
            const wait = () => {
                try {
                    const notification = this._findNotification(opCode);
                    if (notification) {
                        resolve(notification);
                        return;
                    }
                    setTimeout(wait, pollInterval);
                } catch (error) {
                    reject(error);
                }
            };
            wait();
        });
    }

    _findNotification(opCode) {
        while (this._notifications.length > 0) {
            const notification = this._parseNotification(opCode, this._notifications.shift());
            if (notification) {
                return notification;
            }
        }
    }

    _parseNotification(opCode, notification) {
        if (notification._instanceId !== this._controlPointCharacteristicId) {
            return null;
        }
        const value = notification.value;
        if (value[0] === this._codes.response) {
            if (value[1] === opCode) {
                if (value[2] === this._codes.success) {
                    return value;
                } else {
                    let extendedErrorString = (value[2] === this._codes.extendedError) ? ` Extended error code ${value[3]} (${this._codes.getExtendedErrorCodeName(value[3])})` : ``;
                    const error = createError(ErrorCode.COMMAND_ERROR,
                        `Operation code ${opCode} (${this._codes.getOpCodeName(opCode)}) ` +
                        `failed on DFU Target. ` +
                        `Result code ${value[2]} (${this._codes.getResponseCodeName(value[2])})` +
                        extendedErrorString);
                    error.commandErrorCode = value[2];
                    throw error;
                }
            } else {
                throw createError(ErrorCode.UNEXPECTED_NOTIFICATION,
                    `Got unexpected response from DFU Target. ` +
                    `Expected response to operation code ${opCode} (${this._codes.getOpCodeName(opCode)}), ` +
                    `but got response to operation code ${value[1]} (${this._codes.getOpCodeName(value[1])})`);
            }
        }
        return null;
    }
}

module.exports = NotificationQueue;
