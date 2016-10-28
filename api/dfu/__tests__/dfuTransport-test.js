'use strict';

const DfuTransport = require('../dfuTransport');
const { ObjectType } = require('../dfuConstants');
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
            startCharacteristicsNotifications: (id, ack, callback) => callback('Start failed')
        };
        const dfuTransport = new DfuTransport(adapter);

        return dfuTransport.sendInitPacket([]).catch(error => {
            expect(error).toEqual('Start failed');
        });
    });

    it('should return error if SELECT fails', () => {
        const dfuTransport = new DfuTransport(adapter);
        dfuTransport._controlPointService = {
            selectObject: () => Promise.reject('Select failed')
        };

        return dfuTransport.sendInitPacket([]).catch(error => {
            expect(error).toEqual('Select failed');
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
            expect(error.message).toContain('larger than max size');
        });
    });

    // TODO: Remove test. Too much mocking to be maintainable in the long run.
    it('should create object before writing if there is no init packet on the device (offset is 0)', () => {
        const initPacket = [1, 2, 3];
        const createObject = jest.fn();
        createObject.mockReturnValueOnce(Promise.resolve());
        const dfuTransport = new DfuTransport(adapter);
        dfuTransport._controlPointService = {
            selectObject: () => Promise.resolve({
                maximumSize: 3,
                offset: 0
            }),
            createObject
        };
        dfuTransport._writeObject = jest.fn();
        dfuTransport._writeObject.mockReturnValueOnce(Promise.resolve());

        return dfuTransport.sendInitPacket(initPacket).then(() => {
            expect(createObject).toHaveBeenCalledWith(ObjectType.COMMAND, initPacket.length);
            expect(dfuTransport._writeObject).toHaveBeenCalledWith(initPacket, undefined, undefined);
        });
    });

    // TODO: Remove test. Too much mocking to be maintainable in the long run.
    it('should create object before writing if init packet differs from data on device (crc32 mismatch)', () => {
        const initPacket = [1, 2, 3];
        const createObject = jest.fn();
        createObject.mockReturnValueOnce(Promise.resolve());
        const dfuTransport = new DfuTransport(adapter);
        dfuTransport._controlPointService = {
            selectObject: () => Promise.resolve({
                maximumSize: 3,
                offset: 1,
                crc32: 123
            }),
            createObject
        };
        dfuTransport._writeObject = jest.fn();
        dfuTransport._writeObject.mockReturnValueOnce(Promise.resolve());

        return dfuTransport.sendInitPacket(initPacket).then(() => {
            expect(createObject).toHaveBeenCalledWith(ObjectType.COMMAND, initPacket.length);
            expect(dfuTransport._writeObject).toHaveBeenCalledWith(initPacket, undefined, undefined);
        });
    });

    // TODO: Remove test. Too much mocking to be maintainable in the long run.
    it('should skip creating object and continue writing if offset and crc32 matches data from device', () => {
        const initPacket = [1, 2, 3];
        const offset = 2;
        const crc32 = crc.crc32(initPacket.slice(0, offset));
        const dfuTransport = new DfuTransport(adapter);
        const createObject = jest.fn();
        createObject.mockReturnValueOnce(Promise.resolve());
        dfuTransport._controlPointService = {
            selectObject: () => Promise.resolve({
                maximumSize: 3,
                offset: offset,
                crc32: crc32
            }),
            createObject
        };
        dfuTransport._writeObject = jest.fn();
        dfuTransport._writeObject.mockReturnValueOnce(Promise.resolve());

        return dfuTransport.sendInitPacket(initPacket).then(() => {
            expect(createObject).not.toHaveBeenCalled();
            expect(dfuTransport._writeObject).toHaveBeenCalledWith(initPacket.slice(offset), offset, crc32);
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
            startCharacteristicsNotifications: (id, ack, callback) => callback('Start failed')
        };
        const dfuTransport = new DfuTransport(adapter);

        return dfuTransport.sendFirmware([]).catch(error => {
            expect(error).toEqual('Start failed');
        });
    });

    it('should return error if SELECT fails', () => {
        const dfuTransport = new DfuTransport(adapter);
        dfuTransport._controlPointService = {
            selectObject: () => Promise.reject('Select failed')
        };

        return dfuTransport.sendFirmware([]).catch(error => {
            expect(error).toEqual('Select failed');
        });
    });

    // TODO: Remove test. Too much mocking to be maintainable in the long run.
    it('should continue to write objects after trying to recover', () => {
        const dfuTransport = new DfuTransport(adapter);
        dfuTransport._controlPointService = {
            selectObject: () => Promise.resolve({maximumSize: 1})
        };
        dfuTransport._recoverIncompleteTransfer = () => Promise.resolve({ offset: 0, crc32: 0 });
        dfuTransport._createAndWriteObjects = jest.fn();
        dfuTransport._createAndWriteObjects.mockReturnValueOnce(Promise.resolve());

        return dfuTransport.sendFirmware([1, 2, 3]).then(() => {
            expect(dfuTransport._createAndWriteObjects).toHaveBeenCalledWith([[1], [2], [3]], ObjectType.DATA, 0, 0);
        });
    });

});


