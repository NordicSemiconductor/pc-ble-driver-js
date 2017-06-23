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
const api = require('../index');
const adapterFactory = require('./setup').adapterFactory;

function setupAdapter(adapter, callback) {
    const options = {
        baudRate: 1000000,
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
            output += `, B/s: ${progressUpdate.bytesPerSecond}, average B/s: ${progressUpdate.averageBytesPerSecond}`;
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
