'use strict';

var  Adapter = require('./adapter');
const EventEmitter = require('events');

/**
 * @brief A factory that instantiates new Adapters
 *
 * @param err undefined if not error
 * @param callback callback
 * @class AdapterFactory
 */
class AdapterFactory extends EventEmitter {
    /**
     * AdapterFactory constructor
     * @constructor
     */
    constructor(bleDriver) {
        // TODO: Should adapters be updated on this.getAdapters call or by time interval? time interval
        super();
        this._bleDriver = bleDriver;
        this._adapters = {};
        this._updateAdapterList();
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
        const parsedAdapter = new Adapter(this._bleDriver, instanceId, adapter.comName);

        return parsedAdapter;
    }

    _updateAdapterList(callback) {
        this._bleDriver.get_adapters((err, adapters) => {
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
                    this._setUpListenersForAdapterOpenAndClose
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
            this.emit('AdapterOpened', adapter);
        });
        adapter.on('closed', (adapter) => {
            this.emit('AdapterClosed', adapter);
        })
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
