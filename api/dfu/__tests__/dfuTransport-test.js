'use strict';

const DfuTransport = require('../dfuTransport');
const { ErrorCode, createError } = require('../dfuConstants');
const crc = require('crc');

describe('sendInitPacket', () => {

    let adapter;

    beforeEach(() => {
        adapter = {
            startCharacteristicsNotifications: (id, ack, callback) => callback()
        };
    });

    it('should return error if not able to start notifications', () => {
        adapter = {
            startCharacteristicsNotifications: (id, ack, callback) => {
                callback(new Error());
            }
        };
        const dfuTransport = new DfuTransport(adapter);

        return dfuTransport.sendInitPacket([]).catch(error => {
            expect(error.code).toEqual(ErrorCode.NOTIFICATION_START_ERROR);
        });
    });

    it('should return error if SELECT fails', () => {
        const dfuTransport = new DfuTransport(adapter);
        const error = createError(ErrorCode.COMMAND_ERROR, 'Select failed');
        dfuTransport._controlPointService = {
            selectObject: () => Promise.reject(error)
        };

        return dfuTransport.sendInitPacket([]).catch(caughtError => {
            expect(caughtError).toEqual(error);
        });
    });

    it('should return error if init packet is larger than maximumSize from SELECT ', () => {
        const initPacket = [1, 2, 3, 4];
        const dfuTransport = new DfuTransport(adapter);
        dfuTransport._controlPointService = {
            selectObject: () => Promise.resolve({
                maximumSize: 3
            })
        };

        return dfuTransport.sendInitPacket(initPacket).catch(error => {
            expect(error.code).toEqual(ErrorCode.INIT_PACKET_TOO_LARGE);
        });
    });
});


describe('sendFirmware', () => {

    let adapter;

    beforeEach(() => {
        adapter = {
            startCharacteristicsNotifications: (id, ack, callback) => callback()
        };
    });

    it('should return error if not able to start notifications', () => {
        adapter = {
            startCharacteristicsNotifications: (id, ack, callback) => {
                callback(new Error());
            }
        };
        const dfuTransport = new DfuTransport(adapter);

        return dfuTransport.sendFirmware([]).catch(error => {
            expect(error.code).toEqual(ErrorCode.NOTIFICATION_START_ERROR);
        });
    });

    it('should return error if SELECT fails', () => {
        const dfuTransport = new DfuTransport(adapter);
        const error = createError(ErrorCode.COMMAND_ERROR, 'Select failed');
        dfuTransport._controlPointService = {
            selectObject: () => Promise.reject(error)
        };

        return dfuTransport.sendFirmware([]).catch(caughtError => {
            expect(caughtError).toEqual(error);
        });
    });
});


describe('_getFirmwareState', () => {

    let dfuTransport = new DfuTransport();

    describe('when no data exists on device', () => {
        const firmware = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const selectResponse = {
            offset: 0,
            crc32: 0,
            maximumSize: 4
        };
        const state = dfuTransport._getFirmwareState(firmware, selectResponse);

        it('should return zero offset', () => {
            expect(state.offset).toEqual(0);
        });

        it('should return zero crc32', () => {
            expect(state.crc32).toEqual(0);
        });

        it('should return all firmware data as objects according to maximumSize', () => {
            expect(state.objects).toEqual([[1, 2, 3, 4], [5, 6, 7, 8], [9, 10]]);
        });

        it('should return empty partial object', () => {
            expect(state.partialObject).toEqual([]);
        });
    });

    describe('when offset is in the middle of partially transferred object, but crc32 is invalid', () => {
        const firmware = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const offset = 5;
        const invalidCrc32 = crc.crc32(firmware.slice(0, offset)) + 1;
        const selectResponse = {
            offset: offset,
            crc32: invalidCrc32,
            maximumSize: 4
        };
        const state = dfuTransport._getFirmwareState(firmware, selectResponse);

        it('should return offset where the partial object starts', () => {
            expect(state.offset).toEqual(4);
        });

        it('should return crc32 value for the data before the partial object', () => {
            expect(state.crc32).toEqual(crc.crc32(firmware.slice(0, 4)));
        });

        it('should return remaining firmware objects including the full partial object', () => {
            expect(state.objects).toEqual([[5, 6, 7, 8], [9, 10]]);
        });

        it('should return empty partial object', () => {
            expect(state.partialObject).toEqual([]);
        });
    });

    describe('when transfer can be resumed, and there is a partially transferred object', () => {
        const firmware = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const offset = 5;
        const selectResponse = {
            offset: offset,
            crc32: crc.crc32(firmware.slice(0, offset)),
            maximumSize: 4
        };
        const state = dfuTransport._getFirmwareState(firmware, selectResponse);

        it('should return the same offset that was returned by the device', () => {
            expect(state.offset).toEqual(selectResponse.offset);
        });

        it('should return the same crc32 value that was returned by the device', () => {
            expect(state.crc32).toEqual(selectResponse.crc32);
        });

        it('should return remaining firmware objects after the partial object', () => {
            expect(state.objects).toEqual([[9, 10]]);
        });

        it('should return partial object', () => {
            expect(state.partialObject).toEqual([6, 7, 8]);
        });
    });

    describe('when data exists on device, and there is no partially transferred object', () => {

        const firmware = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const offset = 8;
        const selectResponse = {
            offset: offset,
            crc32: crc.crc32(firmware.slice(0, offset)),
            maximumSize: 4
        };
        const state = dfuTransport._getFirmwareState(firmware, selectResponse);

        it('should return the same offset that was returned by the device', () => {
            expect(state.offset).toEqual(selectResponse.offset);
        });

        it('should return the same crc32 value that was returned by the device', () => {
            expect(state.crc32).toEqual(selectResponse.crc32);
        });

        it('should return remaining firmware objects', () => {
            expect(state.objects).toEqual([[9, 10]]);
        });

        it('should return empty partial object', () => {
            expect(state.partialObject).toEqual([]);
        });
    });
});

describe('_canResumePartiallyWrittenObject', () => {

    const dfuTransport = new DfuTransport();

    it('should not resume transfer if there is no data on the device (offset is 0)', () => {
        const data = [1, 2, 3];
        const offset = 0;

        expect(dfuTransport._canResumePartiallyWrittenObject(data, offset)).toEqual(false);
    });

    it('should not resume transfer if init packet differs from data on device (crc32 mismatch)', () => {
        const data = [1, 2, 3];
        const offset = 2;
        const crc32 = crc.crc32(data.slice(0, offset)) + 1;

        expect(dfuTransport._canResumePartiallyWrittenObject(data, offset, crc32)).toEqual(false);
    });

    it('should resume transfer if offset and crc32 matches data from device', () => {
        const data = [1, 2, 3];
        const offset = 2;
        const crc32 = crc.crc32(data.slice(0, offset));

        expect(dfuTransport._canResumePartiallyWrittenObject(data, offset, crc32)).toEqual(true);
    });
});

