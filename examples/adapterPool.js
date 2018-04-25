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

const DeviceLister = require('nrf-device-lister');
const { setupDevice } = require('nrf-device-setup');
const fs = require('fs');
const path = require('path');

const traits = {
    usb: false,
    nordicUsb: true,
    seggerUsb: false,
    serialport: true,
    nordicDfu: true,
    jlink: true,
};

const VERSION_INFO_MAGIC = [0x46, 0xd8, 0xa5, 0x17];
const VERSION_INFO_LENGTH = 24;
const VERSION_INFO_START = 0x20000;

class AdapterPool {
    constructor() {
        this.deviceListener = new DeviceLister(traits);
        this.deviceListener.on('error', () => {
        });
        this.grabbedAdapters = [];
    }

    getAdapters() {
        return new Promise((resolve, reject) => {
            this.deviceListener.reenumerate()
                .then(adapters => {
                    // Only pick adapters we are able to program
                    adapters.forEach((adapter, serialNumber) => {
                        const keep = adapter.traits
                            && (adapter.traits.includes('jlink') || adapter.traits.includes('nordicDfu'));

                        if (!keep) {
                            adapters.delete(serialNumber);
                        }
                    });

                    resolve(adapters);
                })
                .catch(reject);
        });
    }

    async grabAdapter(serialNumber) {
        const foundAdapters = await this.getAdapters();

        const compareFirmwareVersion = (provided, requested) => {
            /* eslint no-bitwise: "off" */
            const { major, minor, patch, apiVersion, transportType, baudRate } = requested;

            /* eslint no-sparse-arrays: "off" */
            const requestedArray = [
                ...VERSION_INFO_MAGIC, // Magic string in flash memory
                undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, // Irrelevant
                major, minor, patch,
                undefined,
                apiVersion,
                transportType,
                undefined, undefined, undefined, // Irrelevant
                 // Skip these
                (baudRate >> 8) & 0xff,
                (baudRate >> 16) & 0xff,
                (baudRate >> 24) & 0xff,
            ];

            return requestedArray.reduce((accumulated, value, idx) => {
                if (accumulated === false) return false; // Fast exist if previous value is false.
                if (value == null) return true; // If we do not care about the value, compare next
                return provided[idx] === value;
            }, true);
        };

        const determineSoftDeviceApiVersion = adapter => {
            if (!(adapter && adapter.serialport)) return null;

            /* eslint no-shadow: "off" */
            const { vendorId, productId, serialNumber } = adapter.serialport;
            let sdVersion = null;

            if (vendorId === '1915' && productId === 'C00A') {
                    // Nordic Semiconductor PCA10059 dongle
                sdVersion = 3;
            } else if (vendorId === '1366') {
                    // Segger JLink OB
                const seggerSerialNumber = /^.*68([0-3])[0-9]{6}$/;

                if (seggerSerialNumber.test(serialNumber)) {
                    const developmentKit = parseInt(seggerSerialNumber.exec(serialNumber)[1], 10);

                    switch (developmentKit) {
                        case 0:
                        case 1:
                            sdVersion = 2;
                            break;
                        case 2:
                            sdVersion = 3;
                            break;
                        case 3:
                            sdVersion = 3;
                            break;
                        default:
                            sdVersion = null;
                    }
                }
            }

            return sdVersion;
        };

        const adapterToUse = () => {
            const serialNumbers = [...foundAdapters.keys()];

            if (serialNumber != null) {
                if (!serialNumbers.has(serialNumber)) {
                    throw new Error(`Adapter with serial number ${serialNumber} does not exist.`);
                }

                this.grabbedAdapters.push(serialNumber);
                return foundAdapters.get(serialNumber);
            }

            // Grab an adapter that has not been used before
            let availableAdapter = null;

            if (serialNumbers.some(adapter => {
                if (!this.grabbedAdapters.includes(adapter)) {
                    this.grabbedAdapters.push(adapter);
                    availableAdapter = foundAdapters.get(adapter);
                    return true;
                }

                return false;
            })) {
                return availableAdapter;
            }

            return null;
        };

        const selectedAdapter = adapterToUse();

        if (selectedAdapter == null) {
            throw new Error('No adapter up for grabs.');
        }

        const sdApiVersion = determineSoftDeviceApiVersion(selectedAdapter);

        if (sdApiVersion == null) {
            throw new Error('Not able to determine SoftDevice API version to use.');
        }

        await setupDevice(
            selectedAdapter,
            {
                dfu: {
                    pca10059: {
                        application: fs.readFileSync(path.resolve(__dirname, '..', 'connfw.hex')),
                        softdevice: fs.readFileSync(path.resolve(__dirname, '..', 'softdevice.hex')),
                        semver: 'ble-connectivity 0.1.0',
                    },
                },
                jprog: {
                    nrf51: {
                        fw: path.resolve(__dirname, '..', 'pc-ble-driver', 'hex', 'sd_api_v2', 'connectivity_1.2.2_1m_with_s130_2.0.1.hex'),
                        fwVersion: {
                            length: VERSION_INFO_LENGTH,
                            validator: data => compareFirmwareVersion(data, {
                                major: 1,
                                minor: 2,
                                patch: 2,
                                apiVersion: 2,
                                transportType: 1,
                                baudRate: 1000000,
                            }),
                        },
                        fwIdAddress: VERSION_INFO_START,
                    },
                    nrf52: {
                        fw: path.resolve(__dirname, '..', 'pc-ble-driver', 'hex', 'sd_api_v3', 'connectivity_1.2.2_1m_with_s132_3.0.hex'),
                        fwVersion: {
                            length: VERSION_INFO_LENGTH,
                            validator: data => compareFirmwareVersion(data, {
                                major: 1,
                                minor: 2,
                                patch: 2,
                                apiVersion: 3,
                                transportType: 1,
                                baudRate: 1000000,
                            }),
                        },
                        fwIdAddress: VERSION_INFO_START,
                    },
                },
                needSerialport: true,
            },
        );

        return {
            port: selectedAdapter.serialport.comName,
            apiVersion: `v${sdApiVersion}`,
            serialNumber: selectedAdapter.serialNumber,
        };
    }
}

module.exports = { AdapterPool };

