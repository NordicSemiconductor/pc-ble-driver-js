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
const { grabAdapter, setupAdapter, outcome } = require('./setup');

const peripheralDeviceAddress = 'FF:11:22:33:AA:CE';
const peripheralDeviceAddressType = 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC';

const centralDeviceAddress = 'FF:11:22:33:AA:CF';
const centralDeviceAddressType = 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC';

const testOutcome = require('debug')('test:outcome');
const log = require('debug')('test:log');
const error = require('debug')('test:error');

function connect(adapter, connectToAddress) {
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

    return new Promise((resolve, reject) => {
        adapter.connect(
            connectToAddress,
            options,
            connectErr => {
                if (connectErr) {
                    reject(connectErr);
                    return;
                }

                resolve();
            });
    });
}

function startAdvertising(adapter, callback) {
    adapter.setAdvertisingData(
        {
            txPowerLevel: 20,
        },
        {}, // scan response data
        setAdvertisingDataError => {
            assert(!setAdvertisingDataError);

            adapter.startAdvertising(
                {
                    interval: 100,
                    timeout: 100,
                },
                startAdvertisingError => {
                    assert(!startAdvertisingError);
                    if (callback) callback();
                },
            );
        },
    );
}

function requestAttMtu(adapter, peerDevice) {
    return new Promise((resolve, reject) => {
        const mtu = 150;

        adapter.requestAttMtu(peerDevice.instanceId, mtu, (err, newMtu) => {
            if (err) {
                reject(err);
                return;
            }

            resolve({ mtu, newMtu });
        });
    });
}

async function runTests(centralAdapter, peripheralAdapter) {
    await Promise.all([
        setupAdapter(centralAdapter, '#CENTRAL', 'central', centralDeviceAddress, centralDeviceAddressType),
        setupAdapter(peripheralAdapter, '#PERIPH', 'periph', peripheralDeviceAddress, peripheralDeviceAddressType),
    ]);

    const deviceConnectedCentral = new Promise((resolve, reject) => {
        centralAdapter.once('deviceConnected', peripheralDevice => {
            log(`deviceConnected ${peripheralDevice.address}/${peripheralDevice.addressType}`);
            requestAttMtu(centralAdapter, peripheralDevice).then(() => {
                resolve();
            }).catch(err => {
                reject(err);
            });
        });
    });

    const dataLengthChangedCentral = new Promise(resolve => {
        centralAdapter.once('dataLengthChanged', (peripheralDevice, dataLength) => {
            log(`central dataLengthChanged to ${dataLength}`);
            resolve(dataLength);
        });
    });

    const dataLengthChangedCentralPeripheral = new Promise(resolve => {
        peripheralAdapter.once('dataLengthChanged', (centralDevice, dataLength) => {
            log(`peripheral dataLengthChanged to ${dataLength}`);
            resolve(dataLength);
        });
    });

    const attMtuChangedCentral = new Promise(resolve => {
        centralAdapter.once('attMtuChanged', (peripheralDevice, attMtu) => {
            log(`central attMtuChanged to ${attMtu}`);
            resolve(attMtu);
        });
    });

    const attMtuChangedPeripheral = new Promise(resolve => {
        peripheralAdapter.once('attMtuChanged', (centralDevice, attMtu) => {
            log(`peripheral attMtuChanged to ${attMtu}`);
            resolve(attMtu);
        });
    });

    await new Promise((resolve, reject) => startAdvertising(peripheralAdapter, startAdvertisingError => {
        if (startAdvertisingError) {
            reject(startAdvertisingError);
            return;
        }

        resolve();
    }));

    await connect(centralAdapter, { address: peripheralDeviceAddress, type: peripheralDeviceAddressType });

    await outcome([
        deviceConnectedCentral,
        attMtuChangedCentral,
        attMtuChangedPeripheral,
        dataLengthChangedCentral,
        dataLengthChangedCentralPeripheral]);
}

Promise.all([grabAdapter(), grabAdapter()]).then(result => {
    runTests(...result).then(() => {
        testOutcome('Test completed successfully');
    }).catch(failure => {
        error('Test failed with error:', failure);
    });
}).catch(err => {
    error('Error opening adapter:', err);
});
