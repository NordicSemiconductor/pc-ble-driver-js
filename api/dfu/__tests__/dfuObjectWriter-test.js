'use strict';

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

    describe('when write packets called', () => {

        describe('when write packets complete', () => {

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

    });

    describe('when write packets failed', () => {

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

});
