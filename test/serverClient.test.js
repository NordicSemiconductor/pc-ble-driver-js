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
const debug = require('debug')('ble-driver:test:mtu');

const serviceFactory = new api.ServiceFactory();

const PERIPHERAL_DEVICE_ADDRESS = 'FF:11:22:33:AA:CE';
const PERIPHERAL_DEVICE_ADDRESS_TYPE = 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC';

const CENTRAL_DEVICE_ADDRESS = 'FF:11:22:33:AA:CF';
const CENTRAL_DEVICE_ADDRESS_TYPE = 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC';

const SERVICE_0_UUID = 'F000F000AAAAAAAAAAAAAAAAAAAAAAAA';

const SERVICE_1_UUID = 'F001F000AAAAAAAAAAAAAAAAAAAAAAAA';
const CHAR_1_1_UUID = 'F001F001AAAAAAAAAAAAAAAAAAAAAAAA';
const CHAR_1_2_UUID = 'F001F002AAAAAAAAAAAAAAAAAAAAAAAA';

const SERVICE_2_UUID = 'F002F000AAAAAAAAAAAAAAAAAAAAAAAA';
const CHAR_2_1_UUID = 'F002F001AAAAAAAAAAAAAAAAAAAAAAAA';
const CHAR_2_2_UUID = 'F002F002AAAAAAAAAAAAAAAAAAAAAAAA';

const CCCD_UUID = '2902';

let service0uuid;
let service1uuid;
let char11uuid;
let char12uuid;
let service2uuid;
let char21uuid;
let char22uuid;

const serialNumberA = process.env.DEVICE_A_SERIAL_NUMBER;
if (!serialNumberA) {
    console.log('Missing env DEVICE_A_SERIAL_NUMBER=<SN e.g. from nrf-device-lister>');
    process.exit(1);
}

const serialNumberB = process.env.DEVICE_B_SERIAL_NUMBER;
if (!serialNumberA) {
    console.log('Missing env DEVICE_B_SERIAL_NUMBER=<SN e.g. from nrf-device-lister>');
    process.exit(1);
}

function connect(adapter, connectToAddress) {
    return new Promise((resolve, reject) => {
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

        adapter.connect(
            connectToAddress,
            options,
            connectErr => {
                if (connectErr) {
                    return reject(connectErr);
                }

                return resolve();
            });
    });
}

function disconnect(adapter, device) {
    return new Promise((resolve, reject) => {
        adapter.disconnect(device.instanceId, disconnectErr => {
            if (disconnectErr) {
                reject(disconnectErr);
                return;
            }

            debug(`Initiated disconnect from ${device.address}/${device.addressType}.`);
            resolve();
        });
    });
}

function characteristicsInit(service0, service1, service2) {
    const charValue = [0x0b, 0x0a];

    const char_1_1 = serviceFactory.createCharacteristic(
        service1,
        CHAR_1_1_UUID,
        charValue,
        {
            broadcast: false,
            read: false,
            write: false,
            writeWoResp: false,
            reliableWrite: false,
            notify: true,
            indicate: false,
        },
        {
            maxLength: charValue.length,
            readPerm: ['open'],
            writePerm: ['open'],
        });

    serviceFactory.createDescriptor(
        char_1_1,
        CCCD_UUID,
        [0, 0],
        {
            maxLength: 2,
            readPerm: ['open'],
            writePerm: ['open'],
            variableLength: false,
        });

    serviceFactory.createCharacteristic(
        service1,
        CHAR_1_2_UUID,
        charValue,
        {
            broadcast: false,
            read: true,
            write: false,
            writeWoResp: false,
            reliableWrite: false,
            notify: false,
            indicate: false,
        },
        {
            maxLength: charValue.length,
            readPerm: ['open'],
            writePerm: ['open'],
        });

    const char_2_1 = serviceFactory.createCharacteristic(
        service2,
        CHAR_2_1_UUID,
        charValue,
        {
            broadcast: false,
            read: false,
            write: false,
            writeWoResp: false,
            reliableWrite: false,
            notify: true,
            indicate: false,
        },
        {
            maxLength: charValue.length,
            readPerm: ['open'],
            writePerm: ['open'],
        });

    serviceFactory.createDescriptor(
        char_2_1,
        CCCD_UUID,
        [0, 0],
        {
            maxLength: 2,
            readPerm: ['open'],
            writePerm: ['open'],
            variableLength: false,
        });

    serviceFactory.createCharacteristic(
        service2,
        CHAR_2_2_UUID,
        charValue,
        {
            broadcast: false,
            read: true,
            write: false,
            writeWoResp: false,
            reliableWrite: false,
            notify: false,
            indicate: false,
        },
        {
            maxLength: charValue.length,
            readPerm: ['open'],
            writePerm: ['open'],
        });
}

function servicesInit(adapter) {
    return new Promise((resolve, reject) => {
        debug('Adding services');

        const service0 = serviceFactory.createService(SERVICE_0_UUID);
        const service1 = serviceFactory.createService(SERVICE_1_UUID);
        const service2 = serviceFactory.createService(SERVICE_2_UUID);

        characteristicsInit(service0, service1, service2);

        adapter.setServices([service0, service1, service2], err => {
            if (err) {
                return reject(new Error(`Error initializing services: ${JSON.stringify(err, null, 1)}'.`));
            }

            return resolve();
        });
    });
}

