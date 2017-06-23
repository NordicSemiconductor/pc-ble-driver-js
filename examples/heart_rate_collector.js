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

/** @example examples/heart_rate_collector
 *
 * @brief Heart Rate Collector Sample Application main file.
 *
 * This file contains the source code for a sample application that acts as a BLE Central device.
 * This application scans for a Heart Rate Sensor device and reads it's heart rate data.
 * https://www.bluetooth.com/specifications/gatt/viewer?attributeXmlFile=org.bluetooth.service.heart_rate.xml
 */

'use strict';

const _ = require('underscore');

const api = require('../index');


const adapterFactory = api.AdapterFactory.getInstance();

const BLE_UUID_HEART_RATE_SERVICE = '180D';
const BLE_UUID_HEART_RATE_MEASUREMENT_CHAR = '2A37';
const BLE_UUID_CCCD = '2902';

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

        discoverHeartRateService(adapter, device).then(service => {
            console.log('Discovered the heart rate service.');
            heartRateService = service;

            return discoverHRMCharacteristic(adapter)
            .then(characteristic => {
                console.log('Discovered the heart rate measurement characteristic.');
                heartRateMeasurementCharacteristic = characteristic;

                return discoverHRMCharCCCD(adapter);
            })
            .then(descriptor => {
                console.log('Discovered the heart rate measurement characteristic\'s CCCD.');
                cccdDescriptor = descriptor;

                console.log('Press any key to toggle notifications on the hrm characteristic.' +
                            'Press `q` or `Q` to disconnect from the BLE peripheral and quit application.');
                addUserInputListener(adapter);
            });
        }).catch(error => {
            console.log(error);
            process.exit(1);
        });
    });

    adapter.on('deviceDisconnected', device => {
        console.log(`${prefix} deviceDisconnected:${JSON.stringify(device)}.`);

        startScan(adapter).then(() => {
            console.log('Successfully initiated the scanning procedure.');
        }).catch(error => {
            console.log(error);
        });
    });

    adapter.on('deviceDiscovered', device => {
        console.log(`${prefix} deviceDiscovered: ${JSON.stringify(device)}.`);

        if (device.name === 'Nordic_HRM') {
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
                return reject(Error(err));
            }

            if (_.isEmpty(adapters)) {
                return reject(Error('getAdapter() found no connected adapters.'));
            }

            console.log('Found the following adapters: ');
            for (const adapter in adapters) {
                console.log(adapters[adapter].instanceId);
            }

            resolve(adapters[Object.keys(adapters)[0]]);
        });
    });
}

/**
 * Opens adapter for use with the default options.
 *
 * @param adapter Adapter to be opened.
 * @returns {Promise} Resolves if the adapter is opened successfully.
 *                    If an error occurs, rejects with the corresponding error.
 */
function openAdapter(adapter) {
    return new Promise((resolve, reject) => {
        const baudRate = 115200;
        console.log(`Opening adapter with ID: ${adapter.instanceId} and baud rate: ${baudRate}...`);

        adapter.open({ baudRate }, err => {
            if (err) {
                return reject(Error(`Error opening adapter: ${err}.`));
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
function startScan(adapter) {
    return new Promise((resolve, reject) => {
        console.log('Started scanning...');

        const scanParameters = {
            active: true,
            interval: 100,
            window: 50,
            timeout: 0,
        };

        adapter.startScan(scanParameters, err => {
            return reject(Error(`Error starting scanning: ${err}.`));
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
                interval: 100,
                window: 50,
                timeout: 0,
            },
            connParams: {
                min_conn_interval: 7.5,
                max_conn_interval: 7.5,
                slave_latency: 0,
                conn_sup_timeout: 4000,
            },
        };

        adapter.connect(connectToAddress, options, err => {
            if (err) {
                return reject(Error(`Error connecting to target device: ${err}.`));
            }

            resolve();
        });
    });
}

/**
 * Discovers the heart rate service in the BLE peripheral's GATT attribute table.
 *
 * @param adapter Adapter being used.
 * @param device Bluetooth central device being used.
 * @returns {Promise} Resolves on successfully discovering the heart rate service.
 *                    If an error occurs, rejects with the corresponding error.
 */
function discoverHeartRateService(adapter, device) {
    return new Promise((resolve, reject) => {
        adapter.getServices(device.instanceId, (err, services) => {
            if (err) {
                return reject(Error(`Error discovering the heart rate service: ${err}.`));
            }

            for (let service in services) {
                if (services[service].uuid === BLE_UUID_HEART_RATE_SERVICE) {
                    return resolve(services[service]);
                }
            }

            reject(Error('Did not discover the heart rate service in peripheral\'s GATT attribute table.'));
        });
    });
}

/**
 * Discovers the heart rate measurement characteristic in the BLE peripheral's GATT attribute table.
 *
 * @param adapter Adapter being used.
 * @returns {Promise} Resolves on successfully discovering the heart rate measurement characteristic.
 *                    If an error occurs, rejects with the corresponding error.
 */
function discoverHRMCharacteristic(adapter) {
    return new Promise((resolve, reject) => {
        adapter.getCharacteristics(heartRateService.instanceId, (err, characteristics) => {
            if (err) {
                return reject(Error(`Error discovering the heart rate service's characteristics: ${err}.`));
            }

            for (let characteristic in characteristics) {
                console.log(JSON.stringify(characteristics[characteristic]));
                if (characteristics[characteristic].uuid == BLE_UUID_HEART_RATE_MEASUREMENT_CHAR) {
                    return resolve(characteristics[characteristic]);
                }
            }

            reject(Error('Did not discover the heart rate measurement chars in peripheral\'s GATT attribute table.'));
        });
    });
}

/**
 * Discovers the heart rate measurement characteristic's CCCD in the BLE peripheral's GATT attribute table.
 *
 * @param adapter Adapter being used.
 * @returns {Promise} Resolves on successfully discovering the heart rate measurement characteristic's CCCD.
 *                    If an error occurs, rejects with the corresponding error.
 */
function discoverHRMCharCCCD(adapter) {
    return new Promise((resolve, reject) => {
        adapter.getDescriptors(heartRateMeasurementCharacteristic.instanceId, (err, descriptors) => {
            if (err) {
                return reject(Error(`Error discovering the heart rate characteristic's CCCD: ${err}.`));
            }

            for (const descriptor in descriptors) {
                if (descriptors[descriptor].uuid === BLE_UUID_CCCD) {
                    return resolve(descriptors[descriptor]);
                }
            }

            reject(Error('Did not discover the hrm chars CCCD in peripheral\'s GATT attribute table.'));
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
    process.stdin.setRawMode(true);

    const notificationsEnabled = [0, 0];

    process.stdin.on('readable', () => {
        const chunk = process.stdin.read();
        if (chunk === null) return;

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
            return startScan(adapter);
        })
        .then(() => {
            console.log('Scanning.');
        });
}).catch(error => {
    console.log(error);
    process.exit(1);
});
