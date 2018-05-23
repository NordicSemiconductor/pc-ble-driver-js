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

const FirmwareUpdater = require('../firmwareUpdater');

describe('FirmwareUpdater.constructor', () => {
    it('throws error if programmer instance does not implement the required functions', () => {
        const programmer = {};
        expect(() => new FirmwareUpdater(programmer))
            .toThrowError(/does not implement all the required functions/);
    });

    it('does not throw error if programmer instance implements the required functions', () => {
        const programmer = {
            read: () => {},
            getDeviceInfo: () => {},
            program: () => {},
        };
        expect(() => new FirmwareUpdater(programmer))
            .not.toThrowError();
    });
});

describe('FirmwareUpdater.parseVersionStruct', () => {
    it('returns empty object if version struct is empty', () => {
        const versionInfo = FirmwareUpdater.parseVersionStruct([]);
        expect(versionInfo).toEqual({});
    });

    it('returns empty object if version struct does not contain magic', () => {
        const versionInfo = FirmwareUpdater.parseVersionStruct([0, 2, 3, 4]);
        expect(versionInfo).toEqual({});
    });

    it('returns empty object if version struct contains magic but has length < 24', () => {
        const struct = [
            23, 165, 216, 70, // magic
            2,                // struct version
            255, 255, 255,    // (reserved for future use)
            0, 0, 0, 0,       // revision hash
            1,                // version major
            1,                // version minor
            0,                // version patch
            255,              // (reserved for future use)
            3,                // softdevice ble api number
            1,                // transport type
            255, 255,         // (reserved for future use)
            64, 66, 15,       // baud rate
        ];
        const versionInfo = FirmwareUpdater.parseVersionStruct(struct);
        expect(versionInfo).toEqual({});
    });

    it('returns correct version, softdevice version, transport type, and baud rate', () => {
        const struct = [
            23, 165, 216, 70, // magic
            2,                // struct version
            255, 255, 255,    // (reserved for future use)
            0, 0, 0, 0,       // revision hash
            0,                // version major
            1,                // version minor
            2,                // version patch
            255,              // (reserved for future use)
            3,                // softdevice ble api number
            1,                // transport type
            255, 255,         // (reserved for future use)
            64, 66, 15, 0,    // baud rate
        ];
        const versionInfo = FirmwareUpdater.parseVersionStruct(struct);
        expect(versionInfo).toEqual({
            version: '0.1.2',
            sdBleApiVersion: 3,
            transportType: 1,
            baudRate: 1000000,
        });
    });
});

describe('FirmwareUpdater.getFirmwarePath', () => {
    it('throws error if unknown family was supplied', () => {
        expect(() => FirmwareUpdater.getFirmwarePath(-1, 'linux'))
            .toThrowError('Unsupported family: -1. Expected one of 0 or 1.');
    });

    it('returns v2/1m hex path for nrf51 and win32', () => {
        expect(FirmwareUpdater.getFirmwarePath(0, 'win32'))
            .toEqual(expect.stringMatching(/1m.*s130_2/));
    });

    it('returns v2/1m hex path for nrf51 and linux', () => {
        expect(FirmwareUpdater.getFirmwarePath(0, 'linux'))
            .toEqual(expect.stringMatching(/1m.*s130_2/));
    });

    it('returns v2/115k2 hex path for nrf51 and darwin', () => {
        expect(FirmwareUpdater.getFirmwarePath(0, 'darwin'))
            .toEqual(expect.stringMatching(/115k2.*s130_2/));
    });

    it('returns v3/1m hex path for nrf52 and win32', () => {
        expect(FirmwareUpdater.getFirmwarePath(1, 'win32'))
            .toEqual(expect.stringMatching(/1m.*s132_3/));
    });

    it('returns v3/1m hex path for nrf52 and linux', () => {
        expect(FirmwareUpdater.getFirmwarePath(1, 'linux'))
            .toEqual(expect.stringMatching(/1m.*s132_3/));
    });

    it('returns v3/115k2 hex path for nrf52 and darwin', () => {
        expect(FirmwareUpdater.getFirmwarePath(1, 'darwin'))
            .toEqual(expect.stringMatching(/115k2.*s132_3/));
    });
});

describe('FirmwareUpdater.getLatestVersion', () => {
    it('throws error if unknown family was supplied', () => {
        expect(() => FirmwareUpdater.getLatestVersion(-1, 'linux'))
            .toThrowError('Unsupported family: -1. Expected one of 0 or 1.');
    });

    it('returns latest version for nrf51 and linux', () => {
        const firmwarePath = FirmwareUpdater.getFirmwarePath(0, 'linux');
        const latestVersion = FirmwareUpdater.getLatestVersion(0, 'linux');
        expect(firmwarePath).toEqual(expect.stringContaining(`_${latestVersion}_`));
    });
});

describe('FirmwareUpdater.getBaudRate', () => {
    it('throws error if unknown family was supplied', () => {
        expect(() => FirmwareUpdater.getBaudRate(-1, 'linux'))
            .toThrowError('Unsupported family: -1. Expected one of 0 or 1.');
    });

    it('returns 1m for nrf51 and win32', () => {
        expect(FirmwareUpdater.getBaudRate(0, 'win32')).toEqual(1000000);
    });

    it('returns 1m for nrf51 and linux', () => {
        expect(FirmwareUpdater.getBaudRate(0, 'linux')).toEqual(1000000);
    });

    it('returns 115k2 for nrf51 and darwin', () => {
        expect(FirmwareUpdater.getBaudRate(0, 'darwin')).toEqual(115200);
    });

    it('returns 1m for nrf52 and win32', () => {
        expect(FirmwareUpdater.getBaudRate(1, 'win32')).toEqual(1000000);
    });

    it('returns 1m for nrf52 and linux', () => {
        expect(FirmwareUpdater.getBaudRate(1, 'linux')).toEqual(1000000);
    });

    it('returns 115k2 for nrf52 and darwin', () => {
        expect(FirmwareUpdater.getBaudRate(1, 'darwin')).toEqual(115200);
    });
});
