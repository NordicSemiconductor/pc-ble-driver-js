'use strict';

var  Adapter = require('./adapter');
const EventEmitter = require('events');

var _ = require('underscore');
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
        this.updateAdapterListInterval = setInterval(this._updateAdapterList, 5000);
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
        let instanceId = this._getInstanceId(adapter);
        let parsedAdapter = new Adapter(this._bleDriver, instanceId, adapter.comName);

        return parsedAdapter;
    }

    _updateAdapterList() {
        this._bleDriver.get_adapters((err, adapters) => {
            if (err) {
                this.emit('error', err);
            }

            let removedAdapters = Object.assign({}, this._adapters);

            _.each(adapters, adapter => {
                let adapterInstanceId = this._getInstanceId(adapter);

                if (this._adapters[adapterInstanceId]) {
                    delete removedAdapters[adapterInstanceId];
                }

                let newAdapter = this._parseAndCreateAdapter(adapter);
                this._adapters[adapterInstanceId] = newAdapter;
                this.emit('added', newAdapter);
            });

            _.each(removedAdapters, adapter => {
                this.emit('removed', adapter);
            });
        });
    }

    /**
     * @brief Get Nordic BLE adapters connected to the computer
     *
     * @param err
     * @param k [description]
     */
    // Callback signature function(adapters[])
    getAdapters(callback) {
        return this._adapters;
    }
}

module.exports = AdapterFactory;
