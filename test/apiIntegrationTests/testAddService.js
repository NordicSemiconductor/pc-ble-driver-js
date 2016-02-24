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
const testLib = require('./testLibrary').singletonContainer.testLibrary;
const api = require('../../index').api;

describe('Add service', function() {
    const peripheralAddress = process.env.testPeripheral;
    this.timeout(10000);

    it('should be possible to add a service', done => {
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
                done();
            })
            .catch(error => {
                done(error);
            });
    });
});
