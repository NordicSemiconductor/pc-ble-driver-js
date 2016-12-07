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
