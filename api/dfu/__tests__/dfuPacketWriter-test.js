'use strict';

const DfuPacketWriter = require('../dfuPacketWriter');
const crc = require('crc');

describe('writePacket', () => {

    const characteristicId = 123;
    const createWriter = (adapter, prn) => {
        return new DfuPacketWriter(adapter, characteristicId, prn);
    };

    describe('when adapter returns write error', () => {

        const errorMessage = 'Write error';
        const adapter = {
            writeCharacteristicValue: ((id, value, ack, callback) => {
                callback(errorMessage);
            })
        };
        const writer = createWriter(adapter);

        it('should return the write error', () => {
            return writer.writePacket([1]).catch(error => {
                expect(error).toEqual(errorMessage);
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
        const firstCrc = crc.crc32(packet);
        const secondCrc = crc.crc32(packet, firstCrc);
        const writer = createWriter(adapter);

        it('should calculate CRC', () => {
            return writer.writePacket(packet).then(() => {
                const crc = writer.getAccumulatedCrc();
                expect(crc).toEqual(firstCrc);
            });
        });

        it('should accumulate CRC', () => {
            return writer.writePacket(packet).then(() => {
                const crc = writer.getAccumulatedCrc();
                expect(crc).toEqual(secondCrc);
            });
        });

    });

    describe('when PRN is set to 3', () => {

        const adapter = {
            writeCharacteristicValue: ((id, value, ack, callback) => {
                callback();
            })
        };
        const packet = [1, 2, 3, 4, 5];
        const prn = 3;
        const writer = createWriter(adapter, prn);

        it('should not return CRC after the first write', () => {
            return writer.writePacket(packet).then(crc => expect(crc).toBeUndefined());
        });

        it('should not return CRC after the second write', () => {
            return writer.writePacket(packet).then(crc => expect(crc).toBeUndefined());
        });

        it('should return CRC after third write', () => {
            return writer.writePacket(packet).then(crc => expect(crc).toBeDefined());
        });

        it('should not return CRC after the fourth write', () => {
            return writer.writePacket(packet).then(crc => expect(crc).toBeUndefined());
        });
    });

});
