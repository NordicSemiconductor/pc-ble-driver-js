'use strict';

const { ErrorCode } = require('../dfuConstants');
const DfuPacketWriter = require('../dfuPacketWriter');
const crc = require('crc');

describe('writePacket', () => {

    const characteristicId = 123;
    const createWriter = (adapter) => {
        return new DfuPacketWriter(adapter, characteristicId);
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

            it('should not return progress after the first write', () => {
                return writer.writePacket(packet).then(progress => expect(progress).toBeUndefined());
            });

            it('should not return progress after the second write', () => {
                return writer.writePacket(packet).then(progress => expect(progress).toBeUndefined());
            });

            it('should return progress after third write', () => {
                return writer.writePacket(packet).then(progress => expect(progress).toBeDefined());
            });

            it('should not return progress after the fourth write', () => {
                return writer.writePacket(packet).then(progress => expect(progress).toBeUndefined());
            });
        });
    });
});
