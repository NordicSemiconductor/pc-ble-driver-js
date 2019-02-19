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

// Milliseconds wait before terminating test.
// In worst case programming of two devices needs to be done + the tests shall run.
const JEST_TIMEOUT_FOR_SETUP_OF_DEVICE = 40000;
jest.setTimeout(JEST_TIMEOUT_FOR_SETUP_OF_DEVICE);

const adapterFactory = api.AdapterFactory.getInstance(undefined, { enablePolling: false });
const serviceFactory = new api.ServiceFactory();

const testTimeout = 2000;

const debug = require('debug')('ble-driver:test');
const log = require('debug')('ble-driver:log');
const error = require('debug')('ble-driver:error');
const statusLog = require('debug')('ble-driver:status');

const DeviceLister = require('nrf-device-lister');
const { setupDevice } = require('nrf-device-setup');
const { FirmwareRegistry } = require('../index');

const deviceLister = new DeviceLister({
    usb: false,
    nordicUsb: true,
    seggerUsb: false,
    serialport: true,
    nordicDfu: true,
    jlink: true,
});
const grabbedAdapters = new Map();

deviceLister.on('error', err => {
    if (err.usb) {
        const usbAddr = `${err.usb.busNumber}.${err.usb.deviceAddress}`;

        let message = `Error while probing usb device at bus.address ${usbAddr}: ${err.message}. `;

        if (process.platform === 'linux') {
            message += 'Please check your udev rules concerning permissions for USB devices, see ' +
                'https://github.com/NordicSemiconductor/nrf-udev';
        } else if (process.platform === 'win32') {
            message += 'Please check that a libusb-compatible kernel driver is bound to this device.';
        }

        error(message);
    } else if (err.serialport &&
        err.message.includes('Could not fetch serial number for serial port at')) {
        // Explicitly hide errors about serial ports without serial numbers
        error(err.message);
    } else {
        debug(`Error while probing devices: ${error.message}`);
    }
});

