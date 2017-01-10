/* Copyright (c) 2016, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 *   1. Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 *
 *   2. Redistributions in binary form, except as embedded into a Nordic
 *   Semiconductor ASA integrated circuit in a product or a software update for
 *   such product, must reproduce the above copyright notice, this list of
 *   conditions and the following disclaimer in the documentation and/or other
 *   materials provided with the distribution.
 *
 *   3. Neither the name of Nordic Semiconductor ASA nor the names of its
 *   contributors may be used to endorse or promote products derived from this
 *   software without specific prior written permission.
 *
 *   4. This software, with or without modification, must only be used with a
 *   Nordic Semiconductor ASA integrated circuit.
 *
 *   5. Any software provided in binary form under this license must not be
 *   reverse engineered, decompiled, modified and/or disassembled.
 *
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
 * GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT
 * OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

const ControlPointOpcode = require('../dfuConstants').ControlPointOpcode;
const ResultCode = require('../dfuConstants').ResultCode;
const ErrorCode = require('../dfuConstants').ErrorCode;
const createError = require('../dfuConstants').createError;
const getOpCodeName = require('../dfuConstants').getOpCodeName;
const getResultCodeName = require('../dfuConstants').getResultCodeName;

/**
 * Listens to notifications for the given control point characteristic,
 * and keeps them in an internal queue. It is the callers responsibility
 * to read from the queue when it expects a notification.
 */
class NotificationQueue {

    constructor(adapter, controlPointCharacteristicId) {
        this._adapter = adapter;
        this._controlPointCharacteristicId = controlPointCharacteristicId;
        this._notifications = [];
        this._onNotificationReceived = this._onNotificationReceived.bind(this);
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
                    `(${getOpCodeName(opCode)})`));
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
        if (value[0] === ControlPointOpcode.RESPONSE) {
            if (value[1] === opCode) {
                if (value[2] === ResultCode.SUCCESS) {
                    return value;
                } else {
                    const error = createError(ErrorCode.COMMAND_ERROR,
                        `Operation code ${opCode} (${getOpCodeName(opCode)}) ` +
                        `failed on DFU Target. ` +
                        `Result code ${value[2]} (${getResultCodeName(value[2])})`);
                    error.commandErrorCode = value[2];
                    throw error;
                }
            } else {
                throw createError(ErrorCode.UNEXPECTED_NOTIFICATION,
                    `Got unexpected response from DFU Target. ` +
                    `Expected response to operation code ${opCode} (${getOpCodeName(opCode)}), ` +
                    `but got response to operation code ${value[1]} (${getOpCodeName(value[1])})`);
            }
        }
        return null;
    }
}

module.exports = NotificationQueue;
