'use strict';

const { ControlPointOpcode, ResultCode } = require('./dfuConstants');

/**
 * Listens to notifications for the given control point characteristic,
 * and adds them to an internal queue. It is the callers responsibility
 * to read from the store when it expects a notification.
 */
class DfuNotificationStore {

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

    /**
     * Reads the latest notification that matches the given opCode. The notification,
     * is removed from the store.
     *
     * @param opCode the opCode to read
     * @returns promise with notification, or timeout if no notification was received
     */
    readLatest(opCode) {
        const pollInterval = 20; // Could we use 0?
        const timeout = 20000;
        const waitPromise = new Promise((resolve, reject) => {
            const wait = () => {
                try {
                    while (this._notifications.length > 0) {
                        const notification = this._parseNotification(opCode, this._notifications.shift());
                        if (notification) {
                            resolve(notification);
                            return;
                        }
                    }
                    setTimeout(wait, pollInterval);
                } catch (error) {
                    reject(error);
                    return;
                }
            };
            wait();
        });
        const timeoutPromise = new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(`Timed out when waiting for Control Point Characteristic notification for opCode ${opCode}.`);
            }, timeout);
        });
        return Promise.race([waitPromise, timeoutPromise]);
    }

    _onNotificationReceived(notification) {
        this._notifications.push(notification);
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
                    throw new Error(`Operation ${opCode} returned error code ${value[2]}`);
                }
            } else {
                throw new Error(`Got unexpected response. Expected code ` +
                    `${ControlPointOpcode.RESPONSE}, but got code ${value[1]}.`);
            }
        }
        return null;
    }
}

module.exports = DfuNotificationStore;
