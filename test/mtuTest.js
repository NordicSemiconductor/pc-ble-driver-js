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

'use strict';

const assert = require('assert');
const setup = require('./setup');

const api = require('../index');

const adapterFactory = setup.adapterFactory;
const serviceFactory = new api.ServiceFactory();

const peripheralDeviceAddress = 'FF:11:22:33:AA:CE';
const peripheralDeviceAddressType = 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC';

const centralDeviceAddress = 'FF:11:22:33:AA:CF';
const centralDeviceAddressType = 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC';

let heartRateService;
let heartRateMeasurementCharacteristic;

const BLE_UUID_HEART_RATE_SERVICE = '180d';
const BLE_UUID_HEART_RATE_MEASUREMENT_CHAR = '2a37';
const BLE_UUID_CCCD = '2902';

function addAdapterFactoryListeners() {
    adapterFactory.on('added', adapter => {
        console.log(`onAdded: Adapter added. Adapter: ${adapter.instanceId}`);
    });

    adapterFactory.on('removed', adapter => {
        console.log(`onRemoved: Adapter removed. Adapter: ${adapter.instanceId}`);
    });

    adapterFactory.on('error', error => {
        console.log(`onError: Error occured: ${JSON.stringify(error, null, 1)}`);
    });
}

function addAdapterListener(adapter, prefix) {
    adapter.on('logMessage', (severity, message) => { console.log(`${prefix} logMessage: ${message}`); });
    adapter.on('status', status => { console.log(`${prefix} status: ${JSON.stringify(status, null, 1)}`); });
    adapter.on('error', error => {
        console.log(`${prefix} error: ${JSON.stringify(error, null, 1)}`);
        assert(false);
    });
    // adapter.on('stateChanged', state => { console.log(`${prefix} stateChanged: ${JSON.stringify(state)}`); });

    adapter.on('deviceConnected', device => { console.log(`${prefix} deviceConnected: ${device.address}`); });
    adapter.on('deviceDisconnected', device => { console.log(`${prefix} deviceDisconnected: ${JSON.stringify(device, null, 1)}`); });
    adapter.on('deviceDiscovered', device => { console.log(`${prefix} deviceDiscovered: ${JSON.stringify(device)}`); });
}

function connect(adapter, connectToAddress) {
    return new Promise((resolve, reject) => {
        const options = {
            scanParams: {
                active: false,
                interval: 100,
                window: 50,
                timeout: 20,
            },
            connParams: {
                min_conn_interval: 7.5,
                max_conn_interval: 7.5,
                slave_latency: 0,
                conn_sup_timeout: 4000,
            },
        };

        adapter.connect(
            connectToAddress,
            options,
            error => {
                if (error) {
                    return reject(error);
                }

                return resolve();
            });
    });
}

