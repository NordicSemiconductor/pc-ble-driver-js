/* Copyright (c) 2016 Nordic Semiconductor. All Rights Reserved.
 *
 * The information contained herein is property of Nordic Semiconductor ASA.
 * Terms and conditions of usage are described in detail in NORDIC
 * SEMICONDUCTOR STANDARD SOFTWARE LICENSE AGREEMENT.
 *
 * Licensees are granted free, non-transferable use of the information. NO
 * WARRANTY of ANY KIND is provided. This heading must NOT be removed from
 * the file.
 *
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

        if ((os.platform() === 'darwin') && ((adapter.manufacturer === 'SEGGER') || (adapter.manufacturer === 'MBED'))) {
            notSupportedMessage = 'This adapter with SEGGER debug probe or mbed CMSIS firmware is not supported on OS X. Please visit http://www.nordicsemi.no/nRFConnectOSXfix for further instructions.';
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
        adapter.on('opened', (adapter) => {
            this.emit('adapterOpened', adapter);
        });
        adapter.on('closed', (adapter) => {
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
