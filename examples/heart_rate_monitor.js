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
/**@example examples/heart_rate_monitor
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


const adapterFactory = api.AdapterFactory.getInstance();
const serviceFactory = new api.ServiceFactory();

const BLE_UUID_HEART_RATE_SERVICE = '180d'; /**< Heart Rate service UUID. */
const BLE_UUID_HEART_RATE_MEASUREMENT_CHAR = '2a37'; /**< Heart Rate Measurement characteristic UUID. */
const BLE_UUID_CCCD = '2902'; /**< Client characteristic descriptor UUID. */

/* State */
let heartRateService;
let heartRateMeasurementCharacteristic;
let cccdDescriptor;
let heartRateInterval;


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
    adapter.on('deviceConnected', device => { console.log(`${prefix} deviceConnected: ${device.address}.`); });

    adapter.on('deviceDisconnected', device => {
        console.log(`${prefix} deviceDisconnected:${JSON.stringify(device)}.`);

        disableNotificationsOnHRM();
        advertisingStart(adapter);
    });

    adapter.on('deviceDiscovered', device => {
        console.log(`${prefix} deviceDiscovered: ${JSON.stringify(device)}.`);
    });

    adapter.on('descriptorValueChanged', attribute => {
        onDescValueChanged(adapter, attribute, prefix);
    });

    adapter.on('advertiseTimedOut', () => {
        console.log(`${prefix} advertiseTimedOut: Advertising timed-out. Exiting.`);
        process.exit(1);
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
            for (let adapter in adapters) {
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

        adapter.open({ baudRate: baudRate, }, err => {
            if (err) {
                return reject(Error(`Error opening adapter: ${err}.`));
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
 * @param adapter Adapter being used.
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
                return reject(Error(`Error initializing the advertising functionality: ${err}.`));
            }

            resolve();
        });
    });
}

/**
 * Function for initializing the Advertising functionality and starting advertising.
 *
 * @param adapter Adapter being used.
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
                return reject(Error(`Error starting advertising: ${err}.`));
            }

            resolve();
        });
    });
}

/**
 * Function for adding the Heart Rate Measurement characteristic and CCCD descriptor to global state `hearRateService`.
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
 * @param adapter Adapter being used.
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
                return reject(Error(`Error initializing services: ${JSON.stringify(err, null, 1)}'.`));
            }

            resolve();
        });
    });
}

/**
 * Function for sending the heart rate measurement over Bluetooth.
 *
 * @param adapter Adapter being used.
 * @param encodedHeartRate Data to be sent over Bluetooth.
 * @returns {Promise} Resolves if the data is successfully sent.
 *                    If an error occurs, rejects with the corresponding error.
 */
function heartRateMeasurementSend(adapter, encodedHeartRate) {
    return new Promise((resolve, reject) => {
        console.log('Sending heart rate measurement over Bluetooth...');

        adapter.writeCharacteristicValue(heartRateMeasurementCharacteristic.instanceId, encodedHeartRate, false,
            err => {
                if (err) {
                    return reject(Error(`Error writing heartRateMeasurementCharacteristic: ${err}.`));
                }
            }, () => {
                resolve();
            });
    });
}

/**
 * When notifications are disabled on the hrm characteristic's CCCD, stop generating and sending heart rates.
 */
function disableNotificationsOnHRM() {
    if (heartRateInterval !== null) {
        console.log('Disabling notifications on heart rate measurement characteristic...');

        clearInterval(heartRateInterval);
        heartRateInterval = null;
    }
}

/**
 * Function for generating and sending heart rate measurements when notifications are enabled on hrm characteristic.
 *
 * Called whenever a descriptor's value is changed (CCCD of hrm characteristic in our example).
 *
 * @param adapter Adapter being used.
 * @param attribute Object from descriptorValueChanged event emitter.
 * @param prefix Prefix to prepend to each log.
 */
function onDescValueChanged(adapter, attribute, prefix) {
    console.log(`${prefix} descriptorValueChanged: ${JSON.stringify(attribute)}.`);

    const descriptorHandle = adapter._getCCCDOfCharacteristic(heartRateMeasurementCharacteristic.instanceId).handle;

    if (descriptorHandle === cccdDescriptor.handle) {
        const descriptorValue = attribute.value[Object.keys(attribute.value)[0]];

        if (_.isEmpty(descriptorValue)) {
            return;
        }

        const isNotificationEnabled = () => {
            return descriptorValue[0] === 1;
        };

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
                    const heartRateMeasurementEncode = () => {
                        return [0, heartRate];
                    };

                    heartRateGenerate();
                    const encodedHeartRate = heartRateMeasurementEncode();
                    heartRateMeasurementSend(adapter, encodedHeartRate).then(() => {
                        console.log('Heart rate measurement successfully sent over Bluetooth.');
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
 * Application main entry.
 */
getAdapter().then(adapter => {
    console.log(`Connected to adapter: ${adapter.instanceId}.`);
    addAdapterListener(adapter, '#BLE_PERIPHERAL: ');

    return openAdapter(adapter)
    .then(() => {
        console.log('Opened adapter.');
        return servicesInit(adapter);
    })
    .then(() => {
        console.log('Initialized the heart rate service and its characteristics/descriptors.');
        return advertisementDataSet(adapter);
    })
    .then(() => {
        console.log('Set advertisement data.');
        return advertisingStart(adapter);
    })
    .then(() => {
        console.log('Started advertising.');
    });
}).catch(error => {
    console.log(error);
    process.exit(1);
});
