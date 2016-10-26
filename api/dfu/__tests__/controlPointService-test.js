'use strict';

const ControlPointService = require('../controlPointService');

describe('_sendCommand', () => {

    describe('when writing of characteristic value failed', () => {

        let adapter;
        let controlPointService;
        let notificationStore;

        beforeEach(() => {
            adapter = {
                writeCharacteristicValue: (id, command, ack, callback) => {
                    callback('Write failed');
                }
            };
            notificationStore = {
                startListening: jest.fn(),
                stopListening: jest.fn()
            };
            controlPointService = new ControlPointService(adapter);
            controlPointService._notificationStore = notificationStore;
        });

        it('should return error', () => {
            return controlPointService._sendCommand({}).catch(error => {
                expect(error).toEqual('Write failed');
            });
        });

        it('should stop listening for response notifications', () => {
            return controlPointService._sendCommand({}).catch(() => {
                expect(notificationStore.stopListening).toHaveBeenCalled();
            });
        });

    });

    describe('when error returned from notification store', () => {

        let adapter;
        let controlPointService;
        let notificationStore;

        beforeEach(() => {
            adapter = {
                writeCharacteristicValue: (id, command, ack, callback) => {
                    callback();
                }
            };
            notificationStore = {
                startListening: jest.fn(),
                stopListening: jest.fn(),
                readLatest: () => Promise.reject('Some error')
            };
            controlPointService = new ControlPointService(adapter);
            controlPointService._notificationStore = notificationStore;
        });

        it('should re-throw error', () => {
            return controlPointService._sendCommand({}).catch(error => {
                expect(error).toContain('Some error');
            });
        });

        it('should stop listening for response notifications', () => {
            return controlPointService._sendCommand({}).catch(() => {
                expect(notificationStore.stopListening).toHaveBeenCalled();
            });
        });

    });

    describe('when notification store returns response array', () => {

        let adapter;
        let controlPointService;
        let notificationStore;
        const responseArray = [0x60, 0x01, 0x01];
        const responseObject = {command: 0x60, requestOpcode: 0x01, resultCode: 0x01};

        beforeEach(() => {
            adapter = {
                writeCharacteristicValue: (id, command, ack, callback) => callback()
            };
            notificationStore = {
                startListening: jest.fn(),
                stopListening: jest.fn(),
                readLatest: () => Promise.resolve(responseArray)
            };
            controlPointService = new ControlPointService(adapter);
            controlPointService._notificationStore = notificationStore;
        });

        it('should return response object', () => {
            return controlPointService._sendCommand({}).then(response => {
                expect(response).toEqual(responseObject);
            });
        });

        it('should stop listening for response notifications', () => {
            return controlPointService._sendCommand({}).then(() => {
                expect(notificationStore.stopListening).toHaveBeenCalled();
            });
        });

    });

});

describe('parseCommand', () => {
    let controlPointService = new ControlPointService();

    const createCommandArray = [0x01, 0x01, 0x34, 0x12, 0x00, 0x00];
    const createCommandObject = {command: 0x01, type: 0x01, size: 0x1234};
    const setPrnCommandArray = [0x02, 0x34, 0x12];
    const setPrnCommandObject = {command: 0x02, value: 0x1234};
    const calculateCrcCommandArray = [0x03];
    const calculateCrcCommandObject = {command: 0x03};
    const executeCommandArray = [0x04];
    const executeCommandObject = {command: 0x04};
    const selectCommandArray = [0x06, 0x01];
    const selectCommandObject = {command: 0x06, type: 0x01};

    const createResponseArray = [0x60, 0x01, 0x01];

    describe('when parsing commands', () => {
        it('should parse CREATE command', () => {
            expect(controlPointService.parseCommand(createCommandArray)).toEqual(createCommandObject);
        });
        it('should parse SET_PRN command', () => {
            expect(controlPointService.parseCommand(setPrnCommandArray)).toEqual(setPrnCommandObject);
        });
        it('should parse CALCULATE_CRC command', () => {
            expect(controlPointService.parseCommand(calculateCrcCommandArray)).toEqual(calculateCrcCommandObject);
        });
        it('should parse EXECUTE command', () => {
            expect(controlPointService.parseCommand(executeCommandArray)).toEqual(executeCommandObject);
        });
        it('should parse SELECT command', () => {
            expect(controlPointService.parseCommand(selectCommandArray)).toEqual(selectCommandObject);
        });
        it('should call parseResponse for parsing RESPONSE command', () => {
            let controlPointService = new ControlPointService();
            controlPointService.parseResponse = jest.fn();
            controlPointService.parseCommand(createResponseArray);
            expect(controlPointService.parseResponse).toHaveBeenCalled();
        });
        it('should return the same result as from parseResponse when parsing RESPONSE command', () => {
            expect(controlPointService.parseCommand(createResponseArray)).toEqual(controlPointService.parseResponse(createResponseArray));
        })
    });
});

