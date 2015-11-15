'use strict';

const api = require('../../index').api;
const driver = require('../../index.js').driver;
const AdapterFactory = require('../../api/adapterFactory.js');
var adapterFactory = AdapterFactory.getInstance(driver);

adapterFactory.on('added', adapter => {
    console.log(`onAdded: Adapter added. Adapter: ${adapter.instanceId}`);
});

adapterFactory.on('removed', adapter => {
    console.log(`onRemoved: Adapter removed. Adapter: ${adapter.instanceId}`);
});

adapterFactory.on('error', error => {
    console.log('onError: Error occured: ' + JSON.stringify(error, null, 1));
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
    adapter.on('error', error => { console.log('adapter.onError: ' + JSON.stringify(error, null, 1)); });
    adapter.on(
        'adapterStateChanged',
        adapterState => { console.log('Adapter state changed: ' + JSON.stringify(adapterState));}
    );
    adapter.on('deviceDisconnected', device => { console.log('adapter.deviceDisconnected: ' + JSON.stringify(device)); });

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
                '180d',
                [1, 2, 3],
                {
                    maxLength: 3,
                    readPerm: ['open'],
                    writePerm: ['open'],
                    writeAuth: true,
                    readAuth: true,
                    properties: { /* BT properties */
                        broadcast: false,
                        read: false,
                        write: false,
                        writeWoResp: false,
                        reliableWrite: false, /* extended property in MCP ? */
                        notify: false,
                        indicate: false, /* notify/indicate is cccd, therefore it must be set */
                    },
                }
            );

            // TODO: evalute if - is necessary for 2 byte UUIDs.
            let descriptor = serviceFactory.createDescriptor(
                characteristic,
                '2902',
                [0, 0],
                {
                    maxLength: 2,
                    readPerm: ['open'],
                    writePerm: ['open'],
                    variableLength: false,
                }
            );

            console.log('Setting services');
            adapter.setServices([service], err => {
                if (err) {
                    console.log(`Error setting services: '${JSON.stringify(err, null, 1)}'.`);
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
