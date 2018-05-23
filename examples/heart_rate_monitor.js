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
/** @example examples/heart_rate_monitor
 *
 * @brief Heart Rate Service Sample Application main file.
 *
 * This file contains the source code for a sample application using the Heart Rate service.
 * This service exposes heart rate data from a Heart Rate Sensor intended for fitness applications.
 * https://www.bluetooth.com/specifications/gatt/viewer?attributeXmlFile=org.bluetooth.service.heart_rate.xml
 */

'use strict';

const _ = require('underscore');

const api = require('../index');
const path = require('path');

const adapterFactory = api.AdapterFactory.getInstance(undefined, { enablePolling: false });
const serviceFactory = new api.ServiceFactory();

const BLE_UUID_HEART_RATE_SERVICE = '180d'; /** < Heart Rate service UUID. */
const BLE_UUID_HEART_RATE_MEASUREMENT_CHAR = '2a37'; /** < Heart Rate Measurement characteristic UUID. */
const BLE_UUID_CCCD = '2902'; /** < Client characteristic descriptor UUID. */

/* State */
let heartRateService;
let heartRateMeasurementCharacteristic;
let cccdDescriptor;
let heartRateInterval;

/**
 * When notifications are disabled on the hrm characteristic's CCCD, stop generating and sending heart rates.
 * @returns {undefined}
 */
function disableNotificationsOnHRM() {
    if (heartRateInterval !== null) {
        console.log('Disabling notifications on heart rate measurement characteristic...');

        clearInterval(heartRateInterval);
        heartRateInterval = null;
    }
}

/**
 * Function for initializing the Advertising functionality and starting advertising.
 *
 * @param {Adapter} adapter Adapter being used.
 * @returns {Promise} Resolves if advertising is started successfully.
 *                    If an error occurs, rejects with the corresponding error.
 */
function advertisingStart(adapter) {
    return new Promise((resolve, reject) => {
        console.log('Starting advertising...');

        const options = {
            interval: 40,
            timeout: 180,
            connectable: true,
            scannable: false,
        };

        adapter.startAdvertising(options, err => {
            if (err) {
                reject(new Error(`Error starting advertising: ${err}.`));
                return;
            }

            resolve();
        });
    });
}

/**
 * Function for sending the heart rate measurement over Bluetooth Low Energy.
 *
 * @param {Adapter} adapter Adapter being used.
 * @param {array} encodedHeartRate Data to be sent over Bluetooth Low Energy.
 * @returns {Promise} Resolves if the data is successfully sent.
 *                    If an error occurs, rejects with the corresponding error.
 */
function heartRateMeasurementSend(adapter, encodedHeartRate) {
    return new Promise((resolve, reject) => {
        console.log('Sending heart rate measurement over Bluetooth Low Energy...');

        adapter.writeCharacteristicValue(heartRateMeasurementCharacteristic.instanceId, encodedHeartRate, false,
            err => {
                if (err) {
                    reject(Error(`Error writing heartRateMeasurementCharacteristic: ${err}.`));
                }
            }, () => {
                resolve();
            });
    });
}

/**
 * Function for generating and sending heart rate measurements when notifications are enabled on hrm characteristic.
 *
 * Called whenever a descriptor's value is changed (CCCD of hrm characteristic in our example).
 *
 * @param {Adapter} adapter Adapter being used.
 * @param {any} attribute Object from descriptorValueChanged event emitter.
 * @returns {undefined}
 */
