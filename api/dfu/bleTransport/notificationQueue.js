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
