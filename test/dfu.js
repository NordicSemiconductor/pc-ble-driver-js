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

/*
 * Uses the first found adapter to perform DFU. Target address and path to DFU zip
 * file (created by pc-nrfutil) must be given as command line parameters.
 *
 * In order for this to work, the the target device must have the Secure DFU
 * service. To program the target device, nrfjprog can be used:
 * nrfjprog -e -s <serial>
 * nrfjprog --program ./dfu/secure_dfu_secure_dfu_ble_s132_pca100040_debug.hex -s <serial>
 * nrfjprog -r -s <serial>
 *
 * Usage: node dfu.js <targetAddress> <pathToZip>
 */

const assert = require('assert');
const api = require('../index').api;
const adapterFactory = require('./setup').adapterFactory;

function setupAdapter(adapter, callback) {
    const options = {
        baudRate: 115200,
        parity: 'none',
        flowControl: 'none',
        enableBLE: true,
        eventInterval: 0,
    };

    adapter.open(options, error => {
        assert(!error);
        callback();
    });
}

function addLogListeners(adapter, dfu) {
    adapter.on('logMessage', (severity, message) => { if(severity > 1) console.log(`logMessage: ${message}`); });
    adapter.on('status', status => console.log(`status: ${JSON.stringify(status)}`));
    adapter.on('error', error => console.log(`error: ${JSON.stringify(error)}`));
    adapter.on('stateChanged', state => console.log(`stateChanged: ${JSON.stringify(state)}`));
    adapter.on('deviceDisconnected', device => console.log(`deviceDisconnected: ${JSON.stringify(device)}`));
    adapter.on('deviceDiscovered', device => console.log(`deviceDiscovered: ${JSON.stringify(device)}`));
    adapter.on('deviceConnected', device => console.log(`deviceConnected: ${JSON.stringify(device)}`));

    dfu.on('logMessage', (severity, message) => console.log(message));
    dfu.on('transferStart', fileName => console.log('transferStart:', fileName));
    dfu.on('transferComplete', fileName => console.log('transferComplete:', fileName));
    dfu.on('progressUpdate', progressUpdate => {
        let output = `progressUpdate: ${progressUpdate.stage}`;
        if (progressUpdate.percentCompleted) {
            output += `: ${progressUpdate.percentCompleted}%`;
            output += `, completed bytes: ${progressUpdate.completedBytes}, total: ${progressUpdate.totalBytes}`;
        }
        console.log(output);
    });
}

function performDfu(adapter, targetAddress, pathToZip) {
    const transportParameters = {
        adapter: adapter,
        targetAddress: targetAddress,
        targetAddressType: 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC',
    };
    const dfu = new api.Dfu('bleTransport', transportParameters);

    addLogListeners(adapter, dfu);

    setupAdapter(adapter, () => {
        dfu.performDFU(pathToZip, err => {
            if (err) {
                console.log('performDFU failed: ', err);
            }
        });
    });
}

const args = process.argv.slice(2);
if (args.length < 2) {
    console.log('Usage:   node dfu.js <targetAddress> <pathToDfuZip>');
    console.log('Example: node dfu.js FF:11:22:33:AA:BF ./dfu/dfu_test_app_hrm_s132.zip');
    process.exit(1);
}
const targetAddress = args[0];
const pathToZip = args[1];

adapterFactory.getAdapters((error, adapters) => {
    assert(!error);
    const adapter = adapters[Object.keys(adapters)[0]];
    performDfu(adapter, targetAddress, pathToZip);
});
