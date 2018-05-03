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

const adapterFactory = api.AdapterFactory.getInstance(undefined, { enablePolling: false });
const serviceFactory = new api.ServiceFactory();

const testTimeout = 2000;

const debug = require('debug')('setup:debug');
const log = require('debug')('setup:log');
const error = require('debug')('setup:error');

const DeviceLister = require('nrf-device-lister');
const { setupDevice } = require('nrf-device-setup');
const { FirmwareRegistry } = require('../index');

require('debug').enable('setup:*,test:*');

const traits = {
    usb: false,
    nordicUsb: true,
    seggerUsb: false,
    serialport: true,
    nordicDfu: true,
    jlink: true,
};

const deviceLister = new DeviceLister(traits);
const grabbedAdapters = new Map();

// Make sure the device lister does not crash if a listener for an error event is not registered.
// The device lister emits errors that will not affect us.
deviceLister.on('error', () => {
});

function getAdapters() {
    return deviceLister.reenumerate()
        .then(adapters => {
            const result = new Map();

            // Only pick adapters we are able to program
            adapters.forEach((adapter, serialNumber) => {
                const add = adapter.traits
                    && (adapter.traits.includes('jlink') || adapter.traits.includes('nordicDfu'));

                if (add) {
                    result.set(serialNumber, adapter);
                }
            });

            return result;
        });
}

/**
 * @typedef {Object} SoftDeviceParams
 * @property {string} sdVersion SoftDevice API version
 * @property {number} baudRate Baudrate to use for connectivity firmware UART communication
 */

/**
 * Determine SoftDevice parameters to use
 *
 * This function/functionality should be moved to nrf-device-setup and reused from that location
 * so that it lives in one central places
 *
 * @param {string} serialNumber to use for determining the SoftDevice parameters to use
 * @returns {SoftDeviceParams} SoftDevice parameters to use for communicating with the connectivity firmware
 *
 */
function determineSoftDeviceParameters(serialNumber) {
    const seggerSerialNumber = /^.*68([0-3]{1})[0-9]{6}$/;
    const gravitonDongleSerialNumber = /^[a-fA-F0-9]{12}$/;
    const params = {};

    params.baudRate = process.platform === 'darwin' ? 115200 : 1000000;

    if (seggerSerialNumber.test(serialNumber)) {
        const developmentKit = parseInt(seggerSerialNumber.exec(serialNumber)[1], 10);

        switch (developmentKit) {
            case 0:
            case 1:
                params.sdVersion = 'v2';
                break;
            case 2:
                params.sdVersion = 'v3';
                break;
            case 3:
                params.sdVersion = 'v3';
                break;
            default:
                throw new Error(`Unsupported nRF5 development kit. [${serialNumber}]`);
        }
    } else if (gravitonDongleSerialNumber.test(serialNumber)) {
        params.sdVersion = 'v3';
    } else {
        throw new Error(`Not able to determine version of pc-ble-driver to use for device with serial number ${serialNumber}.`);
    }

    return params;
}

async function _grabAdapter(serialNumber, options) {
    const foundAdapters = await getAdapters();

    const adapterToUse = () => {
        const serialNumbers = [...foundAdapters.keys()];

        if (serialNumber != null) {
            // Interim solution while waiting for:
            //   https://github.com/NordicSemiconductor/nrf-device-lister-js/pull/28
            const p = serialNumbers.includes(serialNumber);
            const q = serialNumbers.includes(Number.parseInt(serialNumber, 10));

            if (!(p || q)) {
                throw new Error(`Adapter with serial number ${serialNumber} does not exist.`);
            }

            const sn = p ? serialNumber : Number.parseInt(serialNumber, 10);

            grabbedAdapters.set(sn, foundAdapters.get(serialNumber));
            return foundAdapters.get(sn);
        }

        // Grab an adapter that has not been used before
        let availableAdapter = null;

        if (serialNumbers.some(sn => {
            if (![...grabbedAdapters.keys()].includes(sn)) {
                availableAdapter = foundAdapters.get(sn);
                grabbedAdapters.set(sn, foundAdapters.get(sn));
                return true;
            }

            return false;
        })) {
            return availableAdapter;
        }

        return null;
    };

    const selectedAdapter = adapterToUse();

    if (selectedAdapter == null) {
        throw new Error('No adapter up for grabs.');
    }

    const softDeviceParams = determineSoftDeviceParameters(selectedAdapter.serialNumber);

    const skipSetupDevice = options && options.programDevice === false;

    if (!skipSetupDevice) {
        await setupDevice(selectedAdapter, FirmwareRegistry.getDeviceSetup());

        // nRF51 requires a ~250ms wait time before it can be opened
        if (softDeviceParams.sdVersion === 'v2') {
            await new Promise(resolve => setTimeout(resolve, 250));
        }
    }

    return {
        serialNumber: selectedAdapter.serialNumber,
        port: selectedAdapter.serialport.comName,
        apiVersion: softDeviceParams.sdVersion,
        baudRate: softDeviceParams.baudRate,
    };
}

