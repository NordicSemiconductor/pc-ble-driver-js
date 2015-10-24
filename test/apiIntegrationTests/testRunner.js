'use strict';

//TODO: 
// -Use promises to chain actions
// -Create action library, (connect, disconnect) traits: can run, has prerequisites, can fail, common interface
// /Should be able to put actions in separate files. Two kinds of actions: tests, or usable actions
var driver = require('../../index.js').driver;
var adapterFactory = require('../../api/adapterFactory.js');
var adapterFactoryInstance = new adapterFactory(driver);
const assert = require('assert');

var argv = require('yargs')
    .command('connect', 'Connect to a BLE peripheral. Requires --adapter, --peripheral')
    .command('list-adapters', 'List connected boards')
    .command('discover-peripherals', 'List advertising BLE peripherals in the vicinity. Default scan time is 10 seconds.')
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
                    process.exit(0);
                });
            });
            break;
        }
    }

}
/*
console.log('BLE API test suite');
console.log('Press 1 to list adapters');


process.stdin.on('keypress', (ch, key) => {
    if (key && key.ctrl && key.name == 'c') {
        process.stdin.pause();
        return;
    }
    if(ch) {
        switch(ch) {
            case '1':
                let adapterNames = testLib.getAdapterNames();
                for (let i = 1; i <= adapterNames.length; i++) {
                    console.log( i + '.' + adapterNames[i - 1]);
                }
            break;

        }
    }

});
/*
const connectToAdapter = (nextFun) => {
    console.log('Connecting to adapter..');
    if (nextFun) {
        nextFun();
    }
};

const selectPeripheralToConnectTo = (nextFun) => {
    console.log('Connecting to peripheral');
    if (nextFun) {
        nextFun();
    }
};

*/