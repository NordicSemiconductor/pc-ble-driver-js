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

const debug = require('debug')('ble-driver:test:open-close');

const CENTRAL_DEVICE_ADDRESS = 'FF:11:22:33:AA:BE';
const CENTRAL_DEVICE_ADDRESS_TYPE = 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC';

const NUMBER_OF_ITERATIONS = process.env.BLE_DRIVER_TEST_OPENCLOSE_ITERATIONS ? parseInt(process.env.BLE_DRIVER_TEST_OPENCLOSE_ITERATIONS, 10) : 2000; // Number of open/close iterations
const NRF51_NRF52_WAIT_TIME = 250; // nRF51/nRF52 based devices require a timeout after a reset
const SCAN_DURATION = 2000;
const SCAN_DURATION_WAIT_TIME = 3000;
const EXPECTED_NUMBER_OF_SCAN_REPORTS_PR_ITERATION = 2;

const GENERIC_WAIT_PR_ITERATION = 15000;

// Adjust the jest timeout based on the number of iterations required
const JEST_TIMEOUT = NUMBER_OF_ITERATIONS *
    (NRF51_NRF52_WAIT_TIME + SCAN_DURATION_WAIT_TIME + GENERIC_WAIT_PR_ITERATION);

debug(`jest timeout is set to ${JEST_TIMEOUT} ms.`);

jest.setTimeout(JEST_TIMEOUT);

function startScan(adapter, timeout) {
    const scanParameters = {
        active: true,
        interval: 100,
        window: 20,
        timeout,
    };

    return new Promise((resolve, reject) => {
        adapter.startScan(scanParameters, err => {
            if (err) {
                reject(err);
                return;
            }

            resolve();
        });
    });
}

describe('the API', async () => {
    let adapterSn;
    let openCloseIterations = 1;
    let programDevice = process.env.BLE_DRIVER_TEST_SKIP_PROGRAMMING !== 'true';

    const requiredNumberOfIterations = NUMBER_OF_ITERATIONS || Number.MAX_SAFE_INTEGER;

    it(`shall support opening and closing the adapter ${requiredNumberOfIterations} times.`, async () => {
        const oneIteration = async () => {
            debug(`Open/close iteration #${openCloseIterations} of ${requiredNumberOfIterations} starting.`);

            const adapterToUse = await grabAdapter(adapterSn, { programDevice });

            // Program/check for correct firmware only once
            programDevice = false;
            adapterSn = adapterToUse.state.serialNumber;

            await setupAdapter(adapterToUse, 'central', 'central', CENTRAL_DEVICE_ADDRESS, CENTRAL_DEVICE_ADDRESS_TYPE);

            let scanReportsReceived = 0;

            const scanReportsReceivedPromise = new Promise(scanReportReceivedResolve => {
                const deviceDiscoveredEvent = () => {
                    scanReportsReceived += 1;

                    if (scanReportsReceived >= EXPECTED_NUMBER_OF_SCAN_REPORTS_PR_ITERATION) {
                        debug(`Received ${scanReportsReceived} scan reports.`);
                        adapterToUse.removeListener('deviceDiscovered', deviceDiscoveredEvent);
                        scanReportReceivedResolve();
                    }
                };

                adapterToUse.on('deviceDiscovered', deviceDiscoveredEvent);
            });

            await startScan(adapterToUse, SCAN_DURATION);
            await outcome([scanReportsReceivedPromise], SCAN_DURATION_WAIT_TIME,
                `Did not receive ${EXPECTED_NUMBER_OF_SCAN_REPORTS_PR_ITERATION} scan reports in ${SCAN_DURATION_WAIT_TIME} ms period.`);

            await new Promise((resolve, reject) => {
                adapterToUse.stopScan(stopScanErr => {
                    if (stopScanErr) {
                        reject(stopScanErr);
                        return;
                    }

                    resolve();
                });
            });

            await releaseAdapter(adapterSn);
            debug(`Open/close iteration #${openCloseIterations} of ${requiredNumberOfIterations} complete.`);
            openCloseIterations += 1;
        };

        await new Promise(async (resolve, reject) => {
            try {
                while (openCloseIterations <= requiredNumberOfIterations) {
                    // eslint-disable-next-line no-await-in-loop
                    await oneIteration();
                    // eslint-disable-next-line no-await-in-loop
                    await new Promise(waitResolve => setTimeout(waitResolve, NRF51_NRF52_WAIT_TIME));
                }

                resolve();
            } catch (iterationErr) {
                reject(iterationErr);
            }
        });
    });
});