/**
 * Release a previously grabbed adapter.
 *
 * The adapter is removed from the list of grabbed adapters and the UART connection to the adapter is closed.
 *
 * @param {string} serialNumber Serial number of device to release, if not provided and only one adapter has been grabbed, release the one. If not reject.
 * @returns {Promise<serialNumber>} Resolved promise with released adapter if OK, rejected if not
 */
async function releaseAdapter(serialNumber) {
    if (!grabbedAdapters || grabbedAdapters.length === 0) {
        throw new Error('No adapters in adapter pool to release.');
    }

    if (!serialNumber && grabbedAdapters.length > 1) {
        throw new Error('More than one adapter is grabbed. Not able to determine which one to release.');
    }

    let adapterToReleaseSn = serialNumber;
    let adapterToRelease;

    if (!serialNumber) {
        adapterToReleaseSn = [...grabbedAdapters.keys()][0];
        adapterToRelease = grabbedAdapters.get(adapterToReleaseSn);
    } else {
        adapterToRelease = grabbedAdapters.get(serialNumber);

        if (!adapterToRelease) {
            throw new Error(`Adapter serial number ${serialNumber} is not in the list of grabbed adapters.`);
        }
    }

    grabbedAdapters.delete(adapterToReleaseSn);

    return new Promise((resolve, reject) => {
        debug(`Closing adapter ${adapterToReleaseSn}.`);
        adapterToRelease.close(closeError => {
            if (closeError) {
                reject(error);
                return;
            }

            debug(`Closed adapter ${adapterToReleaseSn}.`);
            resolve(adapterToReleaseSn);
        });
    });
}

/**
 * Grab an available adapter.
 *
 * @param {(string|undefined)} requestedSerialNumber Specific adapter to grab, if undefined, the function picks one that is not registered as grabbed from before
 * @param {Object} options to use when grabbing the adapter. Attribute setupDevice: false will prevent programming or checking if the right firmware is on the device.
 * @returns {Promise<Adapter>} An opened adapter ready to use
 */
async function grabAdapter(requestedSerialNumber = undefined, options = undefined) {
    const { port, serialNumber, apiVersion, baudRate } = await _grabAdapter(requestedSerialNumber, options);
    const adapter = adapterFactory.createAdapter(apiVersion, port, serialNumber);

    adapter.on('error', err => error(`[${serialNumber}] Adapter error ${err.message}`));

    // Update the grabbed adapter value to be an instance of Adapter and not Device from nrf-device-lister
    grabbedAdapters.set(serialNumber, adapter);

    return new Promise((resolve, reject) => {
        debug(`Opening adapter ${serialNumber}.`);
        adapter.open({ baudRate }, err => {
            if (err) {
                reject(new Error(`Error opening adapter ${serialNumber}: ${err}.`));
                return;
            }

            debug(`Opened adapter ${serialNumber}.`);
            resolve(adapter);
        });
    });
}

/**
 * Await outcome of an array of promises
 *
 * @param {Array<Promise>} futureOutcomes An array of Promises to resolve
 * @param {number} timeout Milliseconds to wait before outcome is regarded as timed out
 * @param {string} description Description of failed outcome.
 * @returns {Promise<any>} An array of the promises.
 */
async function outcome(futureOutcomes, timeout, description) {
    let timeoutId = null;
    let result;
    const t = timeout || testTimeout;

    try {
        result = await Promise.race([
            Promise.all(futureOutcomes),
            new Promise((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error(`Test timed out after ${t} ms. ${description || ''}`)), t);
            })]);
    } catch (outcomeError) {
        throw outcomeError;
    } finally {
        clearTimeout(timeoutId);
    }

    return result;
}

function addAdapterListener(adapter, prefix) {
    const logPrefix = `[${prefix}-${adapter.state.address}/${adapter.state.addressType}]`;

    adapter.on('logMessage', (severity, message) => { log(`${logPrefix} logMessage: ${message}`); });
    adapter.on('status', status => { log(`${logPrefix} status: ${JSON.stringify(status, null, 1)}`); });
    adapter.on('error', err => {
        error(`${logPrefix} error: ${JSON.stringify(err, null, 1)}`);
    });

    adapter.on('deviceConnected', device => { log(`${logPrefix} deviceConnected: ${device.address}`); });
    adapter.on('deviceDisconnected', device => { log(`${logPrefix} deviceDisconnected: ${JSON.stringify(device, null, 1)}`); });
    adapter.on('deviceDiscovered', device => { log(`${logPrefix} deviceDiscovered: ${JSON.stringify(device)}`); });
}

/**
 * Setup adapter with logging, name to advertise with and device address to
 * @param {Adapter} adapter Adapter to setup
 * @param {string} prefix Log prefix to use for this adapter
 * @param {string} name Name to set in SoftDevice for this device
 * @param {string} address Bluetooth Low Energy address to set for this device. Format is XX:XX:XX:XX:XX:XX
 * @param {string} addressType Bluetooth Log Energy address type to set for this device.
 * @returns {Promise<Adapter>} Adapter that has been setup. Same as the adapter provided as in argument.
 */
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
    grabAdapter,
    releaseAdapter,
    setupAdapter,
    outcome,
};
