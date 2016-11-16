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

const api = require('../index').api;
const driver = require('../index').driver;

const setup = require('./setup');
const adapterFactory = setup.adapterFactory;

function runTests(adapter) {
    getManifestOK();
//    getManifestNonExistingZipPath();
    listServices(adapter);
}

function getManifestOK() {
    const dfu = new api.Dfu(true, true);
    const zipPath = "./dfu/dfu_test_softdevice_bootloader_s132.zip";
    dfu.getManifest(zipPath, (err, manifest) => { console.log(manifest) } );
}

function getManifestNonExistingZipPath() {
    const dfu = new api.Dfu();
    dfu.getManifest("non-existing/path.zip", (err, manifest) => {
        if (err) {
            console.log(err);
        } else {
            console.log(manifest);
        }
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
            max_conn_interval: 15,
            slave_latency: 0,
            conn_sup_timeout: 4000,
        },
    };

    console.log("= before adapter.connect")
    adapter.connect(
        connectToAddress,
        options,
        error => {
            console.log("= inside adapter.connect callback")
            if (error) {
                console.log(error);
            }
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
            eventInterval: 0,
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

function listServices(adapter) {
    const transportParameters = {
        adapter: adapter,
        targetAddress: 'FC:EC:28:81:8B:84',
        targetAddressType: 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC',
    };
    const dfu = new api.Dfu('bleTransport', transportParameters);

//    const zipPath = "./dfu/dfu_test_softdevice_bootloader_s132.zip";
//    const zipPath = "./dfu/dfu_test_softdevice_s132.zip";
//    const zipPath = "./dfu/dfu_test_bootloader_s132.zip";
//    const zipPath = "./dfu/dfu_test_app_hrm_s132.zip";
    const zipPath = "./dfu/dfu_test_all_s132.zip";

    let deviceID = undefined;

    adapter.on('logMessage', (severity, message) => { if(severity > 1) console.log(`#1 logMessage: ${message}`)});
    adapter.on('status', (status) => { console.log(`#1 status: ${JSON.stringify(status)}`); });
    adapter.on('error', error => { console.log('#1 error: ' + JSON.stringify(error, null, 1)); });
    adapter.on('stateChanged', state => { console.log('#1 stateChanged: ' + JSON.stringify(state)); });
    adapter.on('deviceDisconnected', device => { console.log('#1 deviceDisconnected: ' + JSON.stringify(device)); });
    adapter.on('deviceDiscovered', device => { console.log(`Discovered device: ${JSON.stringify(device)}`); });
    adapter.on('deviceConnected', device => {
        console.log('#1 deviceConnected: ' + JSON.stringify(device));
        deviceID = device._instanceId;
    });

    dfu.on('initialized', () => console.log('DFU initialized!'));
    dfu.on('controlPointResponse', (response) => console.log('controlPointResponse: ', response));
    dfu.on('progressUpdate', progressUpdate => console.log(`${progressUpdate.stage}: ${progressUpdate.percentCompleted} % (${progressUpdate.completedBytes} / ${progressUpdate.totalBytes})`));

    dfu.on('initialized', () => console.log('DFU is initialized.'));

    setupAdapter(adapter, 'Adapter', 'FF:11:22:33:AA:BF', 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC', () => {
        dfu.performDFU(zipPath, (err) => {
            if (err) {
                console.log('  performDFU failed: ', err);
            }
        });
    });
}

adapterFactory.getAdapters((error, adapters) => {
    assert(!error);
    const adapter = adapters[Object.keys(adapters)[0]]
    runTests(adapter);

});
