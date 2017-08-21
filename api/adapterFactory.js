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

const os = require('os');

const _bleDriverV2 = require('bindings')('pc-ble-driver-js-sd_api_v2');
const _bleDriverV3 = require('bindings')('pc-ble-driver-js-sd_api_v3');

const Adapter = require('./adapter');
const EventEmitter = require('events');

const _bleDrivers = { v2: _bleDriverV2, v3: _bleDriverV3 };
const _singleton = Symbol('Ensure that only one instance of AdapterFactory ever exists.');

/** @constant {number} Update interval, in milliseconds, at which PC shall be checked for new connected adapters. */
const UPDATE_INTERVAL_MS = 2000;

/**
 * Class that provides Adapters through the use of the pc-ble-driver AddOn and the internal `Adapter` class.
 */
class AdapterFactory extends EventEmitter {
    /**
     * Shall not be called by user. Called by the factory method `this.getInstance()`.
     *
     * @private
     * @constructor
     * @param {Symbol} singletonToken Symbol to ensure that only one instance of `AdapterFactory` ever exists.
     * @param {Object} bleDrivers Object mapping version to pc-ble-driver AddOn.
     */
    constructor(singletonToken, bleDrivers) {
        if (_singleton !== singletonToken) {
            throw new Error('Cannot instantiate AdapterFactory directly.');
        }

        super();
        this._bleDrivers = bleDrivers;
        this._adapters = {};

        // TODO: should adapters be updated on this.getAdapters call or on an interval? Time interval for now.
        this.updateInterval = setInterval(this._updateAdapterList.bind(this), UPDATE_INTERVAL_MS);
    }

    /**
     * Get the singleton `AdapterFactory` instance.
     *
     * @param {null|Object} bleDrivers Optional object mapping version to pc-ble-driver AddOn.
     * @returns {AdapterFactory} The singleton `AdapterFactory` instance.
     */
    static getInstance(bleDrivers) {
        bleDrivers = typeof bleDrivers !== 'undefined' ? bleDrivers : _bleDrivers;

        if (!this[_singleton]) {
            this[_singleton] = new AdapterFactory(_singleton, bleDrivers);
        }

        return this[_singleton];
    }

    // TODO: Better idea for adapter's instanceId?
    _getInstanceId(adapter) {
        let instanceId;

        if (adapter.serialNumber) {
            instanceId = adapter.serialNumber;
        } else if (adapter.comName) {
            instanceId = adapter.comName;
        } else {
            this.emit('error', 'Failed to get adapter\'s instanceId.');
        }

        return instanceId;
    }

    _parseAndCreateAdapter(adapter) {
        // TODO: How about moving id generation and equality check within adapter class?
        const instanceId = this._getInstanceId(adapter);

        let addOnAdapter;
        let selectedDriver;

        // TODO: get adapters from one driver
        // TODO: Figure out what device it is (nRF51 or nRF52). Perhaps serial number can be used?

        const seggerSerialNumber = /^.*68([0-3]{1})[0-9]{6}$/;

        if (seggerSerialNumber.test(instanceId)) {
            const developmentKit = parseInt(seggerSerialNumber.exec(instanceId)[1], 10);
            let sdVersion;

            switch (developmentKit) {
                case 0:
                case 1:
                    sdVersion = 'v2';
                    break;
                case 2:
                    sdVersion = 'v3';
                    break;
                case 3:
                    sdVersion = 'v3';
                    break;
                default:
                    throw new Error(`Unsupported nRF5 development kit. [${instanceId}]`);
            }

            selectedDriver = this._bleDrivers[sdVersion];
            addOnAdapter = new selectedDriver.Adapter();
        } else {
            throw new Error(`Not able to determine version of pc-ble-driver to use. [${instanceId}]`);
        }

        if (addOnAdapter === undefined) {
            throw new Error(`Missing argument adapter. [${instanceId}]`);
        }

        let notSupportedMessage;

        if ((os.platform() === 'darwin') && (adapter.manufacturer === 'MBED')) {
            notSupportedMessage = 'This adapter with mbed CMSIS firmware is currently not supported on OS X. Please visit www.nordicsemi.com/nRFConnectOSXfix for further instructions.';
        } else if ((os.platform() === 'darwin') && ((adapter.manufacturer === 'SEGGER'))) {
            notSupportedMessage = 'Note: Adapters with Segger JLink debug probe requires MSD to be disabled to function properly on OSX. Please visit www.nordicsemi.com/nRFConnectOSXfix for further instructions.';
        }

        return new Adapter(selectedDriver, addOnAdapter, instanceId, adapter.comName, adapter.serialNumber, notSupportedMessage);
    }

    _setUpListenersForAdapterOpenAndClose(adapter) {
        adapter.on('opened', _adapter => {
            this.emit('adapterOpened', _adapter);
        });
        adapter.on('closed', _adapter => {
            this.emit('adapterClosed', _adapter);
        });
    }

    // TODO: create a separate npm module that gets connected adapters and information about them
    _updateAdapterList(callback) {
        // for getting the adapters we just use pc-ble-driver AddOn v2
        this._bleDrivers.v2.getAdapters((err, adapters) => {
            const isCallback = callback && (typeof callback === 'function');

            if (err) {
                this.emit('error', err);
                if (isCallback) {
                    callback(err);
                }

                return;
            }

            const removedAdapters = Object.assign({}, this._adapters);
            for (const adapter of adapters) {
                const adapterInstanceId = this._getInstanceId(adapter);

                if (this._adapters[adapterInstanceId]) {
                    delete removedAdapters[adapterInstanceId];
                }

                try {
                    const newAdapter = this._parseAndCreateAdapter(adapter);

                    if (this._adapters[adapterInstanceId] === undefined) {
                        this._adapters[adapterInstanceId] = newAdapter;
                        this._setUpListenersForAdapterOpenAndClose(newAdapter);
                        this.emit('added', newAdapter);
                    }
                } catch (error) {
                    this.emit('error', error);
                }
            }

            Object.keys(removedAdapters).forEach(adapterId => {
                const removedAdapter = this._adapters[adapterId];
                removedAdapter.removeAllListeners('opened');
                delete this._adapters[adapterId];
                this.emit('removed', removedAdapter);
            });

            if (isCallback) {
                callback(undefined, this._adapters);
            }
        });
    }

    /**
     * Get connected adapters.
     *
     * @param {null|function} callback Optional callback signature: (err, adapters) => {}.
     * @returns {void}
     */
    getAdapters(callback) {
        this._updateAdapterList((err, adapters) => {
            const isCallback = callback && (typeof callback === 'function');

            if (err) {
                this.emit('error', err);
                if (isCallback) {
                    callback(err);
                }

                return;
            }

            if (isCallback) {
                callback(undefined, adapters);
            }
        });
    }
}

module.exports = AdapterFactory;
