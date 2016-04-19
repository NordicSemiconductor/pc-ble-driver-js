/* Copyright (c) 2016 Nordic Semiconductor. All Rights Reserved.
 *
 * The information contained herein is property of Nordic Semiconductor ASA.
 * Terms and conditions of usage are described in detail in NORDIC
 * SEMICONDUCTOR STANDARD SOFTWARE LICENSE AGREEMENT.
 *
 * Licensees are granted free, non-transferable use of the information. NO
 * WARRANTY of ANY KIND is provided. This heading must NOT be removed from
 * the file.
 *
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
        adapterOne.on('logMessage', (severity, message) => { if (severity > 1) console.log(`#1 logMessage: ${message}`)});
        adapterOne.on('status', (status) => {
            console.log(`#1 status: ${JSON.stringify(status)}`); });
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

                //console.log('Setting name');
                adapterOne.setName('adapterOne', error => {
                    assert(!error);

                    console.log('Starting scan');
                    adapterOne.startScan(scanParameters, (error) => {
                        assert(!error);
                    });
                });
            });
        });
}

let adapterOne;

adapterFactory.on('added', adapter => {
    console.log(`onAdded: Adapter added. Adapter: ${adapter.instanceId}`);
    adapterOne  = adapter;
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
process.stdin.on('data', (data) => {
    if (data == 's')
    {
        console.log('s pressed');
        adapterFactory.getAdapters((error, adapters) => {
            assert(!error);
            runTests(adapters[Object.keys(adapters)[0]]);
        });
        console.log("Running tests")
    } else if (data =='c') {
        if( adapterOne !== undefined ) {
            console.log("Closing adapter");
            adapterOne.close(err => {
                console.log("Adapter closed!");
            });
        }
    }
});