function getAdapters() {
    return deviceLister.reenumerate()
        .then(adapters => {
            const result = new Map();

            // Only pick adapters we are able to program
            adapters.forEach((adapter, serialNumber) => {
                const { traits, serialport } = adapter;
                const add = traits
                    && (traits.includes('jlink') || traits.includes('nordicDfu')
                        || (traits.includes('serialport')
                            && serialport.vendorId === '1915'
                            && serialport.productId.toUpperCase() === '521F')
                    );

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

    let firmware;
    let family;

    if (seggerSerialNumber.test(serialNumber)) {
        const developmentKit = parseInt(seggerSerialNumber.exec(serialNumber)[1], 10);

        switch (developmentKit) {
            case 0:
            case 1:
                family = 'nrf51';
                break;
            case 2:
            case 3:
                family = 'nrf52';
                break;
            default:
                throw new Error(`Unsupported nRF5 development kit. [${serialNumber}]`);
        }

        firmware = FirmwareRegistry.getJlinkConnectivityFirmware(family);
    } else if (gravitonDongleSerialNumber.test(serialNumber)) {
        firmware = FirmwareRegistry.getNordicUsbConnectivityFirmware();
    } else {
        throw new Error(`Not able to determine version of pc-ble-driver to use for device with serial number ${serialNumber}.`);
    }

    params.baudRate = firmware.baudRate;
    params.sdVersion = `v${firmware.sdBleApiVersion}`;
    params.family = family;

    return params;
}

/**
 * Filter adapters to use in tests
 *
 * @param {Array<String>} serialNumbers Serial numbers of available devices
 * @param {GrabAdapterOptions} [options] filter options.
 * @returns {Array<string>} Filtered array with serial numbers
 * @private
 */
function _filterAdapters(serialNumbers, options) {
    return serialNumbers.filter(sn => {
        if (options.blacklist) {
            if (options.blacklist.includes(sn)) {
                return false;
            }
        }

        if (options.family) {
            return determineSoftDeviceParameters(sn).family === options.family;
        }

        return true;
    });
}

/**
 * Grabs an adapter from the list of available adapters connected and programs it with the correct connectivity firmware.
 *
 * @param {string} [serialNumber] serial number of the device to program, picks an available one if not specified
 * @param {GrabAdapterOptions} [options] additional options.
 * @returns {Promise<any>} Promise with information about programmed firmware and device
 */
async function _grabAdapter(serialNumber, options) {
    const foundAdapters = await getAdapters();

    const adapterToUse = () => {
        const serialNumbers = _filterAdapters([...foundAdapters.keys()], options);

        if (serialNumber != null) {
            if (!serialNumbers.includes(serialNumber)) {
                throw new Error(`Adapter with serial number ${serialNumber} does not exist, or is filtered out.`);
            }

            grabbedAdapters.set(serialNumber, foundAdapters.get(serialNumber));
            return foundAdapters.get(serialNumber);
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

    if (options.programDevice) {
        const deviceFirmware = FirmwareRegistry.getDeviceSetup();

        Object.keys(deviceFirmware).forEach(key => {
            if (key === 'jprog') {
                Object.keys(deviceFirmware.jprog).forEach(family => {
                    // Replacing fwVersion validator to always return false, forcing programming of the device.
                    deviceFirmware.jprog[family].fwVersion.validator = () => false;
                });
            } else if (key === 'dfu') {
                Object.keys(deviceFirmware.dfu).forEach(deviceType => {
                    // Replacing version with '', forcing programming of the device.
                    deviceFirmware.dfu[deviceType].semver = '';
                });
            }
        });

        await setupDevice(selectedAdapter, deviceFirmware);

        if (softDeviceParams.sdVersion === 'v2') {
            // nRF51 requires a ~250ms wait time before it can be opened
            await new Promise(resolve => setTimeout(resolve, 250));
        } else {
            // nRF 52 requires a 216ms wait time before it can be opened
            await new Promise(resolve => setTimeout(resolve, 216));
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

function addAdapterListener(adapter, prefix) {
    const logPrefix = `[${prefix ? `${prefix}-` : ''}${adapter.state.address ? `${adapter.state.address}/${adapter.state.addressType}` : adapter.instanceId}]`;

    adapter.on('logMessage', (severity, message) => { log(`${logPrefix} logMessage: ${message}`); });
    adapter.on('status', status => { statusLog(`${logPrefix} status: ${JSON.stringify(status, null, 1)}`); });
    adapter.on('error', err => {
        error(`${logPrefix} error: ${JSON.stringify(err, null, 1)}`);
    });

    adapter.on('deviceConnected', device => { log(`${logPrefix} deviceConnected: ${device.address}`); });
    adapter.on('deviceDisconnected', device => { log(`${logPrefix} deviceDisconnected: ${JSON.stringify(device, null, 1)}`); });
    adapter.on('deviceDiscovered', device => { log(`${logPrefix} deviceDiscovered: ${JSON.stringify(device)}`); });
}

/**
 * Grab adapter options
 * @typedef {Object} GrabAdapterOptions
 * @param {boolean} [programDevice] set to false to not program the device before starting to use it
 * @param {string} [family] only use devices of a given family
 * @param {string} [blacklist] list of devices to not use in tests
 * @param {string} [logLevel] set log level that shall be used in pc-ble-driver. Can be "trace", "debug", "info", "error", "fatal".
 */

/**
 * Merge options from environment variables and options provided by developer.
 *
 * Options provided by developer wins over options provided from environment variables
 *
 * @param {GrabAdapterOptions} [options] to use when grabbing the adapter.
 * @returns {GrabAdapterOptions} New options object with information gathered from environment variables and options provided by developer.
 */
function mergeOptions(options) {
    const newOptions = Object.assign({}, options);

    if (!newOptions.logLevel) {
        newOptions.logLevel = process.env.BLE_DRIVER_TEST_LOGLEVEL || 'info';
    }

    if (!newOptions.programDevice) {
        newOptions.programDevice = process.env.BLE_DRIVER_TEST_SKIP_PROGRAMMING !== 'true';
    }

    if (newOptions.family == null && process.env.BLE_DRIVER_TEST_FAMILY) {
        newOptions.family = process.env.BLE_DRIVER_TEST_FAMILY;
    }

    if (newOptions.blacklist == null && process.env.BLE_DRIVER_TEST_BLACKLIST) {
        newOptions.blacklist = process.env.BLE_DRIVER_TEST_BLACKLIST.split(',');
    }

    return newOptions;
}

/**
 * Grab an available adapter.
 *
 * @param {string} [requestedSerialNumber] Specific adapter to grab, if undefined, the function picks one that is not registered as grabbed from before
 * @param {GrabAdapterOptions} [options] to use when grabbing the adapter.
 * @returns {Promise<Adapter>} An opened adapter ready to use
 */
async function grabAdapter(requestedSerialNumber, options) {
    const options_ = mergeOptions(options);

    const { port, serialNumber, apiVersion, baudRate } = await _grabAdapter(requestedSerialNumber, options_);
    const adapter = adapterFactory.createAdapter(apiVersion, port, serialNumber);
    addAdapterListener(adapter);

    adapter.on('error', err => error(`[${serialNumber}] Adapter error ${err.message}`));

    // Update the grabbed adapter value to be an instance of Adapter and not Device from nrf-device-lister
    grabbedAdapters.set(serialNumber, adapter);

    return new Promise((resolve, reject) => {
        debug(`Opening adapter ${serialNumber}.`);
        adapter.open({ baudRate, logLevel: options_.logLevel }, err => {
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
 * @param {number} [timeout] Milliseconds to wait before outcome is regarded as timed out
 * @param {string} [description] Description of failed outcome.
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
                timeoutId = setTimeout(
                    () => reject(new Error(`Test timed out after ${t} ms. ${description || ''}`)), t);
            })]);
    } catch (outcomeError) {
        throw outcomeError;
    } finally {
        clearTimeout(timeoutId);
    }

    return result;
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
        if (adapter == null) {
            reject(new Error('adapter argument not provided.'));
            return;
        }

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
