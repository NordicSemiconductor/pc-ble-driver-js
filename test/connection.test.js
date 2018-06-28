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
const common = require('./common');

const PERIPHERAL_DEVICE_ADDRESS = 'FF:11:22:33:AA:CE';
const PERIPHERAL_DEVICE_ADDRESS_TYPE = 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC';

const CENTRAL_DEVICE_ADDRESS = 'FF:11:22:33:AA:CF';
const CENTRAL_DEVICE_ADDRESS_TYPE = 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC';

const debug = require('debug')('ble-driver:test:connection');

function requestAttMtu(adapter, peerDevice) {
    return new Promise((resolve, reject) => {
        const mtu = 150;

        adapter.requestAttMtu(peerDevice.instanceId, mtu, (err, newMtu) => {
            if (err) {
                reject(err);
                return;
            }

            resolve({ mtu, newMtu });
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

    it('shall support setting up a connection with a peripheral', async () => {
        expect(centralAdapter).toBeDefined();
        expect(peripheralAdapter).toBeDefined();

        const deviceConnectedCentral = new Promise((resolve, reject) => {
            centralAdapter.once('deviceConnected', peripheralDevice => {
                debug(`deviceConnected ${peripheralDevice.address}/${peripheralDevice.addressType}`);
                requestAttMtu(centralAdapter, peripheralDevice).then(() => {
                    resolve();
                }).catch(err => {
                    reject(err);
                });
            });
        });

        let dataLengthChangedCentral;
        if (centralAdapter.driver.NRF_SD_BLE_API_VERSION === 2) {
            dataLengthChangedCentral = Promise.resolve();
        } else {
            dataLengthChangedCentral = new Promise(resolve => {
                centralAdapter.once('dataLengthChanged', (peripheralDevice, dataLength) => {
                    debug(`central dataLengthChanged to ${dataLength}`);
                    resolve(dataLength);
                });
            });
        }

        let dataLengthChangedPeripheral;
        if (centralAdapter.driver.NRF_SD_BLE_API_VERSION === 2) {
            dataLengthChangedPeripheral = Promise.resolve();
        } else {
            dataLengthChangedPeripheral = new Promise(resolve => {
                peripheralAdapter.once('dataLengthChanged', (centralDevice, dataLength) => {
                    debug(`peripheral dataLengthChanged to ${dataLength}`);
                    resolve(dataLength);
                });
            });
        }

        let attMtuChangedCentral;
        if (centralAdapter.driver.NRF_SD_BLE_API_VERSION === 2) {
            attMtuChangedCentral = Promise.resolve();
        } else {
            attMtuChangedCentral = new Promise(resolve => {
                centralAdapter.once('attMtuChanged', (peripheralDevice, attMtu) => {
                    debug(`central attMtuChanged to ${attMtu}`);
                    resolve(attMtu);
                });
            });
        }

        let attMtuChangedPeripheral;

        if (centralAdapter.driver.NRF_SD_BLE_API_VERSION === 2) {
            attMtuChangedPeripheral = Promise.resolve();
        } else {
            attMtuChangedPeripheral = new Promise(resolve => {
                peripheralAdapter.once('attMtuChanged', (centralDevice, attMtu) => {
                    debug(`peripheral attMtuChanged to ${attMtu}`);
                    resolve(attMtu);
                });
            });
        }

        await common.startAdvertising(peripheralAdapter);
        await common.connect(centralAdapter, { address: PERIPHERAL_DEVICE_ADDRESS, type: PERIPHERAL_DEVICE_ADDRESS_TYPE });

        await outcome([
            deviceConnectedCentral,
            attMtuChangedCentral,
            attMtuChangedPeripheral,
            dataLengthChangedCentral,
            dataLengthChangedPeripheral]);
    });
});
