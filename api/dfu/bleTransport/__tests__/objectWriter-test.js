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

const ControlPointOpcode = require('../../dfuConstants').ControlPointOpcode;
const ResultCode = require('../../dfuConstants').ResultCode;
const ErrorCode = require('../../dfuConstants').ErrorCode;
const ObjectWriter = require('../objectWriter');

describe('writeObject', () => {

    const adapter = {};
    let notificationQueue;
    let objectWriter;

    beforeEach(() => {
        notificationQueue = {
            startListening: jest.fn(),
            stopListening: jest.fn(),
            readNext: jest.fn()
        };
        objectWriter = new ObjectWriter(adapter);
        objectWriter._notificationQueue = notificationQueue;
    });


    describe('when writing packets has succeeded', () => {

        const offset = 123;
        const crc32 = 456;

        beforeEach(() => {
            // Inject our own packet writer that returns successfully,
            // and has offset and crc32.
            objectWriter._createPacketWriter = () => {
                return {
                    writePacket: () => Promise.resolve({offset, crc32}),
                    getOffset: () => offset,
                    getCrc32: () => crc32
                };
            };
        });

        it('should return progress info (offset and crc32)', () => {
            return objectWriter.writeObject([1]).then(progressInfo => {
                expect(progressInfo).toEqual({
                    offset,
                    crc32
                });
            });
        });

        it('should stop listening to notifications', () => {
            return objectWriter.writeObject([1]).then(() => {
                expect(notificationQueue.stopListening).toHaveBeenCalled();
            });
        });

        it('should emit packetWritten event', () => {
            const onEventEmitted = jest.fn();
            objectWriter.on('packetWritten', onEventEmitted);
            return objectWriter.writeObject([1]).then(() => {
                expect(onEventEmitted).toHaveBeenCalled();
            });
        });

    });

    describe('when writing packets have failed', () => {

        it('should re-throw error', () => {
            const error = new Error();
            objectWriter._writePackets = () => Promise.reject(error);
            return objectWriter.writeObject([1]).catch(caughtError => {
                expect(caughtError).toEqual(error);
            });
        });

        it('should stop listening to notifications', () => {
            objectWriter._writePackets = () => Promise.reject('Some error');
            return objectWriter.writeObject([1]).catch(() => {
                expect(notificationQueue.stopListening).toHaveBeenCalled();
            });
        });
    });

    describe('when abort has been invoked', () => {

        beforeEach(() => {
            objectWriter.abort();
        });

        it('should throw error with code ABORTED', () => {
            return objectWriter.writeObject([1]).catch(error => {
                expect(error.code).toEqual(ErrorCode.ABORTED);
            });
        });

    });

    describe('when PRN is not reached', () => {

        const progressInfo = {
            offset: 0x1234,
            crc32: 0x5678,
            isPrnReached: false,
        };

        beforeEach(() => {
            // Inject our own packet writer that returns progress info
            objectWriter._createPacketWriter = () => {
                return {
                    writePacket: () => Promise.resolve(progressInfo),
                    getOffset: jest.fn(),
                    getCrc32: jest.fn()
                };
            };
        });

        it('should not read notification', () => {
            return objectWriter.writeObject([1]).then(() => {
                expect(notificationQueue.readNext).not.toHaveBeenCalled();
            });
        });
    });

    describe('when PRN is reached', () => {

        const progressInfo = {
            offset: 0x1234,
            crc32: 0x5678,
            isPrnReached: true,
        };

        beforeEach(() => {
            // Inject our own packet writer that returns progress info
            objectWriter._createPacketWriter = () => {
                return {
                    writePacket: () => Promise.resolve(progressInfo),
                    getOffset: jest.fn(),
                    getCrc32: jest.fn()
                };
            };
        });

        describe('when CRC32 value does not match notification', () => {

            const notification = [
                ControlPointOpcode.RESPONSE,
                ControlPointOpcode.CALCULATE_CRC,
                ResultCode.SUCCESS,
                0x34, 0x12, 0x00, 0x00, // offset
                0x79, 0x56, 0x00, 0x00  // crc32
            ];

            it('should return error', () => {
                notificationQueue.readNext = () => Promise.resolve(notification);
                return objectWriter.writeObject([1]).catch(error => {
                    expect(error.code).toEqual(ErrorCode.INVALID_CRC);
                });
            });

        });

        describe('when offset does not match notification', () => {

            const notification = [
                ControlPointOpcode.RESPONSE,
                ControlPointOpcode.CALCULATE_CRC,
                ResultCode.SUCCESS,
                0x35, 0x12, 0x00, 0x00, // offset
                0x78, 0x56, 0x00, 0x00  // crc32
            ];

            it('should return error', () => {
                notificationQueue.readNext = () => Promise.resolve(notification);
                return objectWriter.writeObject([1]).catch(error => {
                    expect(error.code).toEqual(ErrorCode.INVALID_OFFSET);
                });
            });

        });

        describe('when CRC32 and offset matches notification', () => {

            const notification = [
                ControlPointOpcode.RESPONSE,
                ControlPointOpcode.CALCULATE_CRC,
                ResultCode.SUCCESS,
                0x34, 0x12, 0x00, 0x00, // offset
                0x78, 0x56, 0x00, 0x00  // crc
            ];

            it('should complete without error', () => {
                notificationQueue.readNext = () => Promise.resolve(notification);
                return objectWriter.writeObject([1]).then(() => {});
            });

        });
    });
});
