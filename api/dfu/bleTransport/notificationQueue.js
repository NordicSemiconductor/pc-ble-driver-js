'use strict';

const { ControlPointOpcode, ResultCode, ErrorCode, createError } = require('../dfuConstants');

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
     * Stops listening to notifications. Also clears the store.
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
                    `Timed out while waiting for response from DFU Target ` +
                    `to operation code ${opCode} "${ControlPointOpcode[opCode]}".`));
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
                        `Operation code ${opCode} "${ControlPointOpcode[opCode]}" ` +
                        `failed on DFU Target. ` +
                        `Result code ${value[2]} "${ResultCode[value[2]]}"`);
                    error.commandErrorCode = value[2];
                    throw error;
                }
            } else {
                throw createError(ErrorCode.UNEXPECTED_NOTIFICATION,
                    `Got unexpected response from DFU Target. ` +
                    `Expected response to opcode ${opCode} "${ControlPointOpcode[opCode]}", ` +
                    `but got response to opcode ${value[1]} "${ControlPointOpcode[value[1]]}".`);
            }
        }
        return null;
    }
}

module.exports = NotificationQueue;
