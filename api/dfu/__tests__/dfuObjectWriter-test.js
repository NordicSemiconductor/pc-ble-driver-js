'use strict';

const { ControlPointOpcode, ResultCode } = require('../dfuConstants');
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

        const offset = 123;
        const crc32 = 456;

        beforeEach(() => {
            // Inject our own packet writer that returns successfully,
            // and has offset and crc32.
            objectWriter._createPacketWriter = () => {
                return {
                    writePacket: () => Promise.resolve(),
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

    describe('when packet writer returns progress info', () => {

        const progressInfo = {
            offset: 0x1234,
            crc32: 0x5678
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
                notificationStore.readLatest = () => Promise.resolve(notification);
                return objectWriter.writeObject([1]).catch(error => {
                    expect(error.message).toContain('Error when validating CRC');
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
                notificationStore.readLatest = () => Promise.resolve(notification);
                return objectWriter.writeObject([1]).catch(error => {
                    expect(error.message).toContain('Error when validating offset');
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
                notificationStore.readLatest = () => Promise.resolve(notification);
                return objectWriter.writeObject([1]).then(() => {});
            });

        });

    });

});
