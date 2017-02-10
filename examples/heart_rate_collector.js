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
/**@example examples/heart_rate_collector
 *
 * @brief Heart Rate Collector Sample Application main file.
 *
 * This file contains the source code for a sample application that acts as a BLE Central device.
 * This application scans for a Heart Rate Sensor device and reads it's heart rate data.
 * https://www.bluetooth.com/specifications/gatt/viewer?attributeXmlFile=org.bluetooth.service.heart_rate.xml
 */

'use strict';

const _ = require('underscore');

const api = require('../index').api;


const adapterFactory = api.AdapterFactory.getInstance();

const BAUD_RATE = 115200; /**< The baud rate to be used for serial communication with nRF5 device. */

const SCAN_INTERVAL = 100; /**< Determines scan interval in units of 0.625 milliseconds. */
const SCAN_WINDOW  = 50; /**< Determines scan window in units of 0.625 milliseconds. */
const SCAN_TIMEOUT = 0; /**< Scan timeout between 0x01 and 0xFFFF in seconds, 0 disables timeout. */

const MIN_CONNECTION_INTERVAL = 7.5; /**< Determines minimum connection interval in milliseconds. */
const MAX_CONNECTION_INTERVAL = 7.5; /**< Determines maximum connection interval in milliseconds. */
const SLAVE_LATENCY = 0; /**< Slave Latency in number of connection events. */
const CONNECTION_SUPERVISION_TIMEOUT = 4000; /**< Determines supervision time-out in units of milliseconds. */

const BLE_UUID_HEART_RATE_SERVICE = '180D'; /**< Heart Rate service UUID. */
const BLE_UUID_HEART_RATE_MEASUREMENT_CHAR = '2A37'; /**< Heart Rate Measurement characteristic UUID. */
const BLE_UUID_CCCD = '2902'; /**< Client characteristic descriptor UUID. */

const TARGET_DEV_NAME = 'Nordic_HRM'; /**< Connect to a peripheral using a given advertising name here. */


/* State */
let heartRateService;
let heartRateMeasurementCharacteristic;
let cccdDescriptor;


adapterFactory.on('added', adapter => { console.log(`onAdded: Adapter added: ${adapter.instanceId}.`); });
adapterFactory.on('removed', adapter => { console.log(`onRemoved: Adapter removed: ${adapter.instanceId}.`); });
adapterFactory.on('error', error => { console.log(`onError: ${JSON.stringify(error, null, 1)}.`); });

/**
 * Handling events emitted by adapter.
 *
 * @param adapter Adapter in use.
 * @param prefix Prefix to prepend to each log.
 */
function addAdapterListener(adapter, prefix) {
    /**
     * Handling error and log message events from the adapter.
     */
    adapter.on('logMessage', (severity, message) => { console.log(`${prefix} logMessage: ${message}.`); });
    adapter.on('status', status => { console.log(`${prefix} status: ${JSON.stringify(status, null, 1)}.`); });
    adapter.on('error', error => { console.log(`${prefix} error: ${JSON.stringify(error, null, 1)}.`); });

    /**
     * Handling the Application's BLE Stack events.
     */
    adapter.on('deviceConnected', device => {
        console.log(`${prefix} deviceConnected: ${JSON.stringify(device)}.`);

        heartRateServiceDiscover(adapter, device).then(service => {
            console.log('Discovered the heart rate service.');
            heartRateService = service;

            return hrmCharacteristicDiscover(adapter)
            .then(characteristic => {
                console.log('Discovered the heart rate measurement characteristic.');
                heartRateMeasurementCharacteristic = characteristic;

                return hrmCharCCCDDiscover(adapter);
            })
            .then(descriptor => {
                console.log('Discovered the heart rate measurement characteristic\'s CCCD.');
                cccdDescriptor = descriptor;

                console.log('Press any key to toggle notifications on the hrm characteristic.' +
                            'Press `q` or `Q` to disconnect from the BLE peripheral and quit application.');
                addUserInputListener(adapter);
            })
        }).catch(error => {
            console.log(error);
            process.exit(1);
        });
    });

    adapter.on('deviceDisconnected', device => {
        console.log(`${prefix} deviceDisconnected:${JSON.stringify(device)}.`);

        scanStart(adapter).then(() => {
            console.log('Successfully initiated the scanning procedure.');
        }).catch(error => {
            console.log(error);
        });
    });

    adapter.on('deviceDiscovered', device => {
        console.log(`${prefix} deviceDiscovered: ${JSON.stringify(device)}.`);

        if (device.name === TARGET_DEV_NAME) {
            connect(adapter, device.address).then(() => {
                // no need to do anything here
            }).catch(error => {
                console.log(error);
                process.exit(1);
            })
        }
    });

    adapter.on('scanTimedOut', () => {
        console.log(`${prefix} scanTimedOut: Scanning timed-out. Exiting.`);
        process.exit(1);
    });

    adapter.on('characteristicValueChanged', attribute => {
        if (attribute.uuid === BLE_UUID_HEART_RATE_MEASUREMENT_CHAR) {
            console.log(`Received heart rate measurement: ${attribute.value}.`);
        }
    });
}

