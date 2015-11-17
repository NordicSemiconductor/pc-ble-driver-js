'use strict';
const assert = require('assert');
const testLib = require('./testLibrary').singletonContainer.testLibrary;
const api = require('../../index').api;
const _ = require('underscore');

describe('Sending notification and indication', function() {
    this.timeout(100000);

    it('Sending notification and indication', done => {
        let theDevice;

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
                    write: true,
                    writeWoResp: false,
                    reliableWrite: false, /* extended property in MCP ? */
                    notify: true,
                    indicate: true, /* notify/indicate is cccd, therefore it must be set */
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
        const value = [0x04, 0x05, 0x06];

        const eventPromise = new Promise((resolve, reject) => {
            testLib._adapter.on('deviceNotifiedOrIndicated', (device, attribute) => {
                assert(_.isEqual(attribute.value, value));
                resolve();
            });
        });

        testLib.addService([service])
            .then(() => {
                return testLib.startAdvertising();
            })
            .then(() => {
                return testLib.waitForConnectedEvent();
            })
            .then(device => {
                theDevice = device;
                return testLib.waitForDescriptorValueChangedEvent();
            })
            .then(descriptor => {
                return testLib.writeCharacteristicValue(characteristic.instanceId, value, false, (device, attribute) => {
                    assert(_.isEqual(attribute.value, value));
                });
            })
            .then(attribute => {
                return eventPromise;
            })
            .then(() => {
                return testLib.disconnect(theDevice.instanceId);
            })
            .then(() => {done();})
            .catch(error => {
                console.log(error);
                testLib.disconnect(theDevice.instanceId).then(() => {
                    done(error);
                });
            });
    });
});
