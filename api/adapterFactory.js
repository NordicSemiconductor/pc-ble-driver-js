
import Adapter from './adapter';

// TODO: fix pc-ble-driver-js import
import bleDriver from 'pc-ble-driver-js';

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
    constructor() {
        this._adapters = {};
    }

    /**
     * @brief Get Nordic BLE adapters connected to the computer
     *
     * @param err
     * @param k [description]
     */
    // Callback signature function(adapters[])

    _findInstanceId(adapter) {
        // TODO: Better idea?
        if (adapter.serialNumber) {
            return adapter.serialNumber;
        }

        if (adapter.comName) {
            return adapter.comName;
        }

        this.emit('error', 'Failed to calculate adapter instanceId');
    }

    _parseAndCreateAdapter(adapter) {
        let instanceId = this._findInstanceId(adapter);
        let parsedAdapter = new Adapter(instanceId, adapter.comName);

        return parsedAdapter;
    }

    getAdapters(callback) {
        bleDriver.get_adapters((err, adapters) => {
            if (err) {
                this.emit('error', err);
            }

            let removedAdapters = Object.assign({}, this._adapters);

            adapters.forEach(adapter => {
                let adapterInstanceId = this._findInstanceId(adapter);

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
}
