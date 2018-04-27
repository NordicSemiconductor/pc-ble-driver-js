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

const api = require('../index');
const { adapterPool } = require('../examples/adapterPool');

const adapterFactory = api.AdapterFactory.getInstance();
const serviceFactory = new api.ServiceFactory();

const testTimeout = 2000;

const log = require('debug')('setup:log');
const error = require('debug')('setup:error');

// Function shall return a working opened adapter ready for use
async function grabAdapter(requestedSerialNumber) {
    const { apiVersion, port, serialNumber } = await adapterPool(requestedSerialNumber);
    const adapter = adapterFactory.createAdapter(apiVersion, port, serialNumber);

    adapter.on('error', err => error(`Error adapter ${err}`));

    // TODO: automatically determine baud rate
    const baudRate = 1000000;

    return new Promise((resolve, reject) => {
        adapter.open({ baudRate }, err => {
            if (err) {
                reject(new Error(`Error opening adapter: ${err}.`));
                return;
            }

            resolve(adapter);
        });
    });
}

async function outcome(futureOutcomes, timeout) {
    let timeoutId = null;

    const result = await Promise.race([
        Promise.all(futureOutcomes),
        new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error(`Test timed out after ${testTimeout}`)), timeout || testTimeout);
        })]);

    clearTimeout(timeoutId);

    return result;
}

function addAdapterListener(adapter, prefix) {
    adapter.on('logMessage', (severity, message) => { log(`${prefix} logMessage: ${message}`); });
    adapter.on('status', status => { log(`${prefix} status: ${JSON.stringify(status, null, 1)}`); });
    adapter.on('error', err => {
        error(`${prefix} error: ${JSON.stringify(err, null, 1)}`);
    });

    adapter.on('deviceConnected', device => { log(`${prefix} deviceConnected: ${device.address}`); });
    adapter.on('deviceDisconnected', device => { log(`${prefix} deviceDisconnected: ${JSON.stringify(device, null, 1)}`); });
    adapter.on('deviceDiscovered', device => { log(`${prefix} deviceDiscovered: ${JSON.stringify(device)}`); });
}

function setupAdapter(adapter, prefix, name, address, addressType) {
    return new Promise((resolve, reject) => {
        addAdapterListener(adapter, prefix);

        adapter.getState(getStateError => {
            if (getStateError) {
                reject(getStateError);
                return;
            }

            adapter.setAddress(address, addressType, setAddressError => {
                if (setAddressError) {
                    reject(setAddressError);
                    return;
                }

                adapter.setName(name, setNameError => {
                    if (setNameError) {
                        reject(setNameError);
                        return;
                    }

                    resolve(adapter);
                });
            });
        });
    });
}

module.exports = {
    adapterFactory,
    serviceFactory,
    adapterPool,
    grabAdapter,
    setupAdapter,
    outcome,
};