async function startAdvertising(adapter) {
    await new Promise((resolve, reject) =>
        adapter.setAdvertisingData(
            {
                txPowerLevel: 20,
            },
            {}, // scan response data
            advDataErr => {
                if (advDataErr) {
                    reject(advDataErr);
                    return;
                }

                resolve();
            }));

    await new Promise((resolve, reject) => {
        adapter.startAdvertising(
            {
                interval: 100,
                timeout: 100,
            },
            startAdvErr => {
                if (startAdvErr) {
                    reject(startAdvErr);
                    return;
                }

                resolve();
            });
    });
}

async function onConnected(adapter, peerDevice) {
    const services = await new Promise((resolve, reject) => {
        adapter.getServices(peerDevice.instanceId, (getServicesErr, readServices) => {
            if (getServicesErr) {
                reject(getServicesErr);
                return;
            }

            resolve(readServices);
        });
    });

    if (!services || services.length < 4) {
        throw new Error('Invalid services input');
    }

    service0uuid = services[2].uuid;
    service1uuid = services[3].uuid;
    service2uuid = services[4].uuid;

    const service1Id = services[3].instanceId;
    const service2Id = services[4].instanceId;

    const service1chars = await new Promise((resolve, reject) => {
        adapter.getCharacteristics(service1Id, (getCharacteristicsErr, chrs) => {
            if (getCharacteristicsErr) {
                reject(getCharacteristicsErr);
                return;
            }

            resolve(chrs);
        });
    });

    if (!service1chars || service1chars.length < 2) {
        throw new Error('Invalid characteristics input');
    }

    const service2chars = await new Promise((resolve, reject) => {
        adapter.getCharacteristics(service2Id, (getCharacteristicsErr, chrs) => {
            if (getCharacteristicsErr) {
                reject(getCharacteristicsErr);
                return;
            }

            resolve(chrs);
        });
    });

    if (!service2chars || service2chars.length < 2) {
        throw new Error('Invalid characteristics input');
    }

    char11uuid = service1chars[0].uuid;
    char12uuid = service1chars[1].uuid;

    char21uuid = service2chars[0].uuid;
    char22uuid = service2chars[1].uuid;

    /*
    const charId = characteristics[0].instanceId;

    const characteristic = await new Promise((resolve, reject) => {
        adapter.readCharacteristicValue(charId, readCharacteristicValueErr => {
            if (readCharacteristicValueErr) {
                reject(readCharacteristicValueErr);
                return;
            }

            resolve(characteristics[0]);
        });
    });

    if (!characteristic || !characteristic.instanceId) {
        throw new Error('Invalid characteristic input');
    } */
}

describe('the API', () => {
    let centralAdapter;
    let peripheralAdapter;

    beforeAll(async () => {
        centralAdapter = await grabAdapter(serialNumberA);
        peripheralAdapter = await grabAdapter(serialNumberB);

        await Promise.all([
            setupAdapter(centralAdapter, '#CENTRAL', 'central', CENTRAL_DEVICE_ADDRESS, CENTRAL_DEVICE_ADDRESS_TYPE),
            setupAdapter(peripheralAdapter, '#PERIPH', 'peripheral', PERIPHERAL_DEVICE_ADDRESS, PERIPHERAL_DEVICE_ADDRESS_TYPE)]);
    });

    afterAll(async () => {
        await Promise.all([
            releaseAdapter(centralAdapter.state.serialNumber),
            releaseAdapter(peripheralAdapter.state.serialNumber)]);
    });

    it('shall support discovering all services and characteristics correctly', async () => {
        expect(centralAdapter).toBeDefined();
        expect(peripheralAdapter).toBeDefined();

        if (centralAdapter.driver.NRF_SD_BLE_API_VERSION === 2 || peripheralAdapter.driver.NRF_SD_BLE_API_VERSION === 2) {
            debug('SoftDevice V2 does not support changing L2CAP packet length or MTU');
            return;
        }

        await servicesInit(peripheralAdapter);
        await startAdvertising(peripheralAdapter);

        const deviceConnectedCentral = new Promise((resolve, reject) => {
            centralAdapter.once('deviceConnected', peripheralDevice => {
                onConnected(centralAdapter, peripheralDevice).then(() => {
                    resolve({
                        address: peripheralDevice.address,
                        type: peripheralDevice.addressType,
                        instanceId: peripheralDevice.instanceId,
                    });
                }).catch(reject);
            });
        });

        await connect(centralAdapter, { address: PERIPHERAL_DEVICE_ADDRESS, type: PERIPHERAL_DEVICE_ADDRESS_TYPE });

        const [
            deviceConnectedCentralResult,
        ] = await outcome([
            deviceConnectedCentral,
        ], 10000);


        expect(deviceConnectedCentralResult.address).toBe(PERIPHERAL_DEVICE_ADDRESS);
        expect(deviceConnectedCentralResult.type).toBe(PERIPHERAL_DEVICE_ADDRESS_TYPE);
        expect(service0uuid).toBe(SERVICE_0_UUID);
        expect(service1uuid).toBe(SERVICE_1_UUID);
        expect(service2uuid).toBe(SERVICE_2_UUID);
        expect(char11uuid).toBe(CHAR_1_1_UUID);
        expect(char12uuid).toBe(CHAR_1_2_UUID);
        expect(char21uuid).toBe(CHAR_2_1_UUID);
        expect(char22uuid).toBe(CHAR_2_2_UUID);

        await disconnect(centralAdapter, deviceConnectedCentralResult);
    });
});
