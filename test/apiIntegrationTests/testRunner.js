'use strict';

//TODO:
// -Use promises to chain actions
// -Create action library, (connect, disconnect) traits: can run, has prerequisites, can fail, common interface
// /Should be able to put actions in separate files. Two kinds of actions: tests, or usable actions

const Mocha = require('mocha');
const fs = require('fs');
const path = require('path');
const testLib = require('./testLibrary').singletonContainer.testLibrary;

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

let done = false;
for (let i = 0; i < argv._.length; i++) {
    switch (argv._[i]) {
        case 'connect':
        {
            const adapterId = argv.adapter;
            const peripheralAddress = argv['peripheral-address'];
            testLib.openAdapter(adapterId)
                .then(testLib.connectToPeripheral.bind(testLib, peripheralAddress))
                .then((device) => {
                    console.log('connected to device');
                    console.log(JSON.stringify(device.address));
                })
                .then(testLib.closeAdapter.bind(testLib))
                .then(() => {
                    process.exit(0);
                })
                .catch((error) => {
                    console.log('Connect to device failed: ', error);
                    process.exit(1);
                });
            break;
        }

        case 'list-adapters':
        {
            console.log('Connected adapters: ');
            testLib.getAdapters()
                .then((adapters) => {
                    Object.keys(adapters).forEach((adapterKey, index) => {
                        console.log(index + '. ' + adapterKey);
                    });
                })
                .then(() => {
                    done = true;//process.exit(0);
                })
                .catch((error) => {
                    console.log('list-adapters failed: ', error);
                    process.exit(1);
                });
            break;
        }

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
                .catch((error) => {
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
                .then(testLib.connectToPeripheral.bind(testLib, peripheralAddress))
                .then((device) => {
                    return testLib.getServices(device.instanceId);
                })
                .then((services) => {
                    for (let index in services) {
                        let service = services[index];
                        console.log('uuid: ' + service.uuid + ' startHandle: ' + service.startHandle);
                    }
                })
                .then(testLib.closeAdapter.bind(testLib))
                .then(() => {
                    process.exit(0);
                })
                .catch((error) => {
                    console.log('Connect to device failed: ', error);
                    process.exit(1);
                });
            break;
        }

        case 'start-advertising':
        {
            const adapterId = argv.adapter;
            if (!adapterId) {
                console.log('Missing argument --adapter.');
                process.exit(1);
            }

            testLib.openAdapter(adapterId)
                .then(testLib.startAdvertising.bind(testLib))
                .then(() => {
                    console.log('Starting advertising');
                })
                .catch(error => {
                    console.log('Start advertising failed: ', error);
                    process.exit(1);
                });
            break;
        }

        case 'run-tests':
        {
            // Run the tests, but open adapter first.
            // (A bug in the driver makes it possible to open the adapter only once)
            const adapterId = argv.adapter;
            const peripheralAddress = argv['peripheral-address'];
            const testFile = argv.test;
            const testFileName = 'test' + testFile + '.js';

            // Use process.env to pass peripheral-address to test
            process.env.testPeripheral = peripheralAddress;
            testLib.openAdapter(adapterId)
                .then(() => {
                    const mocha = new Mocha();
                    const testDir = __dirname;

                    fs.readdirSync(testDir).filter((file)=> {
                        return (file.substr(-3) === '.js') && file != __filename;
                    }).forEach((file) => {
                        if (testFile === undefined || file === testFileName)
                        {
                            mocha.addFile(
                                path.join(testDir, file)
                            );
                        }
                    });
                    mocha.run(function(failures) {
                        process.on('exit', function() {
                            process.exit(failures);
                        });

                        testLib.closeAdapter()
                            .then(() => {
                                process.exit(0);
                            });
                    });
                })
                .catch((error)=> {
                    console.log(error);
                    process.exit(0);
                });
            break;
        }
    }
}

(function wait() {
    if (!done) {
        setTimeout(wait, 500);
    }
})();
