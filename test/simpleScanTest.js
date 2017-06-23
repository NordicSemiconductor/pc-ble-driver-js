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
const adapterFactory = setup.adapterFactory;

const connectionParameters = {
    min_conn_interval: 7.5,
    max_conn_interval: 7.5,
    slave_latency: 0,
    conn_sup_timeout: 4000,
};

const scanParameters = {
    active: true,
    interval: 100,
    window: 50,
    timeout: 5,
};

const options = {
    scanParams: scanParameters,
    connParams: connectionParameters,
};

const advOptions = {
    interval: 100,
    timeout: 10000,
};

const openOptions = {
    baudRate: 115200,
    parity: 'none',
    flowControl: 'none',
    enableBLE: true,
    eventInterval: 0,
};

let listenersAdded = false;

function runTests(adapterOne) {
    let connect_in_progress = false;

    if (!listenersAdded) {
        adapterOne.on('logMessage', (severity, message) => { if (severity > 1) console.log(`#1 logMessage: ${message}`); });
        adapterOne.on('status', status => {
            console.log(`#1 status: ${JSON.stringify(status)}`);
        });
        adapterOne.on('error', error => { console.log('#1 error: ' + JSON.stringify(error, null, 1)); });
        adapterOne.on('stateChanged', state => {
            console.log('#1 stateChanged: ' + JSON.stringify(state));
        });

        adapterOne.on('deviceDisconnected', device => { console.log('#1 deviceDisconnected: ' + JSON.stringify(device)); });
        adapterOne.on('deviceDiscovered', device => {
            console.log(`Discovered device: ${JSON.stringify(device)}`);
        });

        listenersAdded = true;
    }

    adapterOne.open(
        openOptions,
        error => {
            assert(!error);

            let advData = {
                completeLocalName: 'adapterOne',
                txPowerLevel: 20,
            };

            console.log('Enabling BLE');
            adapterOne.getState((error, state) => {
                assert(!error);
                console.log(JSON.stringify(state));

                adapterOne.setName('adapterOne', error => {
                    assert(!error);

                    console.log('Starting scan');
                    adapterOne.startScan(scanParameters, error => {
                        assert(!error);
                    });
                });
            });
        });
}

let adapterOne;

adapterFactory.on('added', adapter => {
    console.log(`onAdded: Adapter added. Adapter: ${adapter.instanceId}`);
    adapterOne = adapter;
});

adapterFactory.on('removed', adapter => {
    console.log(`onRemoved: Adapter removed. Adapter: ${adapter.instanceId}`);
});

adapterFactory.on('error', error => {
    console.log('onError: Error occured: ' + JSON.stringify(error, null, 1));
});

console.log('Keyboard actions:');
console.log('s: open adapter and start scanning');
console.log('c: close adapter');

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on('data', data => {
    if (data == 's') {
        console.log('s pressed');
        adapterFactory.getAdapters((error, adapters) => {
            assert(!error);
            runTests(adapters[Object.keys(adapters)[0]]);
        });
        console.log('Running tests');
    } else if (data == 'c') {
        if (adapterOne !== undefined) {
            console.log('Closing adapter');
            adapterOne.close(err => {
                console.log('Adapter closed!');
            });
        }
    } else if (data == 'q') {
        console.log('Quit');
        process.exit(0);
    }
});