/**
 * Enumerates all connected adapters.
 *
 * @returns {Promise} Resolves with the first adapter found. If no adapters are found or an error occurs, rejects with
 *                    the corresponding error.
 */
function getAdapter() {
    return new Promise((resolve, reject) => {
        console.log('Searching for connected adapters...');

        adapterFactory.getAdapters((err, adapters) => {
            if (err) {
                reject(Error(err));
            }

            if (_.isEmpty(adapters)) {
                reject(Error('getAdapter() found no connected adapters.'));
            }

            console.log('Found the following adapters: ');
            for (let adapter in adapters) {
                console.log(adapters[adapter].instanceId);
            }

            resolve(adapters[Object.keys(adapters)[0]]);
        });
    });
}

/**
 * Opens adapter for use with the defined BAUD_RATE and default options.
 *
 * @param adapter Adapter to be opened.
 * @returns {Promise} Resolves if the adapter is opened successfully.
 *                    If an error occurs, rejects with the corresponding error.
 */
function openAdapter(adapter) {
    return new Promise((resolve, reject) => {
        console.log(`Opening adapter with ID: ${adapter.instanceId} and baud rate: ${BAUD_RATE}...`);

        adapter.open({ baudRate: BAUD_RATE, }, err => {
            if (err) {
                reject(Error(`Error opening adapter: ${err}.`));
            }

            resolve();
        });
    });
}

/**
 * Function to start scanning (GAP Discovery procedure, Observer Procedure).
 *
 * @param adapter Adapter being used.
 * @returns {Promise} Resolves on successfully initiating the scanning procedure.
 *                    If an error occurs, rejects with the corresponding error.
 */
function scanStart(adapter) {
    return new Promise((resolve, reject) => {
        console.log('Started scanning...');

        const scanParameters = {
            active: true,
            interval: SCAN_INTERVAL,
            window: SCAN_WINDOW,
            timeout: SCAN_TIMEOUT,
        };

        adapter.startScan(scanParameters, err => {
            reject(Error(`Error starting scanning: ${err}.`));
        });

        resolve();
    });
}

/**
 * Connects to the desired BLE peripheral.
 *
 * @param adapter Adapter being used.
 * @param connectToAddress Device address of the advertising BLE peripheral to connect to.
 * @returns {Promise} Resolves on successfully connecting to the BLE peripheral.
 *                    If an error occurs, rejects with the corresponding error.
 */
function connect(adapter, connectToAddress) {
    return new Promise((resolve, reject) => {
        console.log('Connecting to target device...');

        const options = {
            scanParams: {
                active: false,
                interval: SCAN_INTERVAL,
                window: SCAN_WINDOW,
                timeout: SCAN_TIMEOUT,
            },
            connParams: {
                min_conn_interval: MIN_CONNECTION_INTERVAL,
                max_conn_interval: MAX_CONNECTION_INTERVAL,
                slave_latency: SLAVE_LATENCY,
                conn_sup_timeout: CONNECTION_SUPERVISION_TIMEOUT,
            },
        };

        adapter.connect(connectToAddress, options, err => {
            if (err) {
                reject(Error(`Error connecting to target device: ${err}.`));
            }

            resolve();
        });
    });
}

/**
 * Discovers the heart rate service in the BLE peripheral's GATT.
 *
 * @param adapter Adapter being used.
 * @param device Bluetooth central device being used.
 * @returns {Promise} Resolves on successfully discovering the heart rate service.
 *                    If an error occurs, rejects with the corresponding error.
 */
