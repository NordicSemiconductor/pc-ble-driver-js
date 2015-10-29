'use strict';

const api = require('../../index').api;
const driver = require('../../index').driver;

var adapterFactory = new api.AdapterFactory(driver);

adapterFactory.on('added', adapter => {
    console.log(`Adapter added. Adapter: ${adapter.instanceId}`);
});

adapterFactory.on('removed', adapter => {
    console.log(`Adapter removed. Adapter: ${adapter.instanceId}`);
});

adapterFactory.on('error', error => {
    console.log('Error occured:' + error);
});

adapterFactory.getAdapters((err, adapters) => {
    if (err) {
        console.log('Error:' + err);
        return;
    }

    console.log('Found the following adapters:');

    for (let adapter in adapters) {
        console.log(adapters[adapter].instanceId);
    }

    let adapter = adapters[Object.keys(adapters)[0]];
    adapter.on('error', error => { console.log('Error from adapter:' + error); });
    adapter.on(
        'adapterStateChanged',
        adapterState => { console.log('Adapter state changed: ' + JSON.stringify(adapterState));}
    );

    console.log(`Using adapter ${adapter.instanceId}.`);

    adapter.open(
        {
            baudRate: 115200,
            parity: 'none',
            flowControl: 'none',
        },
        err => {
            if (err) {
                console.log(`Error opening adapter ${err}.`);
                return;
            }

            console.log('Adapter opened.');

            let services = [];
            let serviceFactory = new api.ServiceFactory();
            let service = serviceFactory.createService('adabfb00-6e7d-4601-bda2-bffaa68956ba');

            let characteristic = serviceFactory.createCharacteristic(
                service,
                '18-0d',
                [1, 2, 3],
                {
                    maxLength: 3,
                    readPerm: ['open'],
                    writePerm: ['encrypt'],
                    properties: { /* BT properties */
                        broadcast: true,
                        read: true,
                        write: true,
                        writeWoResp: true,
                        reliableWrite: false,
                        notify: false,
                        indicate: true,
                    },
                }
            );

            console.log('Setting services');
            adapter.setServices([service], err => {
                if (err) {
                    console.log(`Error setting services ${err}.`);
                    process.exit();
                }

                console.log('Trying to advertise services.');

                var advertisingData = {
                    shortenedLocalName: 'MyCoolName',
                    flags: ['leGeneralDiscMode', 'brEdrNotSupported'],
                    txPowerLevel: -10,
                };

                var scanResponseData = {
                    completeLocalName: 'MyReallyCoolName',
                };

                var options = {
                    interval: 40,
                    timeout: 180,
                    connectable: true,
                    scannable: false,
                };

                adapter.startAdvertising(advertisingData, scanResponseData, options, function(err) {
                    if (err) {
                        console.log(`Error starting advertising. ${err}`);
                        process.exit();
                    }

                    console.log('We are advertising!');
                });
            });
        });
});
