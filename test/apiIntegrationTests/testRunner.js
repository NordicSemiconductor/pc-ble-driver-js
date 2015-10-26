'use strict';

//TODO: 
// -Use promises to chain actions
// -Create action library, (connect, disconnect) traits: can run, has prerequisites, can fail, common interface
// /Should be able to put actions in separate files. Two kinds of actions: tests, or usable actions
const driver = require('../../index.js').driver;
const adapterFactory = require('../../api/adapterFactory.js');
const Mocha = require('mocha');
const fs = require('fs');
const path = require('path');


var adapterFactoryInstance = new adapterFactory(driver);
const assert = require('assert');

var argv = require('yargs')
    .command('list-adapters', 'List connected boards')
    .command('discover-peripherals', 'List advertising BLE peripherals in the vicinity. Default scan time is 10 seconds.')
    .command('connect', 'Connect to a BLE peripheral. Requires --adapter, --peripheral')
    .command('discover-services', 'Try to discover services of a device')
    .command('run-tests', 'Run the integration test suite. Requires --adapter and --peripheral')
    .string('adapter')
    .string('peripheral-address')
    .demand(1)
    .help('?')
    .argv
;


class TestLibrary {
    getAdapters() {
        return new Promise( (resolve, reject) => {
            adapterFactoryInstance.asyncGetAdapters((error, adapters) => {
                if (error) {
                    console.log("Failed to get adapters.");
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
        return new Promise((resolve, reject) =>{
            const scanParameters = {
                'active': true, 'interval': 100, 'window': 50, 'timeout': 20
            };
            let foundDevices = [];
            const advertisingListener = (device)=> {
                if(!foundDevices.find((seenDevice) => seenDevice.address === device.address)) {
                    foundDevices.push(device);
                    console.log(device.name + ' ' + device.address);
                }

            };
            this._adapter.on('deviceDiscovered', advertisingListener);
            this._adapter.startScan(scanParameters, () =>{
                console.log('started scan');
                setTimeout( () => {
                    this._adapter.removeListener('deviceDiscovered', advertisingListener);
                    resolve();
                }, 10000);

            });
        });
    }
    connectToPeripheral(address) {
        return new Promise( (resolve, reject) => {
            var connectionParameters = {
                min_conn_interval: 7.5, max_conn_interval: 7.5, slave_latency: 0, conn_sup_timeout: 4000
            };
            const addr = {address: address, type: "BLE_GAP_ADDR_TYPE_RANDOM_STATIC"};
            const scanParameters = {
                'active': true, 'interval': 100, 'window': 50, 'timeout': 20
            };
            const options = {scanParams: scanParameters, connParams: connectionParameters};
            this._adapter.once('deviceConnected', (device) => {
                resolve(device);
            });
            this._adapter.connect(addr, options, (error) =>{
                if (error) {
                    console.log(error);
                    reject(error);
                }
                console.log('Connecting to device at '  + address + '...');
            });
        });
    }
    getServices(deviceInstanceId) {
        return new Promise( (resolve, reject) => {
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
    closeAdapter(){
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
}

var testLib = new TestLibrary();

for(let i = 0; i < argv['_'].length; i++) {
    switch(argv._[i]) {
        case 'connect':
        {
            const adapterId = argv.adapter;
            const peripheralAddress = argv['peripheral-address'];
            testLib.openAdapter(adapterId)
                .then( testLib.connectToPeripheral.bind(testLib, peripheralAddress) )
                .then( (device) => {
                    console.log('connected to device');
                })
                .then(testLib.closeAdapter.bind(testLib))
                .then(() => { 
                    process.exit(0);
                })
                .catch( (error) => {
                    console.log('Connect to device failed: ', error);
                    process.exit(1);
                });
            break;
        }
        case 'list-adapters':
            console.log('Connected adapters: ');
            testLib.getAdapters()
                .then( (adapters) => {
                    Object.keys(adapters).forEach((adapterKey, index) =>{
                        console.log(index + '. ' + adapterKey);
                    });
                })
                .then(() => {
                    process.exit(0);
                })
                .catch( (error) => {
                    console.log('list-adapters failed: ', error);
                    process.exit(1);
                });
            break;
        case 'discover-peripherals':
        {
            const adapterId = argv.adapter;
            if (!adapterId) {
                console.log('Missing argument --adapter.');
                process.exit(1);
            }
            console.log('Opening adapter ' + adapterId + '...');
            testLib.openAdapter(adapterId)
                .then(testLib.listAdvertisingPeripherals.bind(testLib))
                .then(testLib.closeAdapter.bind(testLib))
                .then(() => {
                    console.log('Closed adapter');
                    process.exit(0);
                })
                .catch( (error) => {
                    console.log('discover-peripherals failed: ' + error);
                    process.exit(1);
                });
            break;
        }
        case 'discover-services': 
        {
            const adapterId = argv.adapter;
            const peripheralAddress = argv['peripheral-address'];
            testLib.openAdapter(adapterId)
                .then( testLib.connectToPeripheral.bind(testLib, peripheralAddress) )
                .then( (device) => {
                    return testLib.getServices(device.instanceId); 
                })
                .then( (services) => {
                    for (let index in services) {
                        let service = services[index];
                        console.log('uuid: ' + service.uuid + ' startHandle: ' + service.startHandle);
                    }
                })
                .then(testLib.closeAdapter.bind(testLib))
                .then(() => { 
                    process.exit(0);
                })
                .catch( (error) => {
                    console.log('Connect to device failed: ', error);
                    process.exit(1);
                });
            break;
        }
        case 'run-tests':
        {
            const mocha = new Mocha();

            const testDir = __dirname;

            // Add each .js file to the mocha instance
            fs.readdirSync(testDir).filter((file)=>{
                // Only keep the .js files
                return (file.substr(-3) === '.js') && file != __filename;

            }).forEach((file) => {
                mocha.addFile(
                    path.join(testDir, file)
                );
            });
            mocha.run(function(failures){
                process.on('exit', function () {
                    process.exit(failures);
                });
                process.exit(0);
            });
            break;
        }
    }

}