function onDescValueChanged(adapter, attribute) {
    const descriptorHandle = adapter._getCCCDOfCharacteristic(heartRateMeasurementCharacteristic.instanceId).handle;

    if (descriptorHandle === cccdDescriptor.handle) {
        const descriptorValue = attribute.value[Object.keys(attribute.value)[0]];

        if (_.isEmpty(descriptorValue)) {
            return;
        }

        const isNotificationEnabled = () => descriptorValue[0] === 1;

        const isIndicationEnabled = () => {
            if (descriptorValue.length <= 1) {
                return false;
            }

            return descriptorValue[1] === 1;
        };

        if (isIndicationEnabled()) {
            console.log('Warning: indications not supported on heart rate measurement characteristic.');
        }

        if (isNotificationEnabled()) {
            let heartRate = 65;

            if (heartRateInterval === null) {
                console.log('Enabling notifications on heart rate measurement characteristic...');


                heartRateInterval = setInterval(() => {
                    /**
                     * Function for simulating a heart rate sensor reading.
                     *
                     * Note: Modifies the heart rate state.
                     *
                     * @returns {undefined}
                     */
                    const heartRateGenerate = () => {
                        heartRate += 3;
                        if (heartRate >= 190) {
                            heartRate = 65;
                        }
                    };

                    /**
                     * Function for encoding a heart rate Measurement.
                     *
                     * @returns {[flag, heartRate]} Array of encoded data.
                     */
                    const heartRateMeasurementEncode = () => [0, heartRate];

                    heartRateGenerate();
                    const encodedHeartRate = heartRateMeasurementEncode();
                    heartRateMeasurementSend(adapter, encodedHeartRate).then(() => {
                        console.log('Heart rate measurement successfully sent over Bluetooth Low Energy.');
                    }).catch(err => {
                        console.log(err);
                        process.exit(1);
                    });
                }, 1000);
            }
        } else {
            disableNotificationsOnHRM();
        }
    }
}

/**
 * Handling events emitted by adapter.
 *
 * @param {Adapter} adapter Adapter in use.
 * @returns {undefined}
 */
function addAdapterListener(adapter) {
    /**
     * Handling error and log message events from the adapter.
     */
    adapter.on('logMessage', (severity, message) => { if (severity > 3) console.log(`${message}.`); });
    adapter.on('error', error => { console.log(`error: ${JSON.stringify(error, null, 1)}.`); });

    /**
     * Handling the Application's BLE Stack events.
     */
    adapter.on('deviceConnected', device => { console.log(`Device ${device.address}/${device.addressType} connected.`); });

    adapter.on('deviceDisconnected', device => {
        console.log(`Device ${device.address}/${device.addressType} disconnected.`);

        disableNotificationsOnHRM();
        advertisingStart(adapter);
    });

    adapter.on('deviceDiscovered', device => {
        console.log(`Discovered device ${device.address}/${device.addressType}.`);
    });

    adapter.on('descriptorValueChanged', attribute => {
        onDescValueChanged(adapter, attribute);
    });

    adapter.on('advertiseTimedOut', () => {
        console.log('advertiseTimedOut: Advertising timed-out. Exiting.');
        process.exit(1);
    });
}

/**
 * Opens adapter for use with the default options.
 *
 * @param {Adapter} adapter Adapter to be opened.
 * @returns {Promise} Resolves if the adapter is opened successfully.
 *                    If an error occurs, rejects with the corresponding error.
 */
function openAdapter(adapter) {
    return new Promise((resolve, reject) => {
        const baudRate = process.platform === 'darwin' ? 115200 : 1000000;
        console.log(`Opening adapter with ID: ${adapter.instanceId} and baud rate: ${baudRate}...`);

        adapter.open({ baudRate, logLevel: 'error' }, err => {
            if (err) {
                reject(Error(`Error opening adapter: ${err}.`));
                return;
            }

            resolve();
        });
    });
}

/**
 * Function for setting the advertisement data.
 *
 * Sets the full device name and its available BLE services in the advertisement data.
 *
 * @param {Adapter} adapter Adapter being used.
 * @returns {Promise} Resolves if advertisement data is set successfully.
 *                    If an error occurs, rejects with the corresponding error.
 */
