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

const BLE_UUID_HEART_RATE_SERVICE = '180d';
const BLE_UUID_HEART_RATE_MEASUREMENT_CHAR = '2a37';
const BLE_UUID_CCCD = '2902';

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

function characteristicsInit(heartRateService, mtu) {
    const charValue = new Array(mtu);
    const heartRateMeasurementCharacteristic = serviceFactory.createCharacteristic(
        heartRateService,
        BLE_UUID_HEART_RATE_MEASUREMENT_CHAR,
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
        heartRateMeasurementCharacteristic,
        BLE_UUID_CCCD,
        [0, 0],
        {
            maxLength: 2,
            readPerm: ['open'],
            writePerm: ['open'],
            variableLength: false,
        });
}

function servicesInit(adapter, mtu) {
    return new Promise((resolve, reject) => {
        debug('Initializing the heart rate service and its characteristics/descriptors...');

        const heartRateService = serviceFactory.createService(BLE_UUID_HEART_RATE_SERVICE);
        characteristicsInit(heartRateService, mtu);

        adapter.setServices([heartRateService], err => {
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

async function onConnected(adapter, peerDevice, desiredMTU) {
    const newMtu = await new Promise((resolve, reject) => {
        adapter.requestAttMtu(peerDevice.instanceId, desiredMTU, (err, mtu) => {
            if (err) {
                return reject(err);
            }

            return resolve(mtu);
        });
    });

    if (newMtu !== desiredMTU) {
        throw new Error(`MTU is ${newMtu}, shall be ${desiredMTU}.`);
    }

    const services = await new Promise((resolve, reject) => {
        adapter.getServices(peerDevice.instanceId, (getServicesErr, readServices) => {
            if (getServicesErr) {
                reject(getServicesErr);
                return;
            }

            resolve(readServices);
        });
    });

    if (!services || services.length < 3) {
        throw new Error('Invalid services input');
    }

    const serviceId = services[2].instanceId;

    const characteristics = await new Promise((resolve, reject) => {
        adapter.getCharacteristics(serviceId, (getCharacteristicsErr, chrs) => {
            if (getCharacteristicsErr) {
                reject(getCharacteristicsErr);
                return;
            }

            resolve(chrs);
        });
    });

    if (!characteristics || characteristics.length < 1) {
        throw new Error('Invalid characteristics input');
    }

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
    }

    // Max payload calculation: data length - 4 bytes L2CAP header - 3 bytes GATT header
    const value = new Array(desiredMTU - 3);

    await new Promise((resolve, reject) => {
        adapter.writeCharacteristicValue(charId, value, false, writeCharacteristicValueErr => {
            if (writeCharacteristicValueErr) {
                reject(writeCharacteristicValueErr);
                return;
            }

            resolve();
        });
    });
}

describe('the API', async () => {
    let centralAdapter;
    let peripheralAdapter;

    beforeAll(async () => {
        [centralAdapter, peripheralAdapter] = await Promise.all([grabAdapter(), grabAdapter()]);

        await Promise.all([
            setupAdapter(centralAdapter, '#CENTRAL', 'central', CENTRAL_DEVICE_ADDRESS, CENTRAL_DEVICE_ADDRESS_TYPE),
            setupAdapter(peripheralAdapter, '#PERIPH', 'peripheral', PERIPHERAL_DEVICE_ADDRESS, PERIPHERAL_DEVICE_ADDRESS_TYPE)]);
    });

    afterAll(async () => {
        await Promise.all([
            releaseAdapter(centralAdapter.state.serialNumber),
            releaseAdapter(peripheralAdapter.state.serialNumber)]);
    });

    it('shall support changing MTU on supported versions of SoftDevice', async () => {
        expect(centralAdapter).toBeDefined();
        expect(peripheralAdapter).toBeDefined();

        if (centralAdapter.driver.NRF_SD_BLE_API_VERSION === 2 || peripheralAdapter.driver.NRF_SD_BLE_API_VERSION === 2) {
            debug('SoftDevice V2 does not support changing L2CAP packet length or MTU');
            return;
        }

        const maxDataLength = 251;
        const maxMTU = maxDataLength - 4; /* 4 bytes L2CAP header */

        await servicesInit(peripheralAdapter, maxMTU);
        await startAdvertising(peripheralAdapter);

        const deviceConnectedCentral = new Promise((resolve, reject) => {
            centralAdapter.once('deviceConnected', peripheralDevice => {
                onConnected(centralAdapter, peripheralDevice, maxMTU).then(() => {
                    resolve({
                        address: peripheralDevice.address,
                        type: peripheralDevice.addressType,
                        instanceId: peripheralDevice.instanceId,
                    });
                }).catch(reject);
            });
        });

        const dataLengthChangedCentral = new Promise(resolve => {
            centralAdapter.once('dataLengthChanged', (peripheralDevice, dataLength) => {
                debug(`central dataLengthChanged to ${dataLength}`);
                resolve(dataLength);
            });
        });

        const dataLengthChangedPeripheral = new Promise(resolve => {
            peripheralAdapter.once('dataLengthChanged', (centralDevice, dataLength) => {
                debug(`peripheral dataLengthChanged to ${dataLength}`);
                resolve(dataLength);
            });
        });

        const attMtuChangedCentral = new Promise(resolve => {
            centralAdapter.once('attMtuChanged', (peripheralDevice, attMtu) => {
                debug(`central attMtuChanged to ${attMtu}`);
                resolve(attMtu);
            });
        });

        const attMtuChangedPeripheral = new Promise(resolve => {
            peripheralAdapter.once('attMtuChanged', (centralDevice, attMtu) => {
                debug(`peripheral attMtuChanged to ${attMtu}`);
                resolve(attMtu);
            });
        });

        await connect(centralAdapter, { address: PERIPHERAL_DEVICE_ADDRESS, type: PERIPHERAL_DEVICE_ADDRESS_TYPE });

        const [
            deviceConnectedCentralResult,
            dataLengthCentralResult, attMtuLengthCentralResult,
            dataLengthPeripheralResult, attMtuLengthPeripheralResult] = await outcome([
                deviceConnectedCentral,
                dataLengthChangedCentral, attMtuChangedCentral,
                dataLengthChangedPeripheral, attMtuChangedPeripheral]);


        expect(deviceConnectedCentralResult.address).toBe(PERIPHERAL_DEVICE_ADDRESS);
        expect(deviceConnectedCentralResult.type).toBe(PERIPHERAL_DEVICE_ADDRESS_TYPE);

        expect(dataLengthCentralResult).toBe(maxDataLength);
        expect(attMtuLengthCentralResult).toBe(maxMTU);

        expect(dataLengthPeripheralResult).toBe(maxDataLength);
        expect(attMtuLengthPeripheralResult).toBe(maxMTU);

        await disconnect(centralAdapter, deviceConnectedCentralResult);
    });
});
