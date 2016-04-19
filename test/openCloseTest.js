/* Copyright (c) 2016 Nordic Semiconductor. All Rights Reserved.
 *
 * The information contained herein is property of Nordic Semiconductor ASA.
 * Terms and conditions of usage are described in detail in NORDIC
 * SEMICONDUCTOR STANDARD SOFTWARE LICENSE AGREEMENT.
 *
 * Licensees are granted free, non-transferable use of the information. NO
 * WARRANTY of ANY KIND is provided. This heading must NOT be removed from
 * the file.
 *
 */

'use strict';

const assert = require('assert');

const setup = require('./setup');
const adapterFactory = setup.adapterFactory;
const driver = setup.driver;

const peripheralDeviceAddress = 'FF:11:22:33:AA:BE';
const peripheralDeviceAddressType = 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC';

const centralDeviceAddress = 'FF:11:22:33:AA:BF';
const centralDeviceAddressType = 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC';

function addAdapterFactoryListeners() {
    adapterFactory.on('added', adapter => {
        console.log(`onAdded: Adapter added. Adapter: ${adapter.instanceId}`);
    });

    adapterFactory.on('removed', adapter => {
        console.log(`onRemoved: Adapter removed. Adapter: ${adapter.instanceId}`);
    });

    adapterFactory.on('error', error => {
        console.log('onError: Error occured: ' + JSON.stringify(error, null, 1));
    });
}

function addAdapterListener(adapter, prefix) {
    adapter.on('logMessage', (severity, message) => { if (severity > 1) console.log(`${severity} ${prefix} logMessage: ${message}`)});
    adapter.on('status', status => { console.log(`${prefix} status: ${JSON.stringify(status, null, 1)}`); });
    adapter.on('error', error => {
        console.log(`${prefix} error: ${JSON.stringify(error, null, 1)}`);
        assert(false);
    });

    adapter.on('deviceDiscovered', device =>  {
        console.log(`${prefix} deviceDiscovered: ${device.address}`);
    });
}

function connect(adapter, connectToAddress, callback) {
    const options = {
        scanParams: {
            active: false,
            interval: 100,
            window: 50,
            timeout: 20,
        },
        connParams: {
            min_conn_interval: 7.5,
            max_conn_interval: 7.5,
            slave_latency: 0,
            conn_sup_timeout: 4000,
        },
    };

    adapter.connect(
        connectToAddress,
        options,
        error => {
            assert(!error);
            if (callback) callback();
        }
    );
}

function setupAdapter(adapter, name, address, addressType, callback) {
    adapter.open(
        {
            baudRate: 115200,
            parity: 'none',
            flowControl: 'none',
            enableBLE: false,
            eventInterval: 10,
        },
        error => {
            assert(!error);
            adapter.enableBLE(
                null,
                (error, params, app_ram_base) => {
                    assert(!error);
                    adapter.getState((error, state) => {
                        assert(!error);
                        adapter.setAddress(address, addressType, error => {
                            assert(!error);
                            adapter.setName(name, error => {
                                assert(!error);
                                if (callback) callback(adapter);
                            });
                        });
                    });
                }
            );
        }
    );
}

function tearDownAdapter(adapter, callback) {
    adapter.close(error => {
        assert(!error);
        if (callback) callback();
    });
}

function startScan(adapter, callback)
{
    const scanParameters = {
        active: true,
        interval: 100,
        window: 20,
        timeout: 4,
    };

    adapter.startScan(scanParameters, err => {
        assert(!err);
        if (callback) callback();
    });
}

function runTests(peripheralAdapter) {
    addAdapterListener(peripheralAdapter, '#PERIPHERAL');

    setInterval(() => {
        setupAdapter(peripheralAdapter, 'peripheralAdapter', peripheralDeviceAddress, peripheralDeviceAddressType, adapter => {
            startScan(adapter, () => {
                console.log('Scan started');
                setTimeout(() => {
                    adapter.stopScan(err => {
                        console.log('Scan stopped');
                        assert(!err);
                        tearDownAdapter(adapter);
                    });
                    // Let the scanning run for a time period
                }, 2000);
            });
        });
    }, 5000);
}

addAdapterFactoryListeners();

adapterFactory.getAdapters((error, adapters) => {
    assert(!error);
    runTests(adapters[Object.keys(adapters)[0]]);
});