describe('_recoverIncompleteTransfer', () => {

    let dfuTransport;

    describe('when no previous data exists on device', () => {

        const data = [1, 2, 3];
        const selectResponse = { offset: 0 };

        beforeEach(() => {
            dfuTransport = new DfuTransport();
            dfuTransport._writeObject = jest.fn();
        });

        it('should not write any remaining data', () => {
            return dfuTransport._recoverIncompleteTransfer(data, selectResponse).then(() => {
                expect(dfuTransport._writeObject).not.toHaveBeenCalled();
            });
        });

        it('should return offset 0 and empty crc32', () => {
            return dfuTransport._recoverIncompleteTransfer(data, selectResponse).then(progress => {
                expect(progress).toEqual({ offset: 0 });
            });
        });
    });

    describe('when previous data exists on device, but crc32 is invalid', () => {

        const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const maximumSize = 4;
        const offset = 5;
        const selectResponse = { maximumSize, offset };
        const crc32 = crc.crc32(data.slice(0, offset)) + 1;

        beforeEach(() => {
            dfuTransport = new DfuTransport();
            dfuTransport._writeObject = jest.fn();
        });

        it('should not write any remaining data', () => {
            return dfuTransport._recoverIncompleteTransfer(data, selectResponse).then(() => {
                expect(dfuTransport._writeObject).not.toHaveBeenCalled();
            });
        });

        it('should return offset where the current object starts', () => {
            return dfuTransport._recoverIncompleteTransfer(data, selectResponse).then(progress => {
                expect(progress.offset).toEqual(4);
            });
        });

        it('should return crc32 value for the data before the current object', () => {
            return dfuTransport._recoverIncompleteTransfer(data, selectResponse).then(progress => {
                expect(progress.crc32).toEqual(crc.crc32(data.slice(0, 4)));
            });
        });
    });

    describe('when transfer can be resumed and object is incomplete', () => {

        const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const maximumSize = 4;
        const offset = 5;
        const crc32 = crc.crc32(data.slice(0, offset));
        const selectResponse = { maximumSize, offset, crc32 };

        beforeEach(() => {
            dfuTransport = new DfuTransport();
            dfuTransport._writeObject = jest.fn();
            dfuTransport._writeObject.mockReturnValueOnce(Promise.resolve());
        });

        it('should write the remaining parts of the incomplete object', () => {
            return dfuTransport._recoverIncompleteTransfer(data, selectResponse).then(() => {
                expect(dfuTransport._writeObject).toHaveBeenCalledWith([6, 7, 8], offset, crc32);
            });
        });
    });

    describe('when transfer can be resumed and there is no incomplete object', () => {

        const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const maximumSize = 4;
        const offset = 8;
        const crc32 = crc.crc32(data.slice(0, offset));
        const selectResponse = { maximumSize, offset, crc32 };

        beforeEach(() => {
            dfuTransport = new DfuTransport();
            dfuTransport._writeObject = jest.fn();
            dfuTransport._writeObject.mockReturnValueOnce(Promise.resolve());
        });

        it('should not write any incomplete data', () => {
            return dfuTransport._recoverIncompleteTransfer(data, selectResponse).then(() => {
                expect(dfuTransport._writeObject).not.toHaveBeenCalled();
            });
        });

        it('should return the same offset and crc32 that was provided', () => {
            return dfuTransport._recoverIncompleteTransfer(data, selectResponse).then(progress => {
                expect(progress).toEqual({
                    offset: selectResponse.offset,
                    crc32: selectResponse.crc32
                });
            });
        });
    });
});

describe('_canResumeWriting', () => {

    const dfuTransport = new DfuTransport();

    it('should not resume transfer if there is no data on the device (offset is 0)', () => {
        const data = [1, 2, 3];
        const offset = 0;

        expect(dfuTransport._canResumeWriting(data, offset)).toEqual(false);
    });

    it('should not resume transfer if init packet differs from data on device (crc32 mismatch)', () => {
        const data = [1, 2, 3];
        const offset = 2;
        const crc32 = crc.crc32(data.slice(0, offset)) + 1;

        expect(dfuTransport._canResumeWriting(data, offset, crc32)).toEqual(false);
    });

    it('should resume transfer if offset and crc32 matches data from device', () => {
        const data = [1, 2, 3];
        const offset = 2;
        const crc32 = crc.crc32(data.slice(0, offset));

        expect(dfuTransport._canResumeWriting(data, offset, crc32)).toEqual(true);
    });
});

