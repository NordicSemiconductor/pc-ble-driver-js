import DfuTransport from '../dfuTransport';
import EventEmitter from 'events';

describe('_createChunks', () => {

    const createChunks = (data, chunkSize) => DfuTransport._createChunks(data, chunkSize);

    describe('when array is empty', () => {
        const data = [];
        const chunkSize = 1;

        it('should return empty array', () => {
            expect(createChunks(data, chunkSize)).toEqual([]);
        });
    });

    describe('when chunk size is 0', () => {
        const data = [];
        const chunkSize = 0;

        it('should throw error', () => {
            expect(() => createChunks(data, chunkSize)).toThrow();
        });
    });

    describe('when array has 1 item and chunk size is 2', () => {
        const data = [1];
        const chunkSize = 2;

        it('should return 1 chunk', () => {
            expect(createChunks(data, chunkSize)).toEqual([[1]]);
        });
    });

    describe('when array has 1 item and chunk size is 1', () => {
        const data = [1];
        const chunkSize = 1;

        it('should return 1 chunk with 1 item', () => {
            expect(createChunks(data, chunkSize)).toEqual([[1]]);
        });
    });

    describe('when array has 2 items and chunk size is 1', () => {
        const data = [1, 2];
        const chunkSize = 1;

        it('should return 2 chunks with 1 item each', () => {
            expect(createChunks(data, chunkSize)).toEqual([[1], [2]]);
        });
    });

    describe('when array has 7 items and chunk size is 3', () => {
        const data = [1, 2, 3, 4, 5, 6, 7];
        const chunkSize = 3;

        it('should return 3 chunks with max 3 items', () => {
            expect(createChunks(data, chunkSize)).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
        });
    });
});


describe('_sendCommand', () => {

    const CONTROL_POINT_EXECUTE = 0x04;
    const CONTROL_POINT_SELECT = 0x06;
    const CONTROL_POINT_RESPONSE = 0x60;
    const OBJECT_TYPE_COMMAND = 0x01;

    describe('when writing of characteristic value failed', () => {

        let adapter;
        let dfuTransport;

        beforeEach(() => {
            adapter = new EventEmitter();
            adapter.writeCharacteristicValue = (id, command, ack, callback) => {
                callback('Write failed');
            };
            dfuTransport = new DfuTransport(adapter);
        });

        it('should return error', () => {
            return dfuTransport._sendCommand({}).catch(error => {
                expect(error).toEqual('Write failed');
            });
        });

        it('should remove event listener', () => {
            return dfuTransport._sendCommand({}).catch(() => {
                expect(adapter.listenerCount('characteristicValueChanged')).toEqual(0);
            });
        });

    });

    describe('when no characteristic emitted', () => {

        let adapter;
        let dfuTransport;

        beforeEach(() => {
            adapter = new EventEmitter();
            adapter.writeCharacteristicValue = jest.fn();
            dfuTransport = new DfuTransport(adapter);
        });

        it('should return timeout', () => {
            jest.useFakeTimers();
            const promise = dfuTransport._sendCommand({}).catch(error => {
                expect(error).toContain('Timed out');
            });
            jest.runAllTimers();
            return promise;
        });

        it('should remove event listener', () => {
            jest.useFakeTimers();
            const promise = dfuTransport._sendCommand({}).catch(error => {
                expect(adapter.listenerCount('characteristicValueChanged')).toEqual(0);
            });
            jest.runAllTimers();
            return promise;
        });

    });

    describe('when adapter emits characteristic for different command', () => {

        const controlPointCharacteristicId = 123;
        const command = [CONTROL_POINT_SELECT, OBJECT_TYPE_COMMAND];
        const characteristic = {
            _instanceId: controlPointCharacteristicId,
            value: [CONTROL_POINT_RESPONSE, CONTROL_POINT_EXECUTE]
        };
        let adapter;
        let dfuTransport;

        beforeEach(() => {
            adapter = new EventEmitter();
            adapter.writeCharacteristicValue = jest.fn();
            dfuTransport = new DfuTransport(adapter, controlPointCharacteristicId);
        });

        it('should return error', () => {
            const promise = dfuTransport._sendCommand(command).catch(error => {
                expect(error).toContain('Got unexpected response');
            });
            adapter.emit('characteristicValueChanged', characteristic);
            return promise;
        });

        it('should remove event listener', () => {
            const promise = dfuTransport._sendCommand(command).catch(() => {
                expect(adapter.listenerCount('characteristicValueChanged')).toEqual(0);
            });
            adapter.emit('characteristicValueChanged', characteristic);
            return promise;
        });

    });

    describe('when adapter emits characteristic for different characteristic id', () => {

        const controlPointCharacteristicId = 123;
        const command = [CONTROL_POINT_SELECT, OBJECT_TYPE_COMMAND];
        const characteristicToIgnore = {
            _instanceId: 456,
            value: [CONTROL_POINT_RESPONSE, CONTROL_POINT_SELECT]
        };
        const characteristicToReturn = {
            _instanceId: controlPointCharacteristicId,
            value: [CONTROL_POINT_RESPONSE, CONTROL_POINT_SELECT]
        };
        let adapter;
        let dfuTransport;

        beforeEach(() => {
            adapter = new EventEmitter();
            adapter.writeCharacteristicValue = jest.fn();
            dfuTransport = new DfuTransport(adapter, controlPointCharacteristicId);
        });

        it('should ignore the characteristic that has different characteristic id', () => {
            const promise = dfuTransport._sendCommand(command).then(response => {
                expect(response).toBe(characteristicToReturn.value);
            });
            adapter.emit('characteristicValueChanged', characteristicToIgnore);
            adapter.emit('characteristicValueChanged', characteristicToReturn);
            return promise;
        });

    });

    describe('when adapter emits the anticipated characteristic', () => {

        const controlPointCharacteristicId = 123;
        const command = [CONTROL_POINT_SELECT, OBJECT_TYPE_COMMAND];
        const characteristic = {
            _instanceId: controlPointCharacteristicId,
            value: [CONTROL_POINT_RESPONSE, CONTROL_POINT_SELECT]
        };
        let adapter;
        let dfuTransport;

        beforeEach(() => {
            adapter = new EventEmitter();
            adapter.writeCharacteristicValue = jest.fn();
            dfuTransport = new DfuTransport(adapter, controlPointCharacteristicId);
        });

        it('should write characteristic value', () => {
            const promise = dfuTransport._sendCommand(command).then(() => {
                expect(adapter.writeCharacteristicValue).toHaveBeenCalled();
            });
            adapter.emit('characteristicValueChanged', characteristic);
            return promise;
        });

        it('should return the response', () => {
            const promise = dfuTransport._sendCommand(command).then(response => {
                expect(response).toBe(response);
            });
            adapter.emit('characteristicValueChanged', characteristic);
            return promise;
        });

        it('should remove event listener', () => {
            const promise = dfuTransport._sendCommand(command).then(() => {
                expect(adapter.listenerCount('characteristicValueChanged')).toEqual(0);
            });
            adapter.emit('characteristicValueChanged', characteristic);
            return promise;
        });

    });

});
