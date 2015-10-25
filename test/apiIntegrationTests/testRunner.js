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
    .command('connect', 'Connect to a BLE peripheral. Requires --adapter, --peripheral')
    .command('list-adapters', 'List connected boards')
    .command('discover-peripherals', 'List advertising BLE peripherals in the vicinity. Default scan time is 10 seconds.')
    .command('run-tests', 'Run the integration test suite. Requires --adapter and --peripheral')
    .string('adapter')
    .string('peripheral-address')
    .argv
;


class TestLibrary {
    getAdapters(callback) {
        return adapterFactoryInstance.asyncGetAdapters(callback);
    }

    openAdapter(adapterId, callback) {
        this.getAdapters((error, adapters) => {
            const options = {'baudRate': 115200, 'parity': 'none', 'flowControl': 'none',
                             'eventInterval': 1,'logLevel': 'trace',
            };
            const adapter = adapters[adapterId];
            if (!adapter) {
                callback('No adapter connected with adapter id ' + adapterId);
            }
            adapter.open(options, (err) => {
                if (err) {
                    console.log('Failed to open adapter ' + adapterId + ': ' + err);
                    callback(err);
                }
                this._adapter = adapter;
                callback();
            });
        });
    }

    listAdvertisingPeripherals(callback) {
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
            setTimeout(()=>{
                this._adapter.removeListener('deviceDiscovered', advertisingListener);
                callback();
        }, 10000);

        });
    }
    connectToPeripheral(address, callback) {
        var connectionParameters = {
            min_conn_interval: 7.5, max_conn_interval: 7.5, slave_latency: 0, conn_sup_timeout: 4000
        };
        const addr = {address: address, type: "BLE_GAP_ADDR_TYPE_RANDOM_STATIC"};
        const scanParameters = {
            'active': true, 'interval': 100, 'window': 50, 'timeout': 20
        };
        const options = {scanParams: scanParameters, connParams: connectionParameters};
        this._adapter.once('deviceConnected', (device) => {
            callback();
        });
        this._adapter.connect(addr, options, (error) =>{
            if (error) {
                console.log(error);
            }
            console.log('Connecting to device at '  + address + '...');
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
            const adapterId = argv['adapter'];
            const peripheralAddress = argv['peripheral-address'];
            testLib.openAdapter(adapterId, (error) => {
                testLib.connectToPeripheral(peripheralAddress, (error) => {
                    if (!error) {
                        console.log('Connected to device at ' + peripheralAddress);
                        process.exit(0);
                    } else {
                        console.log('failed ', error);
                        process.exit(1);
                    }
                });
            });
            break;
        case 'list-adapters':
            console.log('Connected adapters: ');
            testLib.getAdapters((error, adapters) => {
                Object.keys(adapters).forEach((adapterKey, index) =>{
                    console.log(index + '. ' + adapterKey);
                });

                process.exit(0);
            });
            break;
        case 'discover-peripherals':
        {
            const adapterId = argv['adapter'];
            if (!adapterId) {
                throw new Error('Missing argument --adapter.');
            }
            console.log('Opening adapter ' + adapterId + '...');
            testLib.openAdapter(adapterId, (error) => {
                if (error) {
                    console.log('Failed to connect to adapter: ' + error);
                    process.exit(1);
                }
                console.log('Successfully opened adapter ' + adapterId);
                testLib.listAdvertisingPeripherals(() =>{
                    testLib.closeAdapter().then((error)=>{
                        console.log('closed adapter');
                        process.exit(0);
                    });
                });
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
        }
    }

}
