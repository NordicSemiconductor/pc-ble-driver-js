'use strict';

var api = require('../../index').api;
var driver = require('../../index').driver;

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

    var adapter = adapters[Object.keys(adapters)[1]];
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
            let service = serviceFactory.createService('aa-bb-cc-dd');

            let characteristic = serviceFactory.createCharacteristic(
                service,
                {
                    uuid: 'be-ef',
                    value: [1, 2, 3],
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
                });

            console.log('Setting services');
            adapter.setServices([service], err => {
                if (err) {
                    console.log(`Error setting services ${err}.`);
                    return;
                }

                console.log('Trying to advertise services (WIP).');
            });
        });
});
