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

'use strict';

const assert = require('assert');
const setup = require('./setup');
const os = require('os');

const adapterFactory = setup.adapterFactory;

const peripheralDeviceAddress = 'FF:11:22:33:AA:CE';
const peripheralDeviceAddressType = 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC';

const centralDeviceAddress = 'FF:11:22:33:AA:CF';
const centralDeviceAddressType = 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC';

let centralAsDevice;

function addAdapterFactoryListeners() {
    adapterFactory.on('added', adapter => {
        console.log(`onAdded: Adapter added. Adapter: ${adapter.instanceId}`);
    });

    adapterFactory.on('removed', adapter => {
        console.log(`onRemoved: Adapter removed. Adapter: ${adapter.instanceId}`);
    });

    adapterFactory.on('error', error => {
        console.log('onError: Error occured: ' + JSON.stringify(error, null, 1));
    });
}

function addAdapterListener(adapter, prefix) {
    adapter.on('logMessage', (severity, message) => { console.log(`${prefix} logMessage: ${message}`); });
    adapter.on('status', status => { console.log(`${prefix} status: ${JSON.stringify(status, null, 1)}`); });
    adapter.on('error', error => {
        console.log(`${prefix} error: ${JSON.stringify(error, null, 1)}`);
        assert(false);
    });
    //adapter.on('stateChanged', state => { console.log(`${prefix} stateChanged: ${JSON.stringify(state)}`); });

    adapter.on('deviceConnected', device => { console.log(`${prefix} deviceConnected: ${device.address}`); });
    adapter.on('deviceDisconnected', device => { console.log(`${prefix} deviceDisconnected: ${JSON.stringify(device, null, 1)}`); });
    adapter.on('deviceDiscovered', device => { console.log(`${prefix} deviceDiscovered: ${JSON.stringify(device)}`); });
}

function connect(adapter, connectToAddress, callback) {
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
            assert(!error);
            if (callback) callback();
        }
    );
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
        error => {
            assert(!error);
            adapter.enableBLE(
                null,
                (error, params, app_ram_base) => {
                    if (error) {
                        console.log(`error: ${error} params: ${JSON.stringify(params)}, app_ram_base: ${app_ram_base}`);
                    }

                    adapter.getState((error, state) => {
                        assert(!error);
                        adapter.setAddress(address, addressType, error => {
                            assert(!error);
                            adapter.setName(name, error => {
                                assert(!error);
                                callback(adapter);
                            });
                        });
                    });
                }
            );

        }
    );
}

function startAdvertising(adapter, callback) {
    adapter.setAdvertisingData(
        {
            txPowerLevel: 20,
        },
        {}, // scan response data
        error => {
            assert(!error);

            adapter.startAdvertising(
                {
                    interval: 100,
                    timeout: 100,
                },
                error => {
                    assert(!error);
                    if (callback) callback();
                }
            );
        }
    );
}

function startScan(adapter, callback) {
    const scanParameters = {
        active: true,
        interval: 100,
        window: 50,
        timeout: 5,
    };

    adapter.startScan(scanParameters, error => {
        assert(!error);
    });
}

function requestAttMtu(adapter, peerDevice, callback) {
    const mtu = 150;

    adapter.requestAttMtu(peerDevice.instanceId, mtu, (err, newMtu) => {
        assert(!err);
        console.log(`ATT_MTU is ${newMtu}`);
        if (callback) callback();
    });
}

function runTests(centralAdapter, peripheralAdapter) {
    addAdapterListener(centralAdapter, '#CENTRAL');
    addAdapterListener(peripheralAdapter, '#PERIPH');

    setupAdapter(centralAdapter, 'centralAdapter', centralDeviceAddress, centralDeviceAddressType, adapter => {
    });

    setupAdapter(peripheralAdapter, 'peripheralAdapter', peripheralDeviceAddress, peripheralDeviceAddressType, adapter => {
        startAdvertising(peripheralAdapter, () => {
            console.log('Advertising started');
        });

        peripheralAdapter.once('deviceConnected', centralDevice => {
            centralAsDevice = centralDevice;
        });

        centralAdapter.once('deviceConnected', peripheralDevice => {
            requestAttMtu(centralAdapter, peripheralDevice);
        });

        centralAdapter.once('dataLengthChanged', (peripheralDevice, dataLength) => {
            console.log(`New data length is ${dataLength}`);
        });

        centralAdapter.once('attMtuChanged', (peripheralDevice, attMtu) => {
            console.log(`ATT MTU changed to ${attMtu}`);
        })

        peripheralAdapter.once('attMtuChanged', (centralDevice, attMtu) => {
            console.log(`ATT MTU changed to ${attMtu}`);
        })

        connect(centralAdapter, { address: peripheralDeviceAddress, type: peripheralDeviceAddressType });
    });
}

addAdapterFactoryListeners();

adapterFactory.getAdapters((error, adapters) => {
    assert(!error);
    assert(Object.keys(adapters).length == 2, 'The number of attached devices to computer must exactly 2');

    runTests(adapters[Object.keys(adapters)[0]], adapters[Object.keys(adapters)[1]]);
});
