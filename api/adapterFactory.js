/*
 * Copyright (c) 2016 Nordic Semiconductor ASA
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 *   1. Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 *
 *   2. Redistributions in binary form must reproduce the above copyright notice, this
 *   list of conditions and the following disclaimer in the documentation and/or
 *   other materials provided with the distribution.
 *
 *   3. Neither the name of Nordic Semiconductor ASA nor the names of other
 *   contributors to this software may be used to endorse or promote products
 *   derived from this software without specific prior written permission.
 *
 *   4. This software must only be used in or with a processor manufactured by Nordic
 *   Semiconductor ASA, or in or with a processor manufactured by a third party that
 *   is used in combination with a processor manufactured by Nordic Semiconductor.
 *
 *   5. Any software provided in binary or object form under this license must not be
 *   reverse engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

const _bleDriver = require('bindings')('pc-ble-driver-js');
const os = require('os');

var  Adapter = require('./adapter');
const EventEmitter = require('events');

let _singleton = Symbol();

/** Constants that decides how often the PC shall be checked for new adapters */
const UPDATE_INTERVAL = 2000; // Update interval in seconds

/**
 * Class that provides Adapters through the use of pc-ble-driver AddOn
 * @class
 */

class AdapterFactory extends EventEmitter {
    /**
    * Constructor that shall not be used by developer.
    * @private
    */
    constructor(singletonToken, bleDriver) {
        if (_singleton !== singletonToken)
            throw new Error('Cannot instantiate directly.');

        // TODO: Should adapters be updated on this.getAdapters call or by time interval? time interval
        super();
        this._bleDriver = bleDriver;
        this._adapters = {};
        this.updateInterval = setInterval(this._updateAdapterList.bind(this), UPDATE_INTERVAL);
    }

    /**
     * Get the AdapterFactory instance.
     *
     * This is a singleton class that uses the pc-ble-driver-js AddOn to get devices.
     */
    static getInstance(bleDriver) {
        if (bleDriver === undefined)
            bleDriver = _bleDriver;

        if (!this[_singleton])
            this[_singleton] = new AdapterFactory(_singleton, bleDriver);

        return this[_singleton];
    }

    /**
     * @private
     */
    _getInstanceId(adapter) {
        // TODO: Better idea?
        if (adapter.serialNumber) {
            return adapter.serialNumber;
        }

        if (adapter.comName) {
            return adapter.comName;
        }

        this.emit('error', 'Failed to get adapter instanceId');
    }

    _parseAndCreateAdapter(adapter) {
        // How about moving id generation and equality check within adapter class?
        const instanceId = this._getInstanceId(adapter);
        const addOnAdapter = new this._bleDriver.Adapter();

        if (addOnAdapter === undefined) { throw new Error('Missing argument adapter.'); }

        let notSupportedMessage;

        if ((os.platform() === 'darwin') && (adapter.manufacturer === 'MBED')) {
            notSupportedMessage = 'This adapter with mbed CMSIS firmware is currently not supported on OS X. Please visit www.nordicsemi.com/nRFConnectOSXfix for further instructions.';
        } else if ((os.platform() === 'darwin') && ((adapter.manufacturer === 'SEGGER'))) {
            notSupportedMessage = 'Note: Adapters with Segger JLink debug probe requires MSD to be disabled to function properly on OSX. Please visit www.nordicsemi.com/nRFConnectOSXfix for further instructions.';
        }

        const parsedAdapter = new Adapter(this._bleDriver, addOnAdapter, instanceId, adapter.comName, adapter.serialNumber, notSupportedMessage);
        return parsedAdapter;
    }

    _updateAdapterList(callback) {
        this._bleDriver.getAdapters((err, adapters) => {
            if (err) {
                this.emit('error', err);
                if (callback && (typeof callback === 'function')) {
                    callback(err);
                }

                return;
            }

            const removedAdapters = Object.assign({}, this._adapters);

            for (let adapter of adapters) {
                const adapterInstanceId = this._getInstanceId(adapter);

                if (this._adapters[adapterInstanceId]) {
                    delete removedAdapters[adapterInstanceId];
                }

                const newAdapter = this._parseAndCreateAdapter(adapter);

                if (this._adapters[adapterInstanceId] === undefined) {
                    this._adapters[adapterInstanceId] = newAdapter;
                    this._setUpListenersForAdapterOpenAndClose(newAdapter);
                    this.emit('added', newAdapter);
                }
            }

            for (let adapterId in removedAdapters) {
                const removedAdapter = this._adapters[adapterId];
                removedAdapter.removeAllListeners('opened');
                delete this._adapters[adapterId];
                this.emit('removed', removedAdapter);
            }

            if (callback && (typeof callback === 'function')) {
                callback(undefined, this._adapters);
            }
        });
    }

    _setUpListenersForAdapterOpenAndClose(adapter) {
        adapter.on('opened', adapter => {
            this.emit('adapterOpened', adapter);
        });
        adapter.on('closed', adapter => {
            this.emit('adapterClosed', adapter);
        });
    }

    getAdapters(callback) {
        this._updateAdapterList((error, adapters) => {
            if (error) {
                callback(error);
            } else {
                if (callback && (typeof callback === 'function')) callback(undefined, adapters);
            }
        });
    }
}

module.exports = AdapterFactory;
