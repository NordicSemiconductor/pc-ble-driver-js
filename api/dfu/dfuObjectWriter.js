const crc = require('crc');
const { splitArray } = require('../util/arrayUtil');
const { ControlPointOpcode, ResultCode } = require('./dfuConstants');

class DfuObjectWriter {

    constructor(adapter, controlPointCharacteristicId, packetCharacteristicId, prn) {
        this._adapter = adapter;
        this._controlPointCharacteristicId = controlPointCharacteristicId;
        this._packetCharacteristicId = packetCharacteristicId;
        this._prn = prn;
        this._notifications = [];
    }

    /**
     * Writes DFU data object according to the given MTU size.
     *
     * @param data byte array that should be written
     * @param mtuSize the MTU size used when splitting data into packets
     * @returns promise that returns the final locally calculated CRC
     */
    writeObject(data, mtuSize) {
        const packets = splitArray(data, mtuSize);
        this._enableNotificationListener();
        return packets.reduce((prev, curr) => {
            return prev.then(() => this._writePackets(curr));
        }, Promise.resolve())
            .then(crc => {
                this._disableNotificationListener();
                return crc;
            }).catch(error => {
                this._disableNotificationListener();
                throw error;
            });
    }

    _writePackets(packets) {
        return new Promise(resolve => {
            let packetIndex = 0;
            let prnIndex = 0;
            let accumulatedCrc;

            const send = () => {
                if (packetIndex === packets.length) {
                    return resolve(accumulatedCrc);
                }

                const packet = packets[packetIndex];
                packetIndex++;
                prnIndex++;
                accumulatedCrc = crc.crc32(packet, accumulatedCrc);

                // Validate checksum each time we reach the given
                // packet receipt notification number.
                if (prnIndex === this._prn) {
                    prnIndex = 0;
                    this._writePacket(packet)
                        .then(() => this._validateCrc(accumulatedCrc))
                        .then(() => {
                            send();
                        });
                } else {
                    this._writePacket(packet)
                        .then(() => {
                            send();
                        });
                }
            };
            send();
        });
    }

    _writePacket(data) {
        return new Promise((resolve, reject) => {
            this._adapter.writeCharacteristicValue(this._packetCharacteristicId, data, true, error => {
                error ? reject(error) : resolve();
            });
        });
    }

    _validateCrc(crc) {
        return this._waitForNotification()
            .then(notification => {
                const responseCrc = notification.crc;
                if (responseCrc !== crc) {
                    throw new Error(`Error when validating CRC. Got ${responseCrc}, but expected ${crc}.`);
                }
            });
    }

    _enableNotificationListener() {
        this._adapter.on('characteristicValueChanged', this._onNotificationReceived.bind(this));
    }

    _disableNotificationListener() {
        this._adapter.removeListener('characteristicValueChanged', this._onNotificationReceived.bind(this));
    }

    _onNotificationReceived(notification) {
        this._notifications.push(notification);
    }

    _waitForNotification() {
        const pollInterval = 20; // Could we use 0?
        const timeout = 20000;
        const waitPromise = new Promise((resolve, reject) => {
            const wait = () => {
                while (this._notifications.length > 0) {
                    try {
                        const notification = this._parseNotification(this._notifications.shift());
                        if (notification) {
                            resolve(notification);
                            return;
                        }
                    } catch (error) {
                        reject(error);
                        return;
                    }
                }
                setTimeout(wait, pollInterval);
            };
            wait();
        });
        const timeoutPromise = new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(`Timed out when waiting for packet receipt notification.`);
            }, timeout);
        });
        return Promise.race([waitPromise, timeoutPromise]);
    }

    _parseNotification(notification, resolve, reject) {
        if (notification[0] === ControlPointOpcode.RESPONSE) {
            if (notification[1] === ControlPointOpcode.CALCULATE_CRC) {
                if (notification[2] === ResultCode.SUCCESS) {
                    // TODO: Convert to object with crc property
                    resolve(notification.slice(3));
                } else {
                    reject(`Operation ${ControlPointOpcode.CALCULATE_CRC} ` +
                        `returned error code ${notification[2]}`);
                }
            } else {
                reject(`Got unexpected response. Expected code ` +
                    `${ControlPointOpcode.RESPONSE}, but got code ${notification[1]}.`);
            }
        }
    }
}

module.exports = DfuObjectWriter;