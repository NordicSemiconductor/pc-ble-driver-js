'use strict';

const _bleDriver = require('bindings')('pc-ble-driver-js');

var  Adapter = require('./adapter');
const EventEmitter = require('events');

/**
 * @brief A factory that instantiates new Adapters.
 *
 * @event added - A new adapter was connected
 * @event removed - A connected adapter was disconnected
 * @event adapterOpened - One of the connected adapters was opened.
 * @event adapterClosed - One of the connected adapters was closed
 *
 * @param err undefined if not error
 * @param callback callback
 * @class AdapterFactory
 */

let _singleton = Symbol();

const UPDATE_INTERVAL = 2000; // Update interval in seconds

class AdapterFactory extends EventEmitter {
    constructor(singletonToken, bleDriver) {
        if (_singleton !== singletonToken)
            throw new Error('Cannot instantiate directly.');

        // TODO: Should adapters be updated on this.getAdapters call or by time interval? time interval
        super();
        this._bleDriver = bleDriver;
        this._adapters = {};
        this.updateInterval = setInterval(this._updateAdapterList.bind(this), UPDATE_INTERVAL);
    }

    static getInstance(bleDriver) {
        if (bleDriver === undefined)
            bleDriver = _bleDriver;

        if (!this[_singleton])
            this[_singleton] = new AdapterFactory(_singleton, bleDriver);

        return this[_singleton];
    }

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
        const parsedAdapter = new Adapter(this._bleDriver, addOnAdapter, instanceId, adapter.comName);

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

    // It is convenient to get events when an adapter is 'available'
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
