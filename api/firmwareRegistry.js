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

const fs = require('fs');
const path = require('path');
const arrayToInt = require('./util/intArrayConv').arrayToInt;

const currentDir = require.resolve('./firmwareRegistry');
const hexDir = path.join(currentDir, '..', '..', 'pc-ble-driver', 'hex');
const sdV2Dir = path.join(hexDir, 'sd_api_v2');
const sdV3Dir = path.join(hexDir, 'sd_api_v3');

const VERSION_INFO_MAGIC = 0x46D8A517;
const VERSION_INFO_START = 0x20000;
const VERSION_INFO_LENGTH = 24;

const firmwareMap = {
    nrf51: {
        win32: path.join(sdV2Dir, 'connectivity_1.2.2_1m_with_s130_2.0.1.hex'),
        linux: path.join(sdV2Dir, 'connectivity_1.2.2_1m_with_s130_2.0.1.hex'),
        darwin: path.join(sdV2Dir, 'connectivity_1.2.2_115k2_with_s130_2.0.1.hex'),
    },
    nrf52: {
        win32: path.join(sdV3Dir, 'connectivity_1.2.2_1m_with_s132_3.0.hex'),
        linux: path.join(sdV3Dir, 'connectivity_1.2.2_1m_with_s132_3.0.hex'),
        darwin: path.join(sdV3Dir, 'connectivity_1.2.2_115k2_with_s132_3.0.hex'),
    },
};

function getFirmwarePath(family, platform) {
    if (!firmwareMap[family]) {
        throw new Error(`Unsupported family: ${family}. Expected one ` +
            `of ${JSON.stringify(Object.keys(firmwareMap))}`);
    }
    if (!firmwareMap[family][platform]) {
        throw new Error(`Unsupported platform: ${platform}. Expected one ` +
            `of ${JSON.stringify(Object.keys(firmwareMap[family]))}`);
    }
    return firmwareMap[family][platform];
}

function getFirmwareVersion(family, platform) {
    const firmwarePath = getFirmwarePath(family, platform);
    return path.basename(firmwarePath).split('_')[1];
}

function getBaudRate(family, platform) {
    const firmwarePath = getFirmwarePath(family, platform);
    const firmwareFile = path.basename(firmwarePath);
    if (firmwareFile.includes('_1m_')) {
        return 1000000;
    } else if (firmwareFile.includes('_115k2_')) {
        return 115200;
    }
    throw new Error('Unable to determine baud rate from file name ' +
        `${firmwareFile}`);
}

function getSoftDeviceVersion(family, platform) {
    const firmwarePath = getFirmwarePath(family, platform);
    if (firmwarePath.includes(sdV2Dir)) {
        return 'v2';
    }
    return 'v3';
}

class FirmwareRegistry {

    /**
     * Returns information about the connectivity firmware that is included in the
     * current version of this library. The connectivity firmware and its properties
     * depends on device family and platform (OS).
     *
     * @param {String} family Device family. One of 'nrf51' or 'nrf52'.
     * @param {String} platform Platform (OS). One of 'win32', 'linux', 'darwin'.
     * @returns {{path: string, version: string, baudRate: number, sdBleApiVersion: string}}
     *    Object containing the path to the firmware hex file, the firmware version, the
     *    baud rate to use with the firmware, and the SoftDevice API version.
     */
    static getFirmware(family, platform) {
        return {
            path: getFirmwarePath(family, platform),
            version: getFirmwareVersion(family, platform),
            baudRate: getBaudRate(family, platform),
            sdBleApiVersion: getSoftDeviceVersion(family, platform),
        };
    }

    /**
     * Get the firmware hex as a string.
     *
     * @param {String} family Device family. One of 'nrf51' or 'nrf52'.
     * @param {String} platform Platform (OS). One of 'win32', 'linux', 'darwin'.
     * @throws {Error} Throws error if unsupported family or platform.
     * @returns {String} Firmware hex string.
     */
    static getFirmwareAsString(family, platform) {
        const firmwarePath = getFirmwarePath(family, platform);
        return fs.readFileSync(firmwarePath, { encoding: 'utf8' });
    }

    /**
     * Parse the version info struct that can be found in the connectivity
     * firmware. See the connectivity firmware patch in pc-ble-driver/hex/sd_api_v*
     * for details.
     *
     * @param {Number[]} versionStruct Array of integers from the firmware.
     * @returns {Object} Parsed version info struct as an object.
     */
    static parseVersionStruct(versionStruct) {
        const magic = arrayToInt(versionStruct.slice(0, 4));
        const isValid = versionStruct.length === VERSION_INFO_LENGTH
            && magic === VERSION_INFO_MAGIC;
        if (!isValid) {
            return {};
        }
        const major = versionStruct[12];
        const minor = versionStruct[13];
        const patch = versionStruct[14];
        const version = `${major}.${minor}.${patch}`;
        const sdBleApiVersion = versionStruct[16];
        const transportType = versionStruct[17];
        const baudRate = arrayToInt(versionStruct.slice(20, 24));
        return {
            version,
            sdBleApiVersion,
            transportType,
            baudRate,
        };
    }

    /**
     * Get the magic number that is located at `getStructStartAddress()` in every
     * connectivity firmware.
     *
     * @returns {Number} The magic number that exists in every conn. firmware.
     */
    static getStructMagic() {
        return VERSION_INFO_MAGIC;
    }

    /**
     * Get the start address of the struct inside the firmware, containing meta
     * information about the firmware (e.g. version, baud rate, etc.).
     *
     * @returns {Number} Start address of the struct.
     */
    static getStructStartAddress() {
        return VERSION_INFO_START;
    }

    /**
     * Get the length of the struct inside the firmware, containing meta information
     * about the firmware (e.g. version, baud rate, etc.).
     *
     * @returns {Number} Length of the struct.
     */
    static getStructLength() {
        return VERSION_INFO_LENGTH;
    }
}

module.exports = FirmwareRegistry;