function heartRateServiceDiscover(adapter, device) {
    return new Promise((resolve, reject) => {
        adapter.getServices(device.instanceId, (err, services) => {
            if (err) {
                reject(Error(`Error discovering the heart rate service: ${err}.`));
            }

            for (let service in services) {
                if (services[service].uuid == BLE_UUID_HEART_RATE_SERVICE) {
                    resolve(services[service]);
                }
            }

            reject(Error('Did not discover the heart rate service in peripheral\'s GATT.'));
        });
    });
}

/**
 * Discovers the heart rate measurement characteristic in the BLE peripheral's GATT.
 *
 * @param adapter Adapter being used.
 * @returns {Promise} Resolves on successfully discovering the heart rate measurement characteristic.
 *                    If an error occurs, rejects with the corresponding error.
 */
function hrmCharacteristicDiscover(adapter) {
    return new Promise((resolve, reject) => {
        adapter.getCharacteristics(heartRateService.instanceId, (err, characteristics) => {
            if (err) {
                reject(Error(`Error discovering the heart rate service's characteristics: ${err}.`));
            }

            for (let characteristic in characteristics) {
                console.log(JSON.stringify(characteristics[characteristic]));
                if (characteristics[characteristic].uuid == BLE_UUID_HEART_RATE_MEASUREMENT_CHAR) {
                    resolve(characteristics[characteristic]);
                }
            }

            reject(Error('Did not discover the heart rate measurement characteristic in peripheral\'s GATT.'));
        });
    });
}

/**
 * Discovers the heart rate measurement characteristic's CCCD in the BLE peripheral's GATT.
 *
 * @param adapter Adapter being used.
 * @returns {Promise} Resolves on successfully discovering the heart rate measurement characteristic's CCCD.
 *                    If an error occurs, rejects with the corresponding error.
 */
function hrmCharCCCDDiscover(adapter) {
    return new Promise((resolve, reject) => {
        adapter.getDescriptors(heartRateMeasurementCharacteristic.instanceId, (err, descriptors) => {
            if (err) {
                reject(Error(`Error discovering the heart rate characteristic's CCCD: ${err}.`));
            }

            for (let descriptor in descriptors) {
                if (descriptors[descriptor].uuid == BLE_UUID_CCCD) {
                    resolve(descriptors[descriptor]);
                }
            }

            reject(Error('Did not discover the heart rate measurement characteristic\s CCCD in peripheral\'s GATT.'));
        });
    });
}

/**
 * Allow user to toggle notifications on the hrm char with a key press, as well as cleanly exiting the application.
 *
 * @param adapter Adapter being used.
 */
function addUserInputListener(adapter) {
    process.stdin.setEncoding('utf8');

    let notificationsEnabled = [0, 0];

    process.stdin.on('readable', () => {
        const chunk = process.stdin.read();
        if (chunk[0] === 'q' || chunk[0] === 'Q') {
            adapter.close(err => {
                if (err) {
                    console.log(`Error closing the adapter: ${err}.`);
                }

                console.log('Exiting the application...');
                process.exit(1);
            });
        } else {
            if (notificationsEnabled[0]) {
                notificationsEnabled[0] = 0;
                console.log('Disabling notifications on the heart rate measurement characteristic.');
            } else {
                notificationsEnabled[0] = 1;
                console.log('Enabling notifications on the heart rate measurement characteristic.');
            }

            adapter.writeDescriptorValue(cccdDescriptor.instanceId, notificationsEnabled, false, err => {
                if (err) {
                    console.log(`Error enabling notifications on the hrm characteristic: ${err}.`);
                    process.exit(1);
                }

                console.log('Notifications toggled on the heart rate measurement characteristic.');
            });
        }
    });
}

/**
 * Application main entry.
 */
getAdapter().then(adapter => {
    console.log(`Connected to adapter: ${adapter.instanceId}.`);
    addAdapterListener(adapter, '#BLE_CENTRAL: ');

    return openAdapter(adapter)
        .then(() => {
            console.log('Opened adapter.');
            return scanStart(adapter);
        })
        .then(() => {
            console.log('Scanning.');
        })
}).catch(error => {
    console.log(error);
    process.exit(1);
});
