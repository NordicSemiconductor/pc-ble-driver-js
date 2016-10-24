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
        writer._writePackets = jest.fn();
    });

    describe('when data has length 1 and mtuSize 1', () => {

        const data = [1];
        const mtuSize = 1;

        it('should call _writePackets once with data', () => {
            return writer.writeObject(data, mtuSize).then(() => {
                expect(writer._writePackets).toHaveBeenCalledTimes(1);
                expect(writer._writePackets).toHaveBeenCalledWith(data);
            });
        });

        it('should enable and disable notification listener', () => {
            return writer.writeObject(data, mtuSize).then(() => {
                expect(adapter.on).toHaveBeenCalled();
                expect(adapter.removeListener).toHaveBeenCalled();
            });
        });

    });

    describe('when data has length 2 and mtuSize 1', () => {

        const data = [1, 2];
        const mtuSize = 1;
        const prn = 0;

        it('should call _writePackets twice with splitted data', () => {
            return writer.writeObject(data, mtuSize, prn).then(() => {
                expect(writer._writePackets).toHaveBeenCalledTimes(2);
                expect(writer._writePackets).toHaveBeenCalledWith([data[0]]);
                expect(writer._writePackets).toHaveBeenCalledWith([data[1]]);
            });
        });

    });

    describe('when _writePackets throws error', () => {

        it('should re-throw error', () => {
            writer._writePackets = () => Promise.reject('Some error');
            return writer.writeObject([1], 1).catch(error => {
                expect(error).toEqual('Some error');
            });
        });

        it('should remove notification listener', () => {
            writer._writePackets = () => Promise.reject('Some error');
            return writer.writeObject([1], 1).catch(() => {
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