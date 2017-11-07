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

const os = require('os');
const fs = require('fs');
const path = require('path');
const arrayToInt = require('./util/intArrayConv').arrayToInt;

const currentDir = require.resolve('./firmwareUpdater');
const hexDir = path.join(currentDir, '..', '..', 'pc-ble-driver', 'hex');
const sdV2Dir = path.join(hexDir, 'sd_api_v2');
const sdV3Dir = path.join(hexDir, 'sd_api_v3');

const VERSION_INFO_MAGIC = 0x46D8A517;
const VERSION_INFO_START = 0x20000;
const VERSION_INFO_LENGTH = 24;

const firmwareMap = {
    0: { // nrf51
        win32: path.join(sdV2Dir, 'connectivity_1.2.1_1m_with_s130_2.0.1.hex'),
        linux: path.join(sdV2Dir, 'connectivity_1.2.1_1m_with_s130_2.0.1.hex'),
        darwin: path.join(sdV2Dir, 'connectivity_1.2.1_115k2_with_s130_2.0.1.hex'),
    },
    1: { // nrf52
        win32: path.join(sdV3Dir, 'connectivity_1.2.1_1m_with_s132_3.0.hex'),
        linux: path.join(sdV3Dir, 'connectivity_1.2.1_1m_with_s132_3.0.hex'),
        darwin: path.join(sdV3Dir, 'connectivity_1.2.1_115k2_with_s132_3.0.hex'),
    },
};

class FirmwareUpdater {

    /**
     * Initialize the firmware updater with a programmer instance. The programmer
     * instance could be pc-nrfjprog-js or any other instance that implements the
     * read, getDeviceInfo, and program functions.
     *
     * @param {Object} programmer The programmer instance, e.g. pc-nrfjprog-js.
     */
    constructor(programmer) {
        if (!programmer.read || !programmer.getDeviceInfo || !programmer.program) {
            throw new Error('The argument passed to FirmwareUpdater does ' +
                'not implement all the required functions, i.e. "read", ' +
                '"getDeviceInfo", and "program".');
        }
        this._programmer = programmer;
    }

    /**
     * Get the latest connectivity firmware version for the given family and
     * platform.
     *
     * @param {number} family The devkit family: 0 = nrf51, 1 = nrf52.
     * @param {string} platform The OS platform. One of 'win32', 'linux', 'darwin'.
     * @throws {Error} Throws error if unsupported family or platform.
     * @returns {string} The latest 'major.minor.patch' version.
     */
    static getLatestVersion(family, platform) {
        const firmwarePath = FirmwareUpdater.getFirmwarePath(family, platform);
        return path.basename(firmwarePath).split('_')[1];
    }

    /**
     * Get the baud rate that is supported for the given family and platform.
     *
     * @param {number} family The devkit family: 0 = nrf51, 1 = nrf52.
     * @param {string} platform The OS platform. One of 'win32', 'linux', 'darwin'.
     * @throws {Error} Throws error if unsupported family or platform.
     * @returns {number} Baud rate.
     */
    static getBaudRate(family, platform) {
        const firmwarePath = FirmwareUpdater.getFirmwarePath(family, platform);
        const firmwareFile = path.basename(firmwarePath);
        if (firmwareFile.includes('_1m_')) {
            return 1000000;
        } else if (firmwareFile.includes('_115k2_')) {
            return 115200;
        }
        throw new Error('Unable to determine baud rate from file name ' +
            `${firmwareFile}`);
    }