function characteristicsInit() {
    const charValue = new Array(250);
    heartRateMeasurementCharacteristic = serviceFactory.createCharacteristic(
        heartRateService,
        BLE_UUID_HEART_RATE_MEASUREMENT_CHAR,
        charValue,
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
            maxLength: charValue.length,
            readPerm: ['open'],
            writePerm: ['open'],
        });

    serviceFactory.createDescriptor(
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

function servicesInit(adapter) {
    return new Promise((resolve, reject) => {
        console.log('Initializing the heart rate service and its characteristics/descriptors...');

        heartRateService = serviceFactory.createService(BLE_UUID_HEART_RATE_SERVICE);
        characteristicsInit();

        adapter.setServices([heartRateService], err => {
            if (err) {
                return reject(Error(`Error initializing services: ${JSON.stringify(err, null, 1)}'.`));
            }

            return resolve();
        });
    });
}

function setupAdapter(adapter, name, address, addressType, callback) {
    adapter.open(
        {
            baudRate: 1000000,
            parity: 'none',
            flowControl: 'none',
            enableBLE: false,
            eventInterval: 0,
        },
        openErr => {
            assert(!openErr);
            adapter.enableBLE(
                null,
                (enableErr, params, appRamBase) => {
                    if (enableErr) {
                        console.log(`error: ${enableErr} params: ${JSON.stringify(params)}, app_ram_base: ${appRamBase}`);
                    }

                    adapter.getState(stateErr => {
                        assert(!stateErr);
                        adapter.setAddress(address, addressType, addressErr => {
                            assert(!addressErr);
                            adapter.setName(name, nameErr => {
                                assert(!nameErr);
                                callback(adapter);
                            });
                        });
                    });
                });
        });
}

function startAdvertising(adapter) {
    new Promise((resolve, reject) =>
        adapter.setAdvertisingData(
            {
                txPowerLevel: 20,
            },
            {}, // scan response data
            advDataErr => {
                if (advDataErr) {
                    return reject(advDataErr);
                }

                return resolve();
            }))
    .then(() =>
        new Promise((resolve, reject) => {
            adapter.startAdvertising(
                {
                    interval: 100,
                    timeout: 100,
                },
                startAdvErr => {
                    if (startAdvErr) {
                        return reject(startAdvErr);
                    }

                    return resolve();
                });
        }));
}

function onConnected(adapter, peerDevice) {
    return Promise.resolve()
    .then(() =>
        new Promise((resolve, reject) => {
            const mtu = 247;

            adapter.requestAttMtu(peerDevice.instanceId, mtu, (err, newMtu) => {
                if (err) {
                    return reject(err);
                }

                console.log(`ATT_MTU is ${newMtu}`);
                return resolve();
            });
        }))
    .then(() =>
        new Promise((resolve, reject) => {
            adapter.getServices(peerDevice.instanceId, (err, services) => {
                if (err) {
                    return reject(err);
                }

                console.log(`Services: ${JSON.stringify(services, null, ' ')}`);
                return resolve(services);
            });
        }))
    .then(services =>
        new Promise((resolve, reject) => {
            if (!services || services.length < 3) {
                reject(new Error('Invalid services input'));
                return;
            }
            const serviceId = services[2].instanceId;
            adapter.getCharacteristics(serviceId, (err, chrs) => {
                if (err) {
                    return reject(err);
                }

                console.log(`Characteristics: ${JSON.stringify(chrs, null, ' ')}`);
                return resolve(chrs);
            });
        }))
    .then(characteristics =>
        new Promise((resolve, reject) => {
            if (!characteristics || characteristics.length < 1) {
                reject(new Error('Invalid characteristics input'));
            }
            const charId = characteristics[0].instanceId;
            adapter.readCharacteristicValue(charId, (err, readBytes) => {
                if (err) {
                    return reject(err);
                }

                console.log(`Read bytes: ${readBytes}`);
                //console.log(`Characteristic value: ${characteristics[0].value}`);
                return resolve(characteristics[0]);
            });
        }))
    .then(characteristic =>
        new Promise((resolve, reject) => {
            if (!characteristic || !characteristic.instanceId) {
                reject(new Error('Invalid characteristic input'));
                return;
            }
            const charId = characteristic.instanceId;
            const value = new Array(244);
            adapter.writeCharacteristicValue(charId, value, false, err => {
                if (err) {
                    reject(err);
                    return;
                }

                console.log('Successfully wrote to characteristic');
                resolve();
            });
        }))
    .catch(err => console.log(`ERR: ${JSON.stringify(err)}`));
}

function runTests(centralAdapter, peripheralAdapter) {
    addAdapterListener(centralAdapter, '#CENTRAL');
    addAdapterListener(peripheralAdapter, '#PERIPH');

    Promise.resolve()
        .then(() =>
            new Promise(resolve => {
                setupAdapter(centralAdapter, 'centralAdapter', centralDeviceAddress, centralDeviceAddressType, () =>
                    resolve());
            }))
        .then(() =>
            new Promise(resolve => {
                setupAdapter(peripheralAdapter, 'peripheralAdapter', peripheralDeviceAddress, peripheralDeviceAddressType, () =>
                    resolve());
            }))
        .then(() => servicesInit(peripheralAdapter))
        .then(() => startAdvertising(peripheralAdapter))
        .then(() => {
            peripheralAdapter.once('deviceConnected', () => {});

            centralAdapter.once('deviceConnected', peripheralDevice => {
                onConnected(centralAdapter, peripheralDevice);
            });

            centralAdapter.once('dataLengthChanged', (peripheralDevice, dataLength) => {
                console.log(`New data length is ${dataLength}`);
            });

            centralAdapter.once('attMtuChanged', (peripheralDevice, attMtu) => {
                console.log(`ATT MTU changed to ${attMtu}`);
            });

            peripheralAdapter.once('attMtuChanged', (centralDevice, attMtu) => {
                console.log(`ATT MTU changed to ${attMtu}`);
            });
        })
        .then(() => connect(centralAdapter, { address: peripheralDeviceAddress, type: peripheralDeviceAddressType }))
        .catch(err => {
            console.log(`ERR2 ${err}`);
        });
}

addAdapterFactoryListeners();

adapterFactory.getAdapters((error, adapters) => {
    assert(!error);
    assert(Object.keys(adapters).length === 2, 'The number of attached devices to computer must exactly 2');

    runTests(adapters[Object.keys(adapters)[0]], adapters[Object.keys(adapters)[1]]);
});
