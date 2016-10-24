'use strict';

const DfuObjectWriter = require('../dfuObjectWriter');

describe('writeObject', () => {

    let adapter;
    let writer;

    beforeEach(() => {
        adapter = {
            on: jest.fn(),
            removeListener: jest.fn()
        };
        writer = new DfuObjectWriter(adapter);
    });

    describe('when write packets successful', () => {

        it('should enable and disable notification listener', () => {
            writer._writePackets = () => Promise.resolve();
            return writer.writeObject([1]).then(() => {
                expect(adapter.on).toHaveBeenCalled();
                expect(adapter.removeListener).toHaveBeenCalled();
            });
        });

    });

    describe('when write packets failed', () => {

        it('should re-throw error', () => {
            writer._writePackets = () => Promise.reject('Some error');
            return writer.writeObject([1]).catch(error => {
                expect(error).toEqual('Some error');
            });
        });

        it('should enable and disable notification listener', () => {
            writer._writePackets = () => Promise.reject('Some error');
            return writer.writeObject([1]).catch(() => {
                expect(adapter.on).toHaveBeenCalled();
                expect(adapter.removeListener).toHaveBeenCalled();
            });
        });
    });

});

describe('_writePackets', () => {

    let adapter;
    let outputStream;

    beforeEach(() => {
        adapter = {
            writeCharacteristicValue: (id, command, ack, callback) => {
                callback();
            }
        };
        outputStream = new DfuObjectWriter(adapter);
    });

    describe('when one packet', () => {

        const packets = [1];

        it('should write one packet', () => {
            return outputStream._writePackets(packets).then(() => {
                // TODO
                //expect(adapter.writeCharacteristicValue).toHaveBeenCalledTimes(1);
            })
        });
    });

});