    /**
     * Get path to the latest firmware file for the given family and platform.
     *
     * @param {number} family The devkit family: 0 = nrf51, 1 = nrf52.
     * @param {string} platform The OS platform. One of 'win32', 'linux', 'darwin'.
     * @throws {Error} Throws error if unsupported family or platform.
     * @returns {string} Absolute path to firmware file.
     */
    static getFirmwarePath(family, platform) {
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

    /**
     * Get the latest firmware hex as a string.
     *
     * @param {number} family The devkit family: 0 = nrf51, 1 = nrf52.
     * @param {string} platform The OS platform. One of 'win32', 'linux', 'darwin'.
     * @throws {Error} Throws error if unsupported family or platform.
     * @returns {string} Firmware hex string.
     */
    static getFirmwareString(family, platform) {
        const filePath = FirmwareUpdater.getFirmwarePath(family, platform);
        return fs.readFileSync(filePath, { encoding: 'utf8' });
    }

    /**
     * Parse the version info struct that can be found in the connectivity
     * firmware. See the connectivity firmware patch in pc-ble-driver/hex/sd_api_v*
     * for details.
     *
     * @param {number[]} versionStruct Array of integers from the firmware.
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

    _read(serialNumber, startAddress, length) {
        return new Promise((resolve, reject) => {
            this._programmer.read(serialNumber, startAddress, length, (err, content) => (
                err ? reject(err) : resolve(content)
            ));
        });
    }

    _getDeviceInfo(serialNumber) {
        return new Promise((resolve, reject) => {
            this._programmer.getDeviceInfo(serialNumber, (err, deviceInfo) => (
                err ? reject(err) : resolve(deviceInfo)
            ));
        });
    }

    _program(serialNumber, filePath, options) {
        return new Promise((resolve, reject) => {
            this._programmer.program(serialNumber, filePath, options, err => (
                err ? reject(err) : resolve()
            ));
        });
    }

    _createVersionInfo(serialNumber, family, platform) {
        return this._read(serialNumber, VERSION_INFO_START, VERSION_INFO_LENGTH)
            .then(versionStruct => {
                const info = FirmwareUpdater.parseVersionStruct(versionStruct);
                const isUpdateRequired =
                    info.version !== FirmwareUpdater.getLatestVersion(family, platform) ||
                    info.baudRate !== FirmwareUpdater.getBaudRate(family, platform);
                return Object.assign({}, info, { isUpdateRequired });
            });
    }

    /**
     * Get version info from the firmware for the given serial number. If no
     * connectivity firmware is present, then the returned object will only
     * contain isUpdateRequired = true. This will also be true if the version
     * is not the latest, or if the baud rate is not supported.
     *
     * <ul>
     * <li>{boolean} isUpdateRequired: True if firmware needs to be updated.</li>
     * <li>{string} version: The 'major.minor.patch' version for the firmware.</li>
     * <li>{number} sdBleApiVersion: The SoftDevice version.</li>
     * <li>{number} transportType: Transport type, 1 = UART_HCI.</li>
     * <li>{number} baudRate: UART transport baud rate.</li>
     * </ul>
     *
     * @param {number} serialNumber The serial number to get version info for.
     * @param {function(Error, Object)} callback Signature: (err, versionInfo) => {}.
     * @returns {void}
     */
    getVersionInfo(serialNumber, callback) {
        this._getDeviceInfo(serialNumber)
            .then(deviceInfo => this._createVersionInfo(serialNumber, deviceInfo.family, os.platform()))
            .then(versionInfo => callback(null, versionInfo))
            .catch(err => callback(new Error('Unable to get version info for ' +
                `${serialNumber}: ${err.message}`), null));
    }

    /**
     * Program the given serial number with the latest connectivity firmware. The
     * new version info object (ref. getVersionInfo) is returned through the callback.
     *
     * @param {number} serialNumber The serial number to program.
     * @param {function(Error, Object)} callback Signature: (err, versionInfo) => {}.
     * @see getVersionInfo
     * @returns {void}
     */
    update(serialNumber, callback) {
        this._getDeviceInfo(serialNumber)
            .then(deviceInfo => {
                const firmwareString = FirmwareUpdater.getFirmwareString(deviceInfo.family, os.platform());
                const INPUT_FORMAT_HEX_STRING = 1;
                return this._program(serialNumber, firmwareString, { inputFormat: INPUT_FORMAT_HEX_STRING })
                    .then(() => deviceInfo);
            })
            .then(deviceInfo => this._createVersionInfo(serialNumber, deviceInfo.family, os.platform()))
            .then(versionInfo => callback(null, versionInfo))
            .catch(err => callback(new Error('Unable to update firmware for ' +
                `${serialNumber}: ${err.message}`), null));
    }
}

module.exports = FirmwareUpdater;
