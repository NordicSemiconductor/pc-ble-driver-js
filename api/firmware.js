/* Copyright (c) 2016, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 *   1. Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 *
 *   2. Redistributions in binary form, except as embedded into a Nordic
 *   Semiconductor ASA integrated circuit in a product or a software update for
 *   such product, must reproduce the above copyright notice, this list of
 *   conditions and the following disclaimer in the documentation and/or other
 *   materials provided with the distribution.
 *
 *   3. Neither the name of Nordic Semiconductor ASA nor the names of its
 *   contributors may be used to endorse or promote products derived from this
 *   software without specific prior written permission.
 *
 *   4. This software, with or without modification, must only be used with a
 *   Nordic Semiconductor ASA integrated circuit.
 *
 *   5. Any software provided in binary form under this license must not be
 *   reverse engineered, decompiled, modified and/or disassembled.
 *
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
 * GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT
 * OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');

const currentDir = require.resolve('./firmware');
const hexDir = path.join(currentDir, '..', '..', 'pc-ble-driver', 'hex');
const sdV2Dir = path.join(hexDir, 'sd_api_v2');
const sdV3Dir = path.join(hexDir, 'sd_api_v3');

const firmwareMap = {
    nrf51: {
        '115k2': path.join(sdV2Dir, 'connectivity_1.1.0_115k2_with_s130_2.0.1.hex'),
        '1m': path.join(sdV2Dir, 'connectivity_1.1.0_1m_with_s130_2.0.1.hex'),
    },
    nrf52: {
        '115k2': path.join(sdV3Dir, 'connectivity_1.1.0_115k2_with_s132_3.0.hex'),
        '1m': path.join(sdV3Dir, 'connectivity_1.1.0_1m_with_s132_3.0.hex'),
    },
};

/**
 * Returns the absolute path to the connectivity hex file to use together with
 * the given devkit family. The kit must be programmed with this hex file before
 * opening the adapter.
 *
 * @param {string} family The devkit family; one of 'nrf51' or 'nrf52'.
 * @returns {string} Absolute path to firmware hex file.
 * @see getFirmwareString
 */
function getFirmwarePath(family) {
    if (!firmwareMap[family]) {
        throw new Error(`Unknown family: ${family}. Expected one ` +
            `of ${JSON.stringify(Object.keys(firmwareMap))}`);
    }
    return os.platform() === 'darwin' ?
        firmwareMap[family]['115k2'] :
        firmwareMap[family]['1m'];
}

/**
 * Returns the connectivity firmware for the given devkit family as a hex string.
 *
 * @param {string} family The devkit family; one of 'nrf51' or 'nrf52'.
 * @returns {string} Firmware hex string.
 * @see getFirmwarePath
 */
function getFirmwareString(family) {
    const filePath = getFirmwarePath(family);
    return fs.readFileSync(filePath, { encoding: 'utf8' });
}

module.exports = {
    getFirmwarePath,
    getFirmwareString,
};
