'use strict';

var  Adapter = require('./adapter');
const EventEmitter = require('events');

const adapterUpdateInterval = 5000;

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
        // TODO: Add DI to AdapterFactory? driver path / or module import stuff
        super();
        this._bleDriver = bleDriver;
        this._adapters = {};
        this._updateAdapterList();
        this.updateAdapterListInterval = setInterval(this._updateAdapterList.bind(this), adapterUpdateInterval);
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
        const instanceId = this._getInstanceId(adapter);
        const parsedAdapter = new Adapter(this._bleDriver, instanceId, adapter.comName);

        return parsedAdapter;
    }

    _updateAdapterList(callback) {
        this._bleDriver.get_adapters((err, adapters) => {
            if (err) {
                this.emit('error', err);
                if (callback && (typeof callback === 'function')) {
                    callback(error);
                }
                return;
            }
            
            const removedAdapters = Object.assign({}, this._adapters);

            for(let adapter of adapters) {
                const adapterInstanceId = this._getInstanceId(adapter);

                if (this._adapters[adapterInstanceId]) {
                    delete removedAdapters[adapterInstanceId];
                }

                const newAdapter = this._parseAndCreateAdapter(adapter);

                if(this._adapters[adapterInstanceId] === undefined) {
                    this._adapters[adapterInstanceId] = newAdapter;
                    this.emit('added', newAdapter);
                }
            }

            for(let adapter in removedAdapters) {
                delete this._adapters[adapter.instanceId];
                this.emit('removed', adapter);
            };
            if (callback && (typeof callback === 'function')) {
                callback(undefined, this._adapters);
            }
        });
    }

    /**
     * @brief Get Nordic BLE adapters connected to the computer
     */
    getAdapters() {
        return this._adapters;
    }
    asyncGetAdapters(callback) {
        this._updateAdapterList((error, adapters) => {
            if (error) {
                callback(error);
            } else {
                callback(undefined, adapters);
            }
        });
    }
}

module.exports = AdapterFactory;