describe('parseResponse', () => {
    let controlPointService = new ControlPointService();

    // Success responses.
    const createResponseArray = [0x60, 0x01, 0x01];
    const createResponseObject = {command: 0x60, requestOpcode: 0x01, resultCode: 0x01};
    const setPrnResponseArray = [0x60, 0x02, 0x01];
    const setPrnResponseObject = {command: 0x60, requestOpcode: 0x02, resultCode: 0x01};
    const calculateCrcResponseArray = [0x60, 0x03, 0x01, 0x34, 0x12, 0x00, 0x00, 0x78, 0x56, 0x00, 0x00];
    const calculateCrcResponseObject = {command: 0x60, requestOpcode: 0x03, resultCode: 0x01, offset: 0x1234, crc32: 0x5678};
    const executeResponseArray = [0x60, 0x04, 0x01];
    const executeResponseObject = {command: 0x60, requestOpcode: 0x04, resultCode: 0x01};
    const selectResponseArray = [0x60, 0x06, 0x01, 0x34, 0x12, 0x00, 0x00, 0x78, 0x56, 0x00, 0x00, 0xBC, 0x9A, 0x00, 0x00];
    const selectResponseObject = {command: 0x60, requestOpcode: 0x06, resultCode: 0x01, maximumSize: 0x1234, offset: 0x5678, crc32: 0x9ABC};

    // Operation failed responses.
    const failedCreateResponseArray = [0x60, 0x01, 0x0A];
    const failedCreateResponseObject = {command: 0x60, requestOpcode: 0x01, resultCode: 0x0A};
    const failedSetPrnResponseArray = [0x60, 0x02, 0x0A];
    const failedSetPrnResponseObject = {command: 0x60, requestOpcode: 0x02, resultCode: 0x0A};
    const failedCalculateCrcResponseArray = [0x60, 0x03, 0x0A];
    const failedCalculateCrcResponseObject = {command: 0x60, requestOpcode: 0x03, resultCode: 0x0A};
    const failedExecuteResponseArray = [0x60, 0x04, 0x0A];
    const failedExecuteResponseObject = {command: 0x60, requestOpcode: 0x04, resultCode: 0x0A};
    const failedSelectResponseArray = [0x60, 0x06, 0x0A];
    const failedSelectResponseObject = {command: 0x60, requestOpcode: 0x06, resultCode: 0x0A};

    describe('when parsing responses', () => {
        it('should parse CREATE response', () => {
            expect(controlPointService.parseResponse(createResponseArray)).toEqual(createResponseObject);
            expect(controlPointService.parseResponse(failedCreateResponseArray)).toEqual(failedCreateResponseObject);
        });
        it('should parse SET_PRN response', () => {
            expect(controlPointService.parseResponse(setPrnResponseArray)).toEqual(setPrnResponseObject);
            expect(controlPointService.parseResponse(failedSetPrnResponseArray)).toEqual(failedSetPrnResponseObject);
        });
        it('should parse CALCULATE_CRC response', () => {
            expect(controlPointService.parseResponse(calculateCrcResponseArray)).toEqual(calculateCrcResponseObject);
            expect(controlPointService.parseResponse(failedCalculateCrcResponseArray)).toEqual(failedCalculateCrcResponseObject);
        });
        it('should parse EXECUTE response', () => {
            expect(controlPointService.parseResponse(executeResponseArray)).toEqual(executeResponseObject);
            expect(controlPointService.parseResponse(failedExecuteResponseArray)).toEqual(failedExecuteResponseObject);
        });
        it('should parse SELECT response', () => {
            expect(controlPointService.parseResponse(selectResponseArray)).toEqual(selectResponseObject);
            expect(controlPointService.parseResponse(failedSelectResponseArray)).toEqual(failedSelectResponseObject);
        });
    });

});
