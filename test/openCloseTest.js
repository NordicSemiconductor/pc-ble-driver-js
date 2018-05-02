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

const log = require('debug')('test:log');
const error = require('debug')('test:error');

const centralDeviceAddress = 'FF:11:22:33:AA:BE';
const centralDeviceAddressType = 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC';

async function startScan(adapter, timeout) {
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
            }

            resolve();
        });
    });
}

function runTests() {
    const expectedNumberOfScanReports = 2;

    let adapterSn;
    let openCloseIterations = 0;

    const oneIteration = async () => {
        log(`Open/close iteration #${openCloseIterations} starting.`);

        const adapterToUse = await grabAdapter(adapterSn);
        adapterSn = adapterToUse.state.serialNumber;

        await setupAdapter(adapterToUse, 'central', 'central', centralDeviceAddress, centralDeviceAddressType);

        let scanReportsReceived = 0;

        const scanReportsReceivedPromise = new Promise(scanReportReceivedResolve => {
            const deviceDiscoveredEvent = () => {
                scanReportsReceived += 1;

                if (scanReportsReceived >= expectedNumberOfScanReports) {
                    log(`Received ${scanReportsReceived} scan reports.`);
                    adapterToUse.removeListener('deviceDiscovered', deviceDiscoveredEvent);
                    scanReportReceivedResolve();
                }
            };

            adapterToUse.on('deviceDiscovered', deviceDiscoveredEvent);
        });

        await startScan(adapterToUse, 1000);
        await outcome([scanReportsReceivedPromise], 1100);

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
        log(`Open/close iteration #${openCloseIterations} complete.`);
        openCloseIterations += 1;
    };

    return new Promise(async (_, reject) => {
        try {
            while (true) {
                // eslint-disable-next-line no-await-in-loop
                await oneIteration();
                // eslint-disable-next-line no-await-in-loop
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        } catch (iterationErr) {
            reject(iterationErr);
        }
    });
}

// Should run until error occurs
runTests().catch(runTestsError => {
    error(runTestsError);
});
