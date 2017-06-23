/* Copyright (c) 2010 - 2017, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Use in source and binary forms, redistribution in binary form only, with
 * or without modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions in binary form, except as embedded into a Nordic
 *    Semiconductor ASA integrated circuit in a product or a software update for
 *    such product, must reproduce the above copyright notice, this list of
 *    conditions and the following disclaimer in the documentation and/or other
 *    materials provided with the distribution.
 *
 * 2. Neither the name of Nordic Semiconductor ASA nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 *
 * 3. This software, with or without modification, must only be used with a Nordic
 *    Semiconductor ASA integrated circuit.
 *
 * 4. Any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

const spawnSync = require('child_process').spawnSync;
const adapterFactory = require('../setup').adapterFactory;
const Dfu = require('../../api/dfu');
const getAddressFromFICR = require('../getAddress').getAddressFromFICR;


/*
 * CONSTANTS
 */

const DFU_MAX_COMPLETION_TIME = 120000; // 2 minutes

const NRF_FAMILY = {
    0: 'NRF51',
    1: 'NRF52',
};

const CONNECTIVITY_HEX_FILES = {
    0: './pc-ble-driver/hex/sd_api_v2/connectivity_1.1.0_1m_with_s130_2.0.1.hex',
    1: './pc-ble-driver/hex/sd_api_v3/connectivity_1.1.0_1m_with_s132_3.0.hex',
};

const DFU_BOOTLOADER_HEX_FILES = {
    0: './test/dfu/secure_dfu_secure_dfu_ble_s130_pca10028_debug.hex',
    1: './test/dfu/secure_dfu_secure_dfu_ble_s132_pca10040_debug.hex',
};

const DFU_ZIP_FILES = {
    0: './test/dfu/dfu_test_app_hrm_s130.zip',
    1: './test/dfu/dfu_test_app_hrm_s132.zip',
};


/*
 * TESTS
 */

describe('DFU module', () => {

    it('reads manifest from zip file', () => {
        return getManifest(DFU_ZIP_FILES[0]).then(manifest => {
            expect(manifest).toEqual({
                "application": {
                    "bin_file": "nrf51422_xxac.bin",
                    "dat_file": "nrf51422_xxac.dat"
                }
            });
        });
    });

    it('reads addresses from available adapters', () => {
        return getAdapterInfo()
            .then(adapterInfo => {
                if (adapterInfo.adapters.length === 0) {
                    throw Error('No available adapters');
                }

                adapterInfo.adapters.forEach((adapter, index) => {
                    const address = adapterInfo.addresses[index];
                    expect(address).toBeDefined();
                    expect(address.length).toEqual(17);
                });
            });
    });

    /*
     * NOTE: There is a bug (core dump) when closing adapter, which makes the
     *       tests below fail at the last step. Because of this, we are skipping
     *       these by default. To enable, replace "it.skip" with "it".
     */

    it.skip('opens an adapter and closes it without error', () => {
        return getAdapterInfo()
            .then(adapterInfo => {
                const adapter = adapterInfo.adapters[0];
                return Promise.resolve()
                    .then(() => openAdapter(adapter))
                    .then(() => closeAdapter(adapter));
            });
    });

    it.skip('performs a complete DFU, given 2 available adapters', () => {

        return getAdapterInfo()
            .then(adapterInfo => {
                const centralAdapter = adapterInfo.adapters[0];
                const peripheralAdapter = adapterInfo.adapters[1];
                const centralFamily = adapterInfo.families[0];
                const peripheralFamily = adapterInfo.families[1];
                const centralAddress = adapterInfo.addresses[0];
                const peripheralAddress = adapterInfo.addresses[1];

                console.log(`Found 2 adapters. Central: ${NRF_FAMILY[centralFamily]}, ` +
                    `peripheral: ${NRF_FAMILY[peripheralFamily]}`);

                const connectivityHexFile = CONNECTIVITY_HEX_FILES[centralFamily];
                const dfuBootloaderHexFile = DFU_BOOTLOADER_HEX_FILES[peripheralFamily];
                const dfuZipFile = DFU_ZIP_FILES[peripheralFamily];

                console.log(`Found files to use. Central: ${connectivityHexFile}, ` +
                    `peripheral: ${dfuBootloaderHexFile}, dfuZip: ${dfuZipFile}`);

                const transportParameters = {
                    adapter: centralAdapter,
                    targetAddress: peripheralAddress,
                    targetAddressType: 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC',
                };

                centralAdapter.on('error', error => console.log(error));

                return Promise.resolve()
                    .then(() => programAdapter(centralAdapter, centralFamily, connectivityHexFile))
                    .then(() => programAdapter(peripheralAdapter, peripheralFamily, dfuBootloaderHexFile))
                    .then(() => openAdapter(centralAdapter))
                    .then(() => performDfu(dfuZipFile, transportParameters))
                    .then(() => closeAdapter(centralAdapter));
            });

    }, DFU_MAX_COMPLETION_TIME);
});


