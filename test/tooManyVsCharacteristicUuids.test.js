/* Copyright (c) 2010 - 2019, Nordic Semiconductor ASA
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
const common = require('./common');

const serviceFactory = new api.ServiceFactory();

const PERIPHERAL_DEVICE_ADDRESS = 'FF:11:22:33:AA:CE';
const PERIPHERAL_DEVICE_ADDRESS_TYPE = 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC';

const CENTRAL_DEVICE_ADDRESS = 'FF:11:22:33:AA:CF';
const CENTRAL_DEVICE_ADDRESS_TYPE = 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC';

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

function callbackPromise(promiseBody) {
    return new Promise((resolve, reject) => {
        function callbackFactory() {
            const trace = {};
            Error.captureStackTrace(trace, callbackFactory);
            function callback(err, val) {
                if (err) {
                    let e = Error(err);
                    Error.captureStackTrace(e, callback);
                    e = e.stack.concat(trace.stack);
                    reject(e);
                } else resolve(val);
            }
            return callback;
        }
        promiseBody(callbackFactory);
    });
}

describe('During attribute discovery, the API', () => {
    let centralAdapter;
    let peripheralAdapter;

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
        await Promise.all([
            releaseAdapter(centralAdapter.state.serialNumber),
            releaseAdapter(peripheralAdapter.state.serialNumber)]);
    });

    it('allows for many vendor specific UUIDs', async () => {
        expect(centralAdapter).toBeDefined();
        expect(peripheralAdapter).toBeDefined();

        await common.addRandomServicesAndCharacteristicsToAdapter(serviceFactory, peripheralAdapter, 8, 0);
        await common.addRandomServicesAndCharacteristicsToAdapter(serviceFactory, centralAdapter, 8, 0);

        const connectionPromise = new Promise((resolve, reject) => {
            centralAdapter.once('deviceConnected', resolve);
            centralAdapter.once('error', reject);
        });

        await common.startAdvertising(peripheralAdapter);
        await common.connect(centralAdapter, { address: PERIPHERAL_DEVICE_ADDRESS, type: PERIPHERAL_DEVICE_ADDRESS_TYPE });

        const connection = await connectionPromise;
        const services = await callbackPromise(callback => {
            centralAdapter.getServices(connection.instanceId, callback());
        });

        const service = services[2];

        const characteristicsPromise = callbackPromise(callback => {
            centralAdapter.getCharacteristics(service.instanceId, callback());
        });

        await outcome([characteristicsPromise]);
    });
});
