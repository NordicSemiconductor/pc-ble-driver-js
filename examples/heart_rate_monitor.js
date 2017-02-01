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
/**@example examples/heart_rate_monitor
 *
 * @brief Heart Rate Service Sample Application main file.
 *
 * This file contains the source code for a sample application using the Heart Rate service.
 * This service exposes heart rate data from a Heart Rate Sensor intended for fitness applications.
 * https://www.bluetooth.com/specifications/gatt/viewer?attributeXmlFile=org.bluetooth.service.heart_rate.xml
 */
'use strict';

const assert = require('assert');
const api = require('../index').api;

const adapterFactory = api.AdapterFactory.getInstance();
const serviceFactory = new api.ServiceFactory();

const BAUD_RATE = 115200; /**< The baud rate to be used for serial communication with nRF5 device. */

const ADVERTISING_INTERVAL_40_MS = 40;
const ADVERTISING_TIMEOUT_3_MIN  = 180;

const BLE_UUID_HEART_RATE_SERVICE = '180d'; /**< Heart Rate service UUID. */
const BLE_UUID_HEART_RATE_MEASUREMENT_CHAR = '2a37'; /**< Heart Rate Measurement characteristic UUID. */

const DEVICE_NAME = 'Nordic_HRM'; /**< Name device advertises as over Bluetooth. */

let heartRateService;
let heartRateMeasurementCharacteristic;


adapterFactory.on('added', adapter => {
    console.log(`onAdded: Adapter added: ${adapter.instanceId}`);
});

adapterFactory.on('removed', adapter => {
    console.log(`onRemoved: Adapter removed: ${adapter.instanceId}`);
});

adapterFactory.on('error', error => {
    console.log(`onError: ${JSON.stringify(error, null, 1)}`);
});

console.log('Searching for connected adapters...');
adapterFactory.getAdapters((err, adapters) => {
    if (err) {
        console.log(`Error: ${err}.`);
        process.exit(1);
    }

    console.log('Found the following adapters: ');

    for (let adapter in adapters) {
        console.log(adapters[adapter].instanceId);
    }

    const adapter = adapters[Object.keys(adapters)[0]];

    function addAdapterListener(adapter, prefix) {
        adapter.on('logMessage', (severity, message) => { console.log(`${prefix} logMessage: ${message}`); });
        adapter.on('status', status => { console.log(`${prefix} status: ${JSON.stringify(status, null, 1)}`); });
        adapter.on('error', error => {
            console.log(`${prefix} error: ${JSON.stringify(error, null, 1)}`);
            assert(false);
        });
        //adapter.on('stateChanged', state => { console.log(`${prefix} stateChanged: ${JSON.stringify(state)}`); });

        adapter.on('deviceConnected', device => {
            console.log(`${prefix} deviceConnected: ${device.address}`);
        });

        adapter.on('deviceDisconnected', device => { console.log(`${prefix} deviceDisconnected: ${JSON.stringify(device, null, 1)}`); });
        adapter.on('deviceDiscovered', device => { console.log(`${prefix} deviceDiscovered: ${JSON.stringify(device)}`); });

        adapter.on('descriptorValueChanged', attribute => {
            console.log(`${prefix} descriptorValueChanged: ${JSON.stringify(attribute)}.`);

            let heartRate = 65;
            setInterval(() => {
                heartRate += 3;
                if (heartRate >= 190) {
                    heartRate = 65;
                }
                console.log('Notifying on heart rate measurement characteristic.');
                adapter.writeCharacteristicValue(heartRateMeasurementCharacteristic._instanceId,
                    [heartRate], false, err => { assert(!err); }, (device, attribute) => {
                        console.log('Notified.');
                    });
            }, 1000);
        });
    }

    addAdapterListener(adapter, '#PERIPH');

    console.log(`Opening adapter with ID: ${adapter} and baud rate: ${BAUD_RATE}.`);
    adapter.open(
        {
            baudRate: BAUD_RATE,
            parity: 'none',
            flowControl: 'none',
        },
        err => {
        if (err) {
            console.log(`Error opening adapter: ${err}.`);
            process.exit(1);
        }

        console.log('Adapter opened.');

        heartRateService = serviceFactory.createService(BLE_UUID_HEART_RATE_SERVICE);
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
            }
        );

        const cccdDescriptor = serviceFactory.createDescriptor(
            heartRateMeasurementCharacteristic,
            '2902',
            [0, 0],
            {
                maxLength: 2,
                readPerm: ['open'],
                writePerm: ['open'],
                variableLength: false,
            }
        );

        console.log('Setting services.');
        adapter.setServices([heartRateService], err => {
            if (err) {
                console.log(`Error setting services: '${JSON.stringify(err, null, 1)}'.`);
                process.exit(1);
            }

            console.log('Setting advertisement data.');

            const advertisingData = {
                completeLocalName: DEVICE_NAME,
                flags: ['leGeneralDiscMode', 'brEdrNotSupported'],
                txPowerLevel: -10,
            };

            const options = {
                interval: ADVERTISING_INTERVAL_40_MS,
                timeout: ADVERTISING_TIMEOUT_3_MIN,
                connectable: true,
                scannable: false,
            };

            adapter.setAdvertisingData(advertisingData, null, err => {
                if (err) {
                    console.log(`Error setting advertising data: ${err}.`);
                    process.exit(1);
                }
            });

            adapter.startAdvertising( options, err => {
                if (err) {
                    console.log(`Error starting advertising: ${err}.`);
                    process.exit(1);
                }

                console.log('We are advertising!');
            });
        });
    });
});
