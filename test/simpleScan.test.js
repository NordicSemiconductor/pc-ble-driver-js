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

const debug = require('debug')('ble-driver:test:simple-scan');

const scanParameters = {
    active: true,
    interval: 100,
    window: 50,
    timeout: 5,
};

const CENTRAL_DEVICE_ADDRESS = 'FF:11:22:33:AA:CF';
const CENTRAL_DEVICE_ADDRESS_TYPE = 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC';

const SCAN_DURATION_WAIT_TIME = 3000;

describe('the API', async () => {
    let adapter;
    const EXPECTED_NUMBER_OF_SCAN_REPORTS = 10;
    let scanReportsReceived = 0;

    beforeAll(async () => {
        // Errors here will not stop the tests from running.
        // Issue filed regarding this: https://github.com/facebook/jest/issues/2713
        adapter = await grabAdapter();
        await setupAdapter(adapter, '#CENTRAL', 'central', CENTRAL_DEVICE_ADDRESS, CENTRAL_DEVICE_ADDRESS_TYPE);
    });

    afterAll(async () => {
        await releaseAdapter(adapter.state.serialNumber);
    });

    it('shall support start and stopping scanning', async () => {
        expect(adapter).toBeDefined();

        await new Promise((startScanResolve, startScanReject) => {
            adapter.startScan(scanParameters, startScanErr => {
                if (startScanErr) {
                    startScanReject(startScanErr);
                    return;
                }

                startScanResolve();
            });
        });

        const scanReportReceived = new Promise(scanReportReceivedResolve => {
            adapter.on('deviceDiscovered', () => {
                scanReportsReceived += 1;

                debug(`Received ${scanReportsReceived} scan reports.`);

                if (scanReportsReceived > EXPECTED_NUMBER_OF_SCAN_REPORTS) {
                    scanReportReceivedResolve();
                }
            });
        });

        await outcome([scanReportReceived], SCAN_DURATION_WAIT_TIME, 'Waiting for scan reports.');

        await new Promise((stopScanResolve, stopScanReject) => {
            adapter.stopScan(stopScanErr => {
                if (stopScanErr) {
                    stopScanReject(stopScanErr);
                    return;
                }

                stopScanResolve();
            });
        });
    });
});
