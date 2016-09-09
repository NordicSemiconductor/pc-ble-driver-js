/*
 * Copyright (c) 2016 Nordic Semiconductor ASA
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 *   1. Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 *
 *   2. Redistributions in binary form must reproduce the above copyright notice, this
 *   list of conditions and the following disclaimer in the documentation and/or
 *   other materials provided with the distribution.
 *
 *   3. Neither the name of Nordic Semiconductor ASA nor the names of other
 *   contributors to this software may be used to endorse or promote products
 *   derived from this software without specific prior written permission.
 *
 *   4. This software must only be used in or with a processor manufactured by Nordic
 *   Semiconductor ASA, or in or with a processor manufactured by a third party that
 *   is used in combination with a processor manufactured by Nordic Semiconductor.
 *
 *   5. Any software provided in binary or object form under this license must not be
 *   reverse engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

const assert = require('assert');

const setup = require('./setup');
const adapterFactory = setup.adapterFactory;
const driver = setup.driver;

const peripheralDeviceAddress = 'FF:11:22:33:AA:BE';
const peripheralDeviceAddressType = 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC';

const centralDeviceAddress = 'FF:11:22:33:AA:BF';
const centralDeviceAddressType = 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC';

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
    adapter.on('logMessage', (severity, message) => { if (severity > 1) console.log(`${severity} ${prefix} logMessage: ${message}`)});
    adapter.on('status', status => { console.log(`${prefix} status: ${JSON.stringify(status, null, 1)}`); });
    adapter.on('error', error => {
        console.log(`${prefix} error: ${JSON.stringify(error, null, 1)}`);
        assert(false);
    });

    adapter.on('deviceDiscovered', device =>  {
        console.log(`${prefix} deviceDiscovered: ${device.address}`);
    });
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
            baudRate: 115200,
            parity: 'none',
            flowControl: 'none',
            enableBLE: false,
            eventInterval: 10,
        },
        error => {
            assert(!error);
            adapter.enableBLE(
                null,
                (error, params, app_ram_base) => {
                    assert(!error);
                    adapter.getState((error, state) => {
                        assert(!error);
                        adapter.setAddress(address, addressType, error => {
                            assert(!error);
                            adapter.setName(name, error => {
                                assert(!error);
                                if (callback) callback(adapter);
                            });
                        });
                    });
                }
            );
        }
    );
}

function tearDownAdapter(adapter, callback) {
    adapter.close(error => {
        assert(!error);
        if (callback) callback();
    });
}

function startScan(adapter, callback)
{
    const scanParameters = {
        active: true,
        interval: 100,
        window: 20,
        timeout: 4,
    };

    adapter.startScan(scanParameters, err => {
        assert(!err);
        if (callback) callback();
    });
}

function runTests(peripheralAdapter) {
    addAdapterListener(peripheralAdapter, '#PERIPHERAL');

    setInterval(() => {
        setupAdapter(peripheralAdapter, 'peripheralAdapter', peripheralDeviceAddress, peripheralDeviceAddressType, adapter => {
            startScan(adapter, () => {
                console.log('Scan started');
                setTimeout(() => {
                    adapter.stopScan(err => {
                        console.log('Scan stopped');
                        assert(!err);
                        tearDownAdapter(adapter);
                    });
                    // Let the scanning run for a time period
                }, 2000);
            });
        });
    }, 5000);
}

addAdapterFactoryListeners();

adapterFactory.getAdapters((error, adapters) => {
    assert(!error);
    runTests(adapters[Object.keys(adapters)[0]]);
});
