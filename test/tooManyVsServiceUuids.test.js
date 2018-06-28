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

const { grabAdapter, releaseAdapter, setupAdapter, outcome } = require('./setup');

const api = require('../index');

const serviceFactory = new api.ServiceFactory();

const PERIPHERAL_DEVICE_ADDRESS = 'FF:11:22:33:AA:CE';
const PERIPHERAL_DEVICE_ADDRESS_TYPE = 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC';

const CENTRAL_DEVICE_ADDRESS = 'FF:11:22:33:AA:CF';
const CENTRAL_DEVICE_ADDRESS_TYPE = 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC';


function connect(adapter, connectToAddress) {
    const options = {
        scanParams: {
            active: false,
            interval: 100,
            window: 50,
            timeout: 20,
        },
        connParams: {
            min_conn_interval: 7.5,
            max_conn_interval: 7.5,
            slave_latency: 0,
            conn_sup_timeout: 4000,
        },
    };

    return new Promise((resolve, reject) => {
        adapter.connect(
            connectToAddress,
            options,
            connectErr => {
                if (connectErr) {
                    reject(connectErr);
                    return;
                }

                resolve();
            });
    });
}

function startAdvertising(adapter) {
    return new Promise((resolve, reject) => {
        adapter.setAdvertisingData(
            {
                txPowerLevel: 20,
            },
            {}, // scan response data
            setAdvertisingDataError => {
                if (setAdvertisingDataError) {
                    reject(setAdvertisingDataError);
                    return;
                }

                adapter.startAdvertising(
                    {
                        interval: 100,
                        timeout: 100,
                    },
                    startAdvertisingError => {
                        if (startAdvertisingError) {
                            reject(startAdvertisingError);
                            return;
                        }

                        resolve();
                    },
                );
            },
        );
    });
}

function addServicesTo(adapter, count) {
    return new Promise((resolve, reject) => {
        const services = [];
        const charmap = { 0: '0', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: 'a', 11: 'b', 12: 'c', 13: 'd', 14: 'e', 15: 'f', 16: 'f' };

        for (let i = 0; i < count; i += 1) {
            const uuid = [];
            for (let j = 0; j < 32; j += 1) {
                uuid.push(Math.floor(Math.random() * 16));
            }
            services.push(serviceFactory.createService(uuid.map(x => charmap[x]).join('')));
        }

        adapter.setServices(services, err => {
            if (err) {
                return reject(new Error(`Error initializing services: ${JSON.stringify(err, null, 1)}'.`));
            }

            return resolve();
        });
    });
}

async function onConnected(adapter, peerDevice) {
    await new Promise((resolve, reject) => {
        adapter.getServices(peerDevice.instanceId, getServicesErr => {
            expect(getServicesErr).toBeDefined();
            expect(getServicesErr).toBe('Failed to add service uuid to driver');
            reject(getServicesErr);
        });
    });
}

describe('the API', async () => {
    let centralAdapter;
    let peripheralAdapter;

    beforeAll(async () => {
        // Errors here will not stop the tests from running.
        // Issue filed regarding this: https://github.com/facebook/jest/issues/2713

        centralAdapter = await grabAdapter();
        peripheralAdapter = await grabAdapter();

        await Promise.all([
            setupAdapter(centralAdapter, '#CENTRAL', 'central', CENTRAL_DEVICE_ADDRESS, CENTRAL_DEVICE_ADDRESS_TYPE),
            setupAdapter(peripheralAdapter, '#PERIPH', 'peripheral', PERIPHERAL_DEVICE_ADDRESS, PERIPHERAL_DEVICE_ADDRESS_TYPE)]);
    });

    afterAll(async () => {
        await Promise.all([
            releaseAdapter(centralAdapter.state.serialNumber),
            releaseAdapter(peripheralAdapter.state.serialNumber)]);
    });

    it('adding too many vendor specific service uuids to driver will return an error', async () => {
        expect(centralAdapter).toBeDefined();
        expect(peripheralAdapter).toBeDefined();

        await addServicesTo(peripheralAdapter, 8);
        await addServicesTo(centralAdapter, 8);

        const deviceConnectedCentral = new Promise(resolve => {
            centralAdapter.once('deviceConnected', peripheralDevice => {
                onConnected(centralAdapter, peripheralDevice).then(() => {
                    resolve({
                        address: peripheralDevice.address,
                        type: peripheralDevice.addressType,
                        instanceId: peripheralDevice.instanceId,
                    });
                }).catch(resolve);
            });
        });

        await startAdvertising(peripheralAdapter);
        await connect(centralAdapter, { address: PERIPHERAL_DEVICE_ADDRESS, type: PERIPHERAL_DEVICE_ADDRESS_TYPE });
        await outcome([deviceConnectedCentral]);
    });
});
