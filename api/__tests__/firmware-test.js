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

jest.mock('os', () => ({}));

const os = require('os');
const path = require('path');
const getFirmwarePath = require('../firmware').getFirmwarePath;

const hexDir = path.join('pc-ble-driver', 'hex');

describe('getFirmwarePath', () => {
    it('throws error if unknown family was supplied', () => {
        expect(() => getFirmwarePath('foobar')).toThrowError('Unknown family: foobar. Expected one of ' +
            '["nrf51","nrf52"]');
    });

    it('returns v2/115k2 hex path for nrf51 and darwin', () => {
        os.platform = () => 'darwin';
        const firmwarePath = getFirmwarePath('nrf51');
        const expectedPath = path.join(hexDir, 'sd_api_v2', 'connectivity_1.1.0_115k2_with_s130_2.0.1.hex');
        expect(firmwarePath).toEqual(expect.stringContaining(expectedPath));
    });

    it('returns v3/115k2 hex path for nrf52 and darwin', () => {
        os.platform = () => 'darwin';
        const firmwarePath = getFirmwarePath('nrf52');
        const expectedPath = path.join(hexDir, 'sd_api_v3', 'connectivity_1.1.0_115k2_with_s132_3.0.hex');
        expect(firmwarePath).toEqual(expect.stringContaining(expectedPath));
    });

    it('returns v2/1m hex path for nrf51 and linux', () => {
        os.platform = () => 'linux';
        const firmwarePath = getFirmwarePath('nrf51');
        const expectedPath = path.join(hexDir, 'sd_api_v2', 'connectivity_1.1.0_1m_with_s130_2.0.1.hex');
        expect(firmwarePath).toEqual(expect.stringContaining(expectedPath));
    });

    it('returns v3/1m hex path for nrf52 and linux', () => {
        os.platform = () => 'linux';
        const firmwarePath = getFirmwarePath('nrf52');
        const expectedPath = path.join(hexDir, 'sd_api_v3', 'connectivity_1.1.0_1m_with_s132_3.0.hex');
        expect(firmwarePath).toEqual(expect.stringContaining(expectedPath));
    });

    it('returns v2/1m hex path for nrf51 and win32', () => {
        os.platform = () => 'win32';
        const firmwarePath = getFirmwarePath('nrf51');
        const expectedPath = path.join(hexDir, 'sd_api_v2', 'connectivity_1.1.0_1m_with_s130_2.0.1.hex');
        expect(firmwarePath).toEqual(expect.stringContaining(expectedPath));
    });

    it('returns v3/1m hex path for nrf52 and win32', () => {
        os.platform = () => 'win32';
        const firmwarePath = getFirmwarePath('nrf52');
        const expectedPath = path.join(hexDir, 'sd_api_v3', 'connectivity_1.1.0_1m_with_s132_3.0.hex');
        expect(firmwarePath).toEqual(expect.stringContaining(expectedPath));
    });
});
