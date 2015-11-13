'use strict';

const assert = require('assert');
const testLib = require('./testLibrary').singletonContainer.testLibrary;
const api = require('../../index').api;

describe('Add service', function() {
    const peripheralAddress = process.env.testPeripheral;
    this.timeout(10000);

    it('should be possible to add a service', (done) => {
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
                properties: { /* BT properties */
                    broadcast: false,
                    read: true,
                    write: false,
                    writeWoResp: false,
                    reliableWrite: true, /* extended property in MCP ? */
                    notify: true,
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

        services.push(service);

        testLib.addService(services)
            .then(() => {
                //TODO: Should be tested with a remote part reading the DB.
                // Remove this and add that code when available to connect
                // to more devices at once.
                testLib.startAdvertising()
                    .then(() => { done(); })
                    .catch((error) => {
                        done(error);
                    });
            })
            .catch((error) => {
                done(error);
            });
    });
});