/*
 * HELPER FUNCTIONS
 */

function getManifest(zipFilePath) {
    return new Promise((resolve, reject) => {
        const dfu = new Dfu('BLE', {});
        dfu.getManifest(zipFilePath, (error, manifest) => {
            error ? reject(error) : resolve(manifest);
        });
    });
}

function performDfu(dfuZipFile, transportParameters) {
    return new Promise((resolve, reject) => {
        const dfu = new Dfu('BLE', transportParameters);

        dfu.on('logMessage', (severity, message) => console.log(message));
        dfu.on('transferStart', fileName => console.log('Sending file:', fileName));
        dfu.on('transferComplete', fileName => console.log('Completed file:', fileName));

        dfu.performDFU(dfuZipFile, (error, abort) => {
            if (error || abort) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
}

function getAdapters() {
    return new Promise((resolve, reject) => {
        adapterFactory.getAdapters((error, adapters) => {
            if (error) {
                reject(error);
            } else if (Object.keys(adapters).length !== 2) {
                reject('The number of attached devices to computer must be exactly 2');
            } else {
                resolve([adapters[Object.keys(adapters)[0]], adapters[Object.keys(adapters)[1]]]);
            }
        });
    });
}

// FIXME: This can be refactored into something less ugly,
//        not hard coded for two and only two adapters.
// NOTE: nrfjprog must be used sequentially for not to crash.
function getAdapterInfo() {
    let adapters = [];
    let families = [];
    let addresses = [];
    return getAdapters()
      .then(a => adapters = a)
      // Info from adapter 0
      .then(() => getDeviceFamily(getSerialNumber(adapters[0])))
      .then(family => families[0] = family)
      .then(() => getAddress(getSerialNumber(adapters[0])))
      .then(address => addresses[0] = address)
      // Info from adapter 1
      .then(() => getDeviceFamily(getSerialNumber(adapters[1])))
      .then(family => families[1] = family)
      .then(() => getAddress(getSerialNumber(adapters[1])))
      .then(address => addresses[1] = address)
      // Format return value
      .then(() => ({adapters, families, addresses}));
}

function getSerialNumber(adapter) {
    return parseInt(adapter.state.serialNumber, 10);
}

function getAddress(serialNumber) {
    return getAddressFromFICR(serialNumber, true);
}

function openAdapter(adapter) {
    return new Promise((resolve, reject) => {
        const options = {
            baudRate: 1000000,
            parity: 'none',
            flowControl: 'none',
            enableBLE: false,
            eventInterval: 0,
        };

        adapter.open(options, error => {
            if (error) {
                reject(error);
            } else {
                adapter.enableBLE(null, error => {
                    error ? reject(error) : resolve();
                });
            }
        });
    });
}

function closeAdapter(adapter) {
    return new Promise((resolve, reject) => {
        adapter.close(error => {
            error ? reject(error) : resolve();
        });
    });
}

function programAdapter(adapter, family, hexFile) {
    const serialNumber = getSerialNumber(adapter);
    const familyString = NRF_FAMILY[family];
    return Promise.resolve()
        .then(() => nrfjprogCmd(['-f', familyString, '-s', serialNumber, '-e']))
        .then(() => nrfjprogCmd(['-f', familyString, '-s', serialNumber, '--program', hexFile]))
        .then(() => nrfjprogCmd(['-f', familyString, '-s', serialNumber, '-r']));
}

function getDeviceFamily(serialNumber) {
    return new Promise((resolve, reject) => {
        // Trying to read the cpu registers to see which family succeeds.
        nrfjprogCmd(['--readregs', '-f', 'NRF51', '-s', serialNumber])
            .then(() => resolve(0))
            .catch(() => {
                nrfjprogCmd(['--readregs', '-f', 'NRF52', '-s', serialNumber])
                    .then(resolve(1))
                    .catch(() => {
                        reject(`Unable to find device family for ${serialNumber}`);
                    });
            });
    });
}

function nrfjprogCmd(args) {
    console.log('Running: nrfjprog', args.join(' '));
    const result = spawnSync('nrfjprog', args);
    if (result.status === 0) {
        return Promise.resolve();
    } else {
        return Promise.reject(result.stderr.toString());
    }
}