function advertisementDataSet(adapter) {
    return new Promise((resolve, reject) => {
        console.log('Setting advertisement data...');

        const advertisingData = {
            completeLocalName: 'Nordic_HRM',
            flags: ['leGeneralDiscMode', 'brEdrNotSupported'],
            txPowerLevel: -10,
        };

        const scanResponseData = {
            completeListOf16BitServiceUuids: [BLE_UUID_HEART_RATE_SERVICE],
        };

        adapter.setAdvertisingData(advertisingData, scanResponseData, err => {
            if (err) {
                reject(new Error(`Error initializing the advertising functionality: ${err}.`));
                return;
            }

            resolve();
        });
    });
}

/**
 * Function for adding the Heart Rate Measurement characteristic and CCCD descriptor to global state `hearRateService`.
 * @returns {undefined}
 */
function characteristicsInit() {
    heartRateMeasurementCharacteristic = serviceFactory.createCharacteristic(
        heartRateService,
        BLE_UUID_HEART_RATE_MEASUREMENT_CHAR,
        [0, 0],
        {
            broadcast: false,
            read: false,
            write: false,
            writeWoResp: false,
            reliableWrite: false,
            notify: true,
            indicate: false,
        },
        {
            maxLength: 2,
            readPerm: ['open'],
            writePerm: ['open'],
        });

    cccdDescriptor = serviceFactory.createDescriptor(
        heartRateMeasurementCharacteristic,
        BLE_UUID_CCCD,
        [0, 0],
        {
            maxLength: 2,
            readPerm: ['open'],
            writePerm: ['open'],
            variableLength: false,
        });
}

/**
 * Function for initializing services that will be used by the application.
 *
 * Initialize the Heart Rate service and it's characteristics and add to GATT.
 *
 * @param {Adapter} adapter Adapter being used.
 * @returns {Promise} Resolves if the service is started initialized successfully.
 *                    If an error occurs, rejects with the corresponding error.
 */
function servicesInit(adapter) {
    return new Promise((resolve, reject) => {
        console.log('Initializing the heart rate service and its characteristics/descriptors...');

        heartRateService = serviceFactory.createService(BLE_UUID_HEART_RATE_SERVICE);
        characteristicsInit();

        adapter.setServices([heartRateService], err => {
            if (err) {
                reject(Error(`Error initializing services: ${JSON.stringify(err, null, 1)}'.`));
                return;
            }

            resolve();
        });
    });
}

function help() {
    console.log(`Usage: ${path.basename(__filename)} <PORT> <SD_API_VERSION>`);
    console.log();
    console.log('PORT is the UART for the adapter. For example /dev/ttyS0 on Unix based systems or COM1 on Windows based systems.');
    console.log('SD_API_VERSION can be v2 or v3. nRF51 series uses v2.');
    console.log();
    console.log('It is assumed that the nRF device has been programmed with the correct connectivity firmware.');
}

/**
 * Application main entry.
 */
if (process.argv.length !== 4) {
    help();
    process.exit(-1);
} else {
    const [,, port, apiVersion] = process.argv;

    if (port == null) {
        console.error('PORT must be specified');
        process.exit(-1);
    }

    if (apiVersion == null) {
        console.error('SD_API_VERSION must be provided');
        process.exit(-1);
    } else if (!['v2', 'v3'].includes(apiVersion)) {
        console.error(`SD_API_VERSION must be v2 or v3, argument provided is ${apiVersion}`);
        process.exit(-1);
    }

    const adapter = adapterFactory.createAdapter(apiVersion, port, '');
    addAdapterListener(adapter);

    openAdapter(adapter).then(() => {
        console.log('Opened adapter.');
        return servicesInit(adapter);
    }).then(() => {
        console.log('Initialized the heart rate service and its characteristics/descriptors.');
        return advertisementDataSet(adapter);
    }).then(() => {
        console.log('Set advertisement data.');
        return advertisingStart(adapter);
    })
        .then(() => {
            console.log('Started advertising.');
        })
        .catch(error => {
            console.log(error);
            process.exit(-1);
        });
}
