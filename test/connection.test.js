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

describe('the API', () => {
    let centralAdapter;
    let peripheralAdapter;
    let centralDevice;
    let peripheralDevice;

    beforeAll(async () => {
        // Errors here will not stop the tests from running.
        // Issue filed regarding this: https://github.com/facebook/jest/issues/2713

        centralAdapter = await grabAdapter(serialNumberA);
        peripheralAdapter = await grabAdapter(serialNumberB);

        await Promise.all([
            setupAdapter(centralAdapter, '#CENTRAL', 'central', CENTRAL_DEVICE_ADDRESS, CENTRAL_DEVICE_ADDRESS_TYPE),
            setupAdapter(peripheralAdapter, '#PERIPH', 'peripheral', PERIPHERAL_DEVICE_ADDRESS, PERIPHERAL_DEVICE_ADDRESS_TYPE)]);
    });

    afterAll(async () => {
        debug('releasing adapters');
        await Promise.all([
            releaseAdapter(centralAdapter.state.serialNumber),
            releaseAdapter(peripheralAdapter.state.serialNumber)]);
    });

    it('shall support setting up a connection with a peripheral', async () => {
        expect(centralAdapter).toBeDefined();
        expect(peripheralAdapter).toBeDefined();

        const deviceConnectedCentral = new Promise(resolve => {
            centralAdapter.once('deviceConnected', device => {
                debug(`deviceConnected ${device.address}/${device.addressType}`);
                peripheralDevice = device;
                expect(peripheralDevice).toBeDefined();
                resolve();
            });
        });

        await outcome([
            common.startAdvertising(peripheralAdapter),
            common.connect(centralAdapter, {
                address: PERIPHERAL_DEVICE_ADDRESS,
                type: PERIPHERAL_DEVICE_ADDRESS_TYPE
            }),
            deviceConnectedCentral,
        ]);
    });

    it('shall support changing mtu (SdAPI>=5)', async () => {
        if (centralAdapter.driver.NRF_SD_BLE_API_VERSION < 5) {
            return;
        }

        const mtu = 150;

        await outcome([
            new Promise((resolve, reject) => {
                centralAdapter.requestAttMtu(
                    peripheralDevice.instanceId,
                    mtu,
                    (err, newMtu) => (err ? reject(err) : resolve(newMtu)),
                );
            }),

            new Promise(resolve => {
                peripheralAdapter.once('attMtuChanged', (device, attMtu) => {
                    debug(`peripheral attMtuChanged to ${attMtu}`);
                    expect(attMtu).toEqual(mtu);
                    centralDevice = device;
                    expect(centralDevice).toBeDefined();
                    resolve();
                });
            }),

            new Promise(resolve => {
                centralAdapter.once('attMtuChanged', (_, attMtu) => {
                    debug(`central attMtuChanged to ${attMtu}`);
                    expect(attMtu).toEqual(mtu);
                    resolve();
                });
            }),
        ]);
    });

    it('shall support changing phy (SdAPI>=5)', async () => {
        if (centralAdapter.driver.NRF_SD_BLE_API_VERSION < 5) {
            return;
        }

        const phy = centralAdapter.driver.BLE_GAP_PHY_2MBPS;
        await outcome([
            new Promise((resolve, reject) => {
                centralAdapter.phyUpdate(peripheralDevice.instanceId, { tx_phys: phy, rx_phys: phy }, err => (
                    err ? reject(err) : resolve()
                ));
            }),

            new Promise(resolve => {
                peripheralAdapter.once('phyUpdated', (_, event) => {
                    debug('peripheral phyUpdated', event);
                    expect(event.rx_phy).toEqual(phy);
                    expect(event.tx_phy).toEqual(phy);
                    resolve();
                });
            }),

            new Promise(resolve => {
                centralAdapter.once('phyUpdated', (_, event) => {
                    debug('central phyUpdated', event);
                    expect(event.rx_phy).toEqual(phy);
                    expect(event.tx_phy).toEqual(phy);
                    resolve();
                });
            }),
        ]);
    });

    it('shall support changing dataLength (SdAPI>=5)', async () => {
        if (centralAdapter.driver.NRF_SD_BLE_API_VERSION < 5) {
            return;
        }

        const requestedLength = 251;
        await outcome([
            new Promise((resolve, reject) => {
                centralAdapter.dataLengthUpdate(
                    peripheralDevice.instanceId,
                    { max_rx_octets: length, max_tx_octets: length },
                    err => (err ? reject(err) : resolve()),
                );
            }),

            new Promise(resolve => {
                peripheralAdapter.once('dataLengthUpdated', (_, event) => {
                    debug('peripheral dataLengthUpdated', event);
                    expect(event.effective_params.max_tx_octets).toEqual(requestedLength);
                    expect(event.effective_params.max_rx_octets).toEqual(requestedLength);
                    resolve();
                });
            }),

            new Promise(resolve => {
                centralAdapter.once('dataLengthUpdated', (_, event) => {
                    debug('central dataLengthUpdated', event);
                    expect(event.effective_params.max_tx_octets).toEqual(requestedLength);
                    expect(event.effective_params.max_rx_octets).toEqual(requestedLength);
                    resolve();
                });
            }),
        ]);
    });
});
