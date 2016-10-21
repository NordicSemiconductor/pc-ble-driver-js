const ControlPointService = require('../controlPointService');
const EventEmitter = require('events');

describe('_sendCommand', () => {

    const CONTROL_POINT_EXECUTE = 0x04;
    const CONTROL_POINT_SELECT = 0x06;
    const CONTROL_POINT_RESPONSE = 0x60;
    const OBJECT_TYPE_COMMAND = 0x01;

    const RESULT_CODE_SUCCESS = 0x01;

    describe('when writing of characteristic value failed', () => {

        let adapter;
        let controlPointService;

        beforeEach(() => {
            adapter = new EventEmitter();
            adapter.writeCharacteristicValue = (id, command, ack, callback) => {
                callback('Write failed');
            };
            controlPointService = new ControlPointService(adapter);
        });

        it('should return error', () => {
            return controlPointService._sendCommand({}).catch(error => {
                expect(error).toEqual('Write failed');
            });
        });

        it('should remove event listener', () => {
            return controlPointService._sendCommand({}).catch(() => {
                expect(adapter.listenerCount('characteristicValueChanged')).toEqual(0);
            });
        });

    });

    describe('when no characteristic emitted', () => {

        let adapter;
        let controlPointService;

        beforeEach(() => {
            adapter = new EventEmitter();
            adapter.writeCharacteristicValue = jest.fn();
            controlPointService = new ControlPointService(adapter);
        });

        it('should return timeout', () => {
            jest.useFakeTimers();
            const promise = controlPointService._sendCommand({}).catch(error => {
                expect(error).toContain('Timed out');
            });
            jest.runAllTimers();
            return promise;
        });

        it('should remove event listener', () => {
            jest.useFakeTimers();
            const promise = controlPointService._sendCommand({}).catch(error => {
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
        let controlPointService;

        beforeEach(() => {
            adapter = new EventEmitter();
            adapter.writeCharacteristicValue = jest.fn();
            controlPointService = new ControlPointService(adapter, controlPointCharacteristicId);
        });

        it('should return error', () => {
            const promise = controlPointService._sendCommand(command).catch(error => {
                expect(error).toContain('Got unexpected response');
            });
            adapter.emit('characteristicValueChanged', characteristic);
            return promise;
        });

        it('should remove event listener', () => {
            const promise = controlPointService._sendCommand(command).catch(() => {
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
            value: [CONTROL_POINT_RESPONSE, CONTROL_POINT_SELECT, RESULT_CODE_SUCCESS, 37, 13]
        };
        const characteristicToReturn = {
            _instanceId: controlPointCharacteristicId,
            value: [CONTROL_POINT_RESPONSE, CONTROL_POINT_SELECT, RESULT_CODE_SUCCESS, 42]
        };
        let adapter;
        let controlPointService;

        beforeEach(() => {
            adapter = new EventEmitter();
            adapter.writeCharacteristicValue = jest.fn();
            controlPointService = new ControlPointService(adapter, controlPointCharacteristicId);
        });

        it('should ignore the characteristic that has different characteristic id', () => {
            const promise = controlPointService._sendCommand(command).then(response => {
                expect(response).toEqual(characteristicToReturn.value.slice(3));
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
            value: [CONTROL_POINT_RESPONSE, CONTROL_POINT_SELECT, RESULT_CODE_SUCCESS]
        };
        let adapter;
        let controlPointService;

        beforeEach(() => {
            adapter = new EventEmitter();
            adapter.writeCharacteristicValue = jest.fn();
            controlPointService = new ControlPointService(adapter, controlPointCharacteristicId);
        });

        it('should write characteristic value', () => {
            const promise = controlPointService._sendCommand(command).then(() => {
                expect(adapter.writeCharacteristicValue).toHaveBeenCalled();
            });
            adapter.emit('characteristicValueChanged', characteristic);
            return promise;
        });

        it('should return the response', () => {
            const promise = controlPointService._sendCommand(command).then(response => {
                expect(response).toBe(response);
            });
            adapter.emit('characteristicValueChanged', characteristic);
            return promise;
        });

        it('should remove event listener', () => {
            const promise = controlPointService._sendCommand(command).then(() => {
                expect(adapter.listenerCount('characteristicValueChanged')).toEqual(0);
            });
            adapter.emit('characteristicValueChanged', characteristic);
            return promise;
        });

    });

});

