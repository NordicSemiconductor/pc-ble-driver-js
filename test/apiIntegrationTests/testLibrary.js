'use strict';

const driver = require('../../index.js').driver;
const adapterFactory = require('../../api/adapterFactory.js');
var adapterFactoryInstance = new adapterFactory(driver);
class TestLibrary {
    getAdapters() {
        return new Promise((resolve, reject) => {
            adapterFactoryInstance.getAdapters((error, adapters) => {
                if (error) {
                    console.log('Failed to get adapters.');
                    reject(error);
                } else {
                    resolve(adapters);
                }
            });
        });
    }

    openAdapter(adapterId) {
        return new Promise( (resolve, reject) => {
            this.getAdapters().then( (adapters) => {
                const options = {'baudRate': 115200, 'parity': 'none', 'flowControl': 'none',
                                 'eventInterval': 1,'logLevel': 'trace',
                };
                const adapter = adapters[adapterId];
                if (!adapter) {
                    reject('No adapter connected with adapter id ' + adapterId);
                }

                adapter.open(options, (err) => {
                    if (err) {
                        console.log('Failed to open adapter ' + adapterId + ': ' + err);
                        reject(err);
                    }

                    this._adapter = adapter;
                    resolve();
                });
            });
        });
    }

    listAdvertisingPeripherals() {
        return new Promise((resolve, reject) => {
            const scanParameters = {
                'active': true, 'interval': 100, 'window': 50, 'timeout': 20
            };
            let foundDevices = [];
            const advertisingListener = (device)=> {
                if (!foundDevices.find((seenDevice) => seenDevice.address === device.address)) {
                    foundDevices.push(device);
                    console.log(device.name + ' ' + device.address);
                }

            };

            this._adapter.on('deviceDiscovered', advertisingListener);
            this._adapter.startScan(scanParameters, () => {
                console.log('started scan');
                setTimeout(() => {
                    this._adapter.removeListener('deviceDiscovered', advertisingListener);
                    resolve();
                }, 10000);

            });
        });
    }

    connectToPeripheral(address) {
        return new Promise((resolve, reject) => {
            var connectionParameters = {
                min_conn_interval: 7.5, max_conn_interval: 7.5, slave_latency: 0, conn_sup_timeout: 4000,
            };
            const addr = {address: address, type: 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC'};
            const scanParameters = {
                active: true, interval: 100, window: 50, timeout: 20,
            };
            const options = {scanParams: scanParameters, connParams: connectionParameters};
            this._adapter.once('deviceConnected', (device) => {
                resolve(device);
            });
            this._adapter.connect(addr, options, (error) => {
                if (error) {
                    reject(error);
                }

                console.log('Connecting to device at '  + address + '...');
            });
        });
    }

    disconnect(deviceInstanceId) {
        return new Promise((resolve, reject) => {
            this._adapter.disconnect(deviceInstanceId, (error, device) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(device);
                }
            });
        });
    }

    cancelConnect() {
        return new Promise((resolve, reject) => {
            this._adapter.cancelConnect((error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    getServices(deviceInstanceId) {
        return new Promise((resolve, reject) => {
            this._adapter.getServices(deviceInstanceId, (err, services) => {
                if (err) {
                    reject('Failed to get services: ', err);
                } else {
                    //console.log(JSON.stringify(services));
                    resolve(services);
                }
            });
        });

    }

    getCharacteristics(serviceInstanceId) {
        return new Promise((resolve, reject) => {
            this._adapter.getCharacteristics(serviceInstanceId, (error, characteristics) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(characteristics);
                }
            });
        });
    }

    getDescriptors(characteristicInstanceId) {
        return new Promise((resolve, reject) => {
            this._adapter.getDescriptors(characteristicInstanceId, (error, descriptors) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(descriptors);
                }
            });
        });
    }

    closeAdapter() {
        return new Promise((resolve, reject)=> {
            this._adapter.close((error) => {
                if (!error) {
                    resolve();
                } else {
                    reject(error);
                }
            });
        });
    }

    openAdapterAndConnectToPeripheral(adapterId, peripheralAddress) {
        return new Promise((resolve, reject) => {
            this.openAdapter(adapterId)
            .then(this.connectToPeripheral.bind(this, peripheralAddress))
            .then((device) => {
                resolve(device);
            })
            .catch((error) => {
                console.log('Connect to device failed: ', error);
                reject(error);
            });
        });
    }

}
const singletonContainer = {
    _testLibInstance: null,
    get testLibrary() {
        if (!this._testLibInstance) {
            this._testLibInstance = new TestLibrary();
        }

        return this._testLibInstance;
    },
};
module.exports = {
    testLibrary: TestLibrary,
    singletonContainer: singletonContainer,
};
