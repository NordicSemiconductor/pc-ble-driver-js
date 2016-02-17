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

var driver = require('bindings')('ble_driver_js');

var adapter1 = new driver.Adapter();
var adapter2 = new driver.Adapter();

var connected = false;

open('COM18', adapter1, 1);
console.log('Started first connection');

function open(port, adapter, adapternr)
{
    const options = {
        baudRate: 115200,
        parity: 'none',
        flowControl: 'none',
        eventInterval: 1,
        logLevel: 'trace',
        logCallback: (severity, message) => {
            console.log('logMessage adapternr: ' + adapternr + ' ' + severity + ' ' + message);
        },

        eventCallback: eventArray => {
            eventArray.forEach(event => {
                console.log('adapternr: ' + adapternr + ' ' + event.name);
            });
        },

        errorCallback: (code, message) => {
            console.log('Error: adapternr: ' + adapternr + ' Code: ' + code + ' ' + message);
        },
    };

    console.log('About to open. Adapternr: ' + adapternr);
    adapter.open(port, options, (err, id) => {
        console.log('Callback called. Adapternr ' + adapternr + ' ID ' + id);
        if (err)
        {
            console.log('ERROR' + err + ' port: ' + port + ' adapter: ' + adapternr);
            return;
        }

        console.log('Connected to adapter# ' + adapternr);

        if (adapternr === 1) {
            console.log('Starting second connection');
            open('COM27', adapter2, 2);
        } else {
            startScan(adapter1, 1);
        }
    });
}

function startScan(adapter, adapternr)
{
    const scanParameters = {
        active: true,
        interval: 100,
        window: 50,
        timeout: 20,
    };

    adapter.gapStartScan(scanParameters, err => {
        if (err) {
            console.log(err);
            return;
        }

        console.log('Started scanning on adapterID: ' + adapternr);

        if (adapternr === 1) {
            startScan(adapter2, 2);
        } else {
            console.log('Scanning on both devices.');
        }
    });
}
