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

const InitPacketState = require('../dfuModels').InitPacketState;
const FirmwareState = require('../dfuModels').FirmwareState;
const crc = require('crc');

describe('InitPacketState', () => {

    it('should throw error from constructor if data is larger than maximumSize', () => {
        const data = [1, 2, 3, 4, 5];
        const deviceState = {
            maximumSize: 4
        };

        expect(() => new InitPacketState(data, deviceState)).toThrow();
    });

    describe('when no data exists on device', () => {
        const data = [1, 2, 3];
        const deviceState = {
            offset: 0,
            crc32: 0,
            maximumSize: 4
        };
        const initPacketState = new InitPacketState(data, deviceState);

        it('should have zero offset', () => {
            expect(initPacketState.offset).toEqual(0);
        });

        it('should have zero crc32', () => {
            expect(initPacketState.crc32).toEqual(0);
        });

        it('should have all data as remaining', () => {
            expect(initPacketState.remainingData).toEqual(data);
        });

        it('should not have resumable partial object', () => {
            expect(initPacketState.hasResumablePartialObject).toEqual(false);
        });
    });

    describe('when data exists on device, but crc32 is invalid', () => {
        const data = [1, 2, 3];
        const offset = 2;
        const invalidCrc32 = crc.crc32(data.slice(0, offset)) + 1;
        const deviceState = {
            offset: offset,
            crc32: invalidCrc32,
            maximumSize: 4
        };
        const initPacketState = new InitPacketState(data, deviceState);

        it('should have zero offset', () => {
            expect(initPacketState.offset).toEqual(0);
        });

        it('should have zero crc32', () => {
            expect(initPacketState.crc32).toEqual(0);
        });

        it('should have all data as remaining', () => {
            expect(initPacketState.remainingData).toEqual(data);
        });

        it('should not have resumable partial object', () => {
            expect(initPacketState.hasResumablePartialObject).toEqual(false);
        });
    });

    describe('when data exists on device, and crc32 is valid', () => {
        const data = [1, 2, 3];
        const offset = 2;
        const deviceState = {
            offset: offset,
            crc32: crc.crc32(data.slice(0, offset)),
            maximumSize: 4
        };
        const initPacketState = new InitPacketState(data, deviceState);

        it('should have same offset as was returned from the device', () => {
            expect(initPacketState.offset).toEqual(deviceState.offset);
        });

        it('should have same crc32 value as was returned from device', () => {
            expect(initPacketState.crc32).toEqual(deviceState.crc32);
        });

        it('should have data after offset as remaining', () => {
            expect(initPacketState.remainingData).toEqual([3]);
        });

        it('should have resumable partial object', () => {
            expect(initPacketState.hasResumablePartialObject).toEqual(true);
        });
    });
});

describe('FirmwareState', () => {

    describe('when no data exists on device', () => {
        const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const deviceState = {
            offset: 0,
            crc32: 0,
            maximumSize: 4
        };
        const firmwareState = new FirmwareState(data, deviceState);

        it('should have zero offset', () => {
            expect(firmwareState.offset).toEqual(0);
        });

        it('should have zero crc32', () => {
            expect(firmwareState.crc32).toEqual(0);
        });

        it('should have all data as remaining objects according to maximumSize', () => {
            expect(firmwareState.remainingObjects).toEqual([[1, 2, 3, 4], [5, 6, 7, 8], [9, 10]]);
        });

        it('should have empty partial object', () => {
            expect(firmwareState.remainingPartialObject).toEqual([]);
        });

        it('should not have resumable partial object', () => {
            expect(firmwareState.hasResumablePartialObject).toEqual(false);
        });
    });

    describe('when offset is in the middle of partially transferred object, but crc32 is invalid', () => {
        const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const offset = 5;
        const invalidCrc32 = crc.crc32(data.slice(0, offset)) + 1;
        const deviceState = {
            offset: offset,
            crc32: invalidCrc32,
            maximumSize: 4
        };
        const firmwareState = new FirmwareState(data, deviceState);

        it('should have offset where the partial object starts', () => {
            expect(firmwareState.offset).toEqual(4);
        });

        it('should have zero crc32', () => {
            expect(firmwareState.crc32).toEqual(0);
        });

        it('should have remaining firmware objects including the full partial object', () => {
            expect(firmwareState.remainingObjects).toEqual([[5, 6, 7, 8], [9, 10]]);
        });

        it('should have empty partial object', () => {
            expect(firmwareState.remainingPartialObject).toEqual([]);
        });

        it('should not have resumable partial object', () => {
            expect(firmwareState.hasResumablePartialObject).toEqual(false);
        });
    });

    describe('when offset is in the middle of partially transferred object, and crc32 is valid', () => {
        const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const offset = 5;
        const deviceState = {
            offset: offset,
            crc32: crc.crc32(data.slice(0, offset)),
            maximumSize: 4
        };
        const firmwareState = new FirmwareState(data, deviceState);

        it('should have the same offset that was returned by the device', () => {
            expect(firmwareState.offset).toEqual(deviceState.offset);
        });

        it('should have the same crc32 value that was returned by the device', () => {
            expect(firmwareState.crc32).toEqual(deviceState.crc32);
        });

        it('should have remaining firmware objects after the partial object', () => {
            expect(firmwareState.remainingObjects).toEqual([[9, 10]]);
        });

        it('should have partial object', () => {
            expect(firmwareState.remainingPartialObject).toEqual([6, 7, 8]);
        });

        it('should have resumable partial object', () => {
            expect(firmwareState.hasResumablePartialObject).toEqual(true);
        });
    });

    describe('when there is a fully transferred object that may not have been executed', () => {

        const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const offset = 8;
        const deviceState = {
            offset: offset,
            crc32: crc.crc32(data.slice(0, offset)),
            maximumSize: 4
        };
        const firmwareState = new FirmwareState(data, deviceState);

        it('should have the same offset that was returned by the device', () => {
            expect(firmwareState.offset).toEqual(deviceState.offset);
        });

        it('should have the same crc32 value that was returned by the device', () => {
            expect(firmwareState.crc32).toEqual(deviceState.crc32);
        });

        it('should have remaining firmware objects', () => {
            expect(firmwareState.remainingObjects).toEqual([[9, 10]]);
        });

        it('should have empty partial object', () => {
            expect(firmwareState.remainingPartialObject).toEqual([]);
        });

        it('should have resumable partial object', () => {
            expect(firmwareState.hasResumablePartialObject).toEqual(true);
        });
    });
});
