'use strict';

var driver = require('bindings')('ble_driver_js');

var adapterID1 = -1;
var adapterID2 = -1;

var connected = false;

open('COM18', 1);
console.log('Started first connection');

function open(port, adapternr)
{
    const options = {
        baudRate: 115200,
        parity: 'none',
        flowControl: 'none',
        eventInterval: 1,
        logLevel: 'trace',
        logCallback: (severity, message) => {
            console.log('logMessage ' + severity + ' ' + message);
        },

        eventCallback: eventArray => {
            eventArray.forEach(event => {
                console.log(event.adapterID + ' ' + event.name);
            });
        },
    };

    console.log('About to open. Adapternr: ' + adapternr);
    driver.open(port, options, (err, id) => {
        console.log('Callback called. Adapternr ' + adapternr + ' ID ' + id);
        if (err)
        {
            console.log('ERROR' + err + ' port: ' + port + ' adapter: ' + adapternr);
            return;
        }

        if (adapternr == 1) {
            adapterID1 = id;
        } else {
            adapterID2 = id;
        }

        console.log('Connected to adapter# ' + adapternr + ' with ID: ' + id);

        if (adapternr === 1) {
            console.log('Starting second connection');
            open('COM27', 2);
        } else {
            startScan(adapterID1);
        }
    });
}

function startScan(adapterID)
{
    const scanParameters = {
        active: true,
        interval: 100,
        window: 50,
        timeout: 20,
    };

    driver.gap_start_scan(adapterID, scanParameters, err => {
        if (err) {
            console.log(err);
            return;
        }

        console.log('Started scanning on adapterID: ' + adapterID);

        if (adapterID === adapterID1) {
            startScan(adapterID2);
        } else {
            console.log('Scanning on both devices.');
        }
    });
}
