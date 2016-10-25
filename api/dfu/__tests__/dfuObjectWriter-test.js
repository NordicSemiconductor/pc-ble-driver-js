'use strict';

const { ControlPointOpcode } = require('../dfuConstants');
const DfuObjectWriter = require('../dfuObjectWriter');

describe('writeObject', () => {

    const adapter = {};
    let notificationStore;
    let objectWriter;

    beforeEach(() => {
        notificationStore = {
            startListening: jest.fn(),
            stopListening: jest.fn(),
            readLatest: jest.fn()
        };
        objectWriter = new DfuObjectWriter(adapter);
        objectWriter._notificationStore = notificationStore;
    });


    describe('when writing packets has succeeded', () => {

        const accumulatedCrc = 123;

        beforeEach(() => {
            // Inject our own packet writer that returns successfully,
            // and has an accumulated CRC.
            objectWriter._createPacketWriter = () => {
                return {
                    writePacket: () => Promise.resolve(),
                    getAccumulatedCrc: () => accumulatedCrc
                };
            };
        });

        it('should return accumulated CRC', () => {
            return objectWriter.writeObject([1]).then(crc => {
                expect(crc).toEqual(accumulatedCrc);
            });
        });

        it('should stop listening to notifications', () => {
            return objectWriter.writeObject([1]).then(() => {
                expect(notificationStore.stopListening).toHaveBeenCalled();
            });
        });

    });

    describe('when writing packets have failed', () => {

        it('should re-throw error', () => {
            objectWriter._writePackets = () => Promise.reject('Some error');
            return objectWriter.writeObject([1]).catch(error => {
                expect(error).toEqual('Some error');
            });
        });

        it('should stop listening to notifications', () => {
            objectWriter._writePackets = () => Promise.reject('Some error');
            return objectWriter.writeObject([1]).catch(() => {
                expect(notificationStore.stopListening).toHaveBeenCalled();
            });
        });
    });

    describe('when packet writer returns CRC', () => {

        const crc = 123;

        beforeEach(() => {
            // Inject our own packet writer that returns CRC.
            objectWriter._createPacketWriter = () => {
                return {
                    writePacket: () => Promise.resolve(crc),
                    getAccumulatedCrc: jest.fn()
                };
            };
        });

        describe('when match with CRC from last notification', () => {

            it('should complete without error', () => {
                notificationStore.readLatest = () => Promise.resolve({ crc: 123 });
                return objectWriter.writeObject([1]).then(() => {});
            });

        });

        describe('when mismatch with CRC from last notification', () => {

            it('should return error', () => {
                notificationStore.readLatest = () => Promise.resolve({ crc: 456 });
                return objectWriter.writeObject([1]).catch(error => {
                    expect(error.message).toContain('Error when validating CRC');
                });
            });

        });
    });

});
