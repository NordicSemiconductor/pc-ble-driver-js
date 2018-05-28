/* Copyright (c) 2010 - 2017, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Use in source and binary forms, redistribution in binary form only, with
 * or without modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions in binary form, except as embedded into a Nordic
 *    Semiconductor ASA integrated circuit in a product or a software update for
 *    such product, must reproduce the above copyright notice, this list of
 *    conditions and the following disclaimer in the documentation and/or other
 *    materials provided with the distribution.
 *
 * 2. Neither the name of Nordic Semiconductor ASA nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 *
 * 3. This software, with or without modification, must only be used with a Nordic
 *    Semiconductor ASA integrated circuit.
 *
 * 4. Any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

const { grabAdapter, releaseAdapter, serviceFactory, setupAdapter } = require('./setup');

const debug = require('debug')('ble-driver:test:advertise');

const PERIPHERAL_DEVICE_ADDRESS = 'FF:11:22:33:AA:CE';
const PERIPHERAL_DEVICE_ADDRESS_TYPE = 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC';

const ADVERTISING_PERIOD = 4000;

describe('the API', async () => {
    let adapter;

    beforeAll(async () => {
        // Errors here will not stop the tests from running.
        // Issue filed regarding this: https://github.com/facebook/jest/issues/2713

        adapter = await grabAdapter();
        await setupAdapter(adapter, '#PERIPH', 'periph', PERIPHERAL_DEVICE_ADDRESS, PERIPHERAL_DEVICE_ADDRESS_TYPE);
    });

    afterAll(async () => {
        await releaseAdapter(adapter.state.serialNumber);
    });

    it('shall support starting and stopping of advertising', async () => {
        expect(adapter).toBeDefined();

        const service1 = serviceFactory.createService('adabfb006e7d4601bda2bffaa68956ba');
        const service2 = serviceFactory.createService('1234');

        serviceFactory.createCharacteristic(
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
            },
        );

        serviceFactory.createCharacteristic(
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
            },
        );

        debug('Setting services');

        await new Promise((resolve, reject) => {
            adapter.setServices([service1, service2], setServicesErr => {
                if (setServicesErr) {
                    reject(setServicesErr);
                    return;
                }

                debug('Trying to advertise services.');

                const advertisingData = {
                    shortenedLocalName: 'MyCoolName',
                    flags: ['leGeneralDiscMode', 'brEdrNotSupported'],
                    txPowerLevel: -10,
                };

                const scanResponseData = {
                    completeLocalName: 'MyReallyCoolName',
                };

                const options = {
                    interval: 40,
                    timeout: 180,
                    connectable: true,
                    scannable: false,
                };

                adapter.setAdvertisingData(advertisingData, scanResponseData, setAdvertisingDataError => {
                    if (setAdvertisingDataError) {
                        reject(setAdvertisingDataError);
                        return;
                    }

                    adapter.startAdvertising(options, startAdvertisingError => {
                        if (startAdvertisingError) {
                            reject(startAdvertisingError);
                            return;
                        }

                        setTimeout(() => {
                            adapter.stopAdvertising(stopAdvertisingErr => {
                                if (stopAdvertisingErr) {
                                    reject(stopAdvertisingErr);
                                    return;
                                }

                                resolve();
                            });
                        }, ADVERTISING_PERIOD);
                    });
                });
            });
        });
    });
});
