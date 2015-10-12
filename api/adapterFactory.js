
import Adapter from './adapter';

/**
 * @brief A factory that instantiates new Adapters
 *
 * @param err undefined if not error
 * @param callback callback
 * @class AdapterFactory
 */
class AdapterFactory extends events.EventEmitter {
    /**
     * AdapterFactory constructor
     * @constructor
     */
    constructor(bleDriver) {
        // TODO: Should adapters be updated on this.getAdapters call or by time interval? time interval
        // TODO: Add DI to AdapterFactory? driver path / or module import stuff
        this._adapters = {};

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
        let parsedAdapter = new Adapter(instanceId, adapter.comName);

        return parsedAdapter;
    }

    _updateAdapterList() {
        bleDriver.get_adapters((err, adapters) => {
            if (err) {
                this.emit('error', err);
            }

            let removedAdapters = Object.assign({}, this._adapters);

            adapters.forEach(adapter => {
                let adapterInstanceId = this._getInstanceId(adapter);

                if (this._adapters[adapterInstanceId]) {
                    delete removedAdapters[adapterInstanceId];
                }

                let newAdapter = this._parseAndCreateAdapter(adapter);
                this._adapters[adapterInstanceId] = newAdapter;
                this.emit('added', newAdapter);
            });

            removedAdapters.forEach(adapter => {
                this.emit('removed', adapter);
            });

            callback(this._adapters);
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
