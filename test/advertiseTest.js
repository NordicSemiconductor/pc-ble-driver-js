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

const setup = require('./setup');
const adapterFactory = setup.adapterFactory;
const serviceFactory = setup.ServiceFactory;

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
        'stateChanged',
        state => { console.log('Adapter state changed: ' + JSON.stringify(state));}
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
            let service1 = serviceFactory.createService('adabfb006e7d4601bda2bffaa68956ba');
            let service2 = serviceFactory.createService('1234');

            let characteristic1 = serviceFactory.createCharacteristic(
                service1,
                '180d',
                [1, 2, 3],
                {
                    broadcast: false,
                    read: false,
                    write: false,
                    writeWoResp: false,
                    reliableWrite: false, /* extended property in MCP ? */
                    notify: false,
                    indicate: false, /* notify/indicate is cccd, therefore it must be set */
                },
                {
                    maxLength: 3,
                    readPerm: ['open'],
                    writePerm: ['open'],
                }
            );

            let characteristic2 = serviceFactory.createCharacteristic(
                service2,
                '9876',
                [6, 5, 4],
                {
                    broadcast: false,
                    read: true,
                    write: true,
                    writeWoResp: false,
                    reliableWrite: false, /* extended property in MCP ? */
                    notify: false,
                    indicate: false, /* notify/indicate is cccd, therefore it must be set */
                },
                {
                    maxLength: 3,
                    readPerm: ['open'],
                    writePerm: ['open'],
                    writeAuth: false,
                    readAuth: false,
                }
            );


            // TODO: evalute if - is necessary for 2 byte UUIDs.
            let descriptor1 = serviceFactory.createDescriptor(
                characteristic1,
                '2902',
                [0, 0],
                {
                    maxLength: 2,
                    readPerm: ['open'],
                    writePerm: ['open'],
                    variableLength: false,
                }
            );

            let descriptor2 = serviceFactory.createDescriptor(
                characteristic2,
                '4567',
                [0, 0],
                {
                    maxLength: 2,
                    readPerm: ['open'],
                    writePerm: ['open'],
                    variableLength: false,
                }
            );

            console.log('Setting services');
            adapter.setServices([service1, service2], err => {
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

                adapter.setAdvertisingData(advertisingData, scanResponseData, err => {
                    if (err) {
                        console.log(`Error setting advertising data. ${err}`);
                    }
                });

                adapter.startAdvertising( options, function(err) {
                    if (err) {
                        console.log(`Error starting advertising. ${err}`);
                        process.exit();
                    }

                    console.log('We are advertising!');
                });
            });
        });
});
