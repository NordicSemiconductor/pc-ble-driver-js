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

const ErrorCode = require('../../dfuConstants').ErrorCode;
const PacketWriter = require('../packetWriter');
const crc = require('crc');

describe('writePacket', () => {

    const characteristicId = 123;
    const createWriter = (adapter) => {
        return new PacketWriter(adapter, characteristicId);
    };

    describe('when adapter returns error', () => {

        const adapter = {
            writeCharacteristicValue: ((id, value, ack, callback) => {
                callback(new Error());
            })
        };
        const writer = createWriter(adapter);

        it('should return write error', () => {
            return writer.writePacket([1]).catch(error => {
                expect(error.code).toEqual(ErrorCode.WRITE_ERROR);
            });
        });
    });

    describe('when adapter writes packets', () => {

        const adapter = {
            writeCharacteristicValue: ((id, value, ack, callback) => {
                callback();
            })
        };
        const packet = [1, 2, 3, 4, 5];

        describe('when CRC32 value is not set', () => {

            const firstCrc = crc.crc32(packet);
            const secondCrc = crc.crc32(packet, firstCrc);
            const writer = createWriter(adapter);

            it('should calculate and set CRC32 value', () => {
                return writer.writePacket(packet).then(() => {
                    expect(writer.getCrc32()).toEqual(firstCrc);
                });
            });

            it('should accumulate CRC32 value', () => {
                return writer.writePacket(packet).then(() => {
                    expect(writer.getCrc32()).toEqual(secondCrc);
                });
            });

        });

        describe('when CRC32 value is set', () => {

            const firstCrc = crc.crc32(packet);
            const secondCrc = crc.crc32(packet, firstCrc);
            const writer = createWriter(adapter);
            writer.setCrc32(firstCrc);

            it('should accumulate CRC32 value', () => {
                return writer.writePacket(packet).then(() => {
                    expect(writer.getCrc32()).toEqual(secondCrc);
                });
            });
        });

        describe('when offset is not set', () => {

            const writer = createWriter(adapter);

            it('should increment offset from zero', () => {
                return writer.writePacket(packet).then(() => {
                    expect(writer.getOffset()).toEqual(packet.length);
                });
            });

            it('should increment offset from previous value', () => {
                const offset = writer.getOffset();
                return writer.writePacket(packet).then(() => {
                    expect(writer.getOffset()).toEqual(offset + packet.length);
                });
            });
        });

        describe('when offset is set to a given value', () => {

            const writer = createWriter(adapter);
            writer.setOffset(3);

            it('should increment offset from the given value', () => {
                return writer.writePacket(packet).then(() => {
                    expect(writer.getOffset()).toEqual(3 + packet.length);
                });
            });
        });

        describe('when PRN is set to 3', () => {

            const writer = createWriter(adapter);
            writer.setPrn(3);

            it('should return PRN false after the first write', () => {
                return writer.writePacket(packet).then(progress => expect(progress.isPrnReached).toEqual(false));
            });

            it('should return PRN false after the second write', () => {
                return writer.writePacket(packet).then(progress => expect(progress.isPrnReached).toEqual(false));
            });

            it('should return PRN true after third write', () => {
                return writer.writePacket(packet).then(progress => expect(progress.isPrnReached).toEqual(true));
            });

            it('should return PRN false after the fourth write', () => {
                return writer.writePacket(packet).then(progress => expect(progress.isPrnReached).toEqual(false));
            });
        });
    });
});
