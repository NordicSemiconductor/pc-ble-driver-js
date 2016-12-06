'use strict';

const ControlPointService = require('../controlPointService');
const { ErrorCode, createError } = require('../../dfuConstants');

describe('_sendCommand', () => {

    describe('when writing of characteristic value failed', () => {

        let adapter;
        let controlPointService;
        let notificationQueue;

        beforeEach(() => {
            adapter = {
                writeCharacteristicValue: (id, command, ack, callback) => {
                    callback(new Error());
                }
            };
            notificationQueue = {
                startListening: jest.fn(),
                stopListening: jest.fn()
            };
            controlPointService = new ControlPointService(adapter);
            controlPointService._notificationQueue = notificationQueue;
        });

        it('should return error', () => {
            return controlPointService._sendCommand({}).catch(error => {
                expect(error.code).toEqual(ErrorCode.WRITE_ERROR);
            });
        });

        it('should stop listening for response notifications', () => {
            return controlPointService._sendCommand({}).catch(() => {
                expect(notificationQueue.stopListening).toHaveBeenCalled();
            });
        });

    });

    describe('when error returned from notification queue', () => {

        let adapter;
        let controlPointService;
        let notificationQueue;

        beforeEach(() => {
            adapter = {
                writeCharacteristicValue: (id, command, ack, callback) => {
                    callback();
                }
            };
            notificationQueue = {
                startListening: jest.fn(),
                stopListening: jest.fn(),
                readNext: () => Promise.reject({message: 'Some error'})
            };
            controlPointService = new ControlPointService(adapter);
            controlPointService._notificationQueue = notificationQueue;
        });

        it('should re-throw error', () => {
            return controlPointService._sendCommand({}).catch(error => {
                expect(error).toBeDefined();
            });
        });

        it('should stop listening for response notifications', () => {
            return controlPointService._sendCommand({}).catch(() => {
                expect(notificationQueue.stopListening).toHaveBeenCalled();
            });
        });

    });

    describe('when notification queue returns response array', () => {

        let adapter;
        let controlPointService;
        let notificationQueue;
        const responseArray = [0x60, 0x01, 0x01];
        const responseObject = {command: 0x60, requestOpcode: 0x01, resultCode: 0x01};

        beforeEach(() => {
            adapter = {
                writeCharacteristicValue: (id, command, ack, callback) => callback()
            };
            notificationQueue = {
                startListening: jest.fn(),
                stopListening: jest.fn(),
                readNext: () => Promise.resolve(responseArray)
            };
            controlPointService = new ControlPointService(adapter);
            controlPointService._notificationQueue = notificationQueue;
        });

        it('should return response object', () => {
            return controlPointService._sendCommand({}).then(response => {
                expect(response).toEqual(responseObject);
            });
        });

        it('should stop listening for response notifications', () => {
            return controlPointService._sendCommand({}).then(() => {
                expect(notificationQueue.stopListening).toHaveBeenCalled();
            });
        });

    });

});

describe('parseCommand', () => {

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
            expect(ControlPointService.parseCommand(createCommandArray)).toEqual(createCommandObject);
        });
        it('should parse SET_PRN command', () => {
            expect(ControlPointService.parseCommand(setPrnCommandArray)).toEqual(setPrnCommandObject);
        });
        it('should parse CALCULATE_CRC command', () => {
            expect(ControlPointService.parseCommand(calculateCrcCommandArray)).toEqual(calculateCrcCommandObject);
        });
        it('should parse EXECUTE command', () => {
            expect(ControlPointService.parseCommand(executeCommandArray)).toEqual(executeCommandObject);
        });
        it('should parse SELECT command', () => {
            expect(ControlPointService.parseCommand(selectCommandArray)).toEqual(selectCommandObject);
        });
        it('should call parseResponse for parsing RESPONSE command', () => {
            // FIXME
            // In this test the function parseResponse is saved, mocked, then restored.
            // re-requiring after a call to jest.resetModules may offer a better solution.
            const parseResponseCopy = ControlPointService.parseResponse; // Save original function.
            ControlPointService.parseResponse = jest.fn();
            ControlPointService.parseCommand(createResponseArray);
            expect(ControlPointService.parseResponse).toHaveBeenCalled();
            ControlPointService.parseResponse = parseResponseCopy; // Restore original function.
        });
        it('should return the same result as from parseResponse when parsing RESPONSE command', () => {
            expect(ControlPointService.parseCommand(createResponseArray)).toEqual(ControlPointService.parseResponse(createResponseArray));
        });
    });
});

describe('parseResponse', () => {

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
            expect(ControlPointService.parseResponse(createResponseArray)).toEqual(createResponseObject);
            expect(ControlPointService.parseResponse(failedCreateResponseArray)).toEqual(failedCreateResponseObject);
        });
        it('should parse SET_PRN response', () => {
            expect(ControlPointService.parseResponse(setPrnResponseArray)).toEqual(setPrnResponseObject);
            expect(ControlPointService.parseResponse(failedSetPrnResponseArray)).toEqual(failedSetPrnResponseObject);
        });
        it('should parse CALCULATE_CRC response', () => {
            expect(ControlPointService.parseResponse(calculateCrcResponseArray)).toEqual(calculateCrcResponseObject);
            expect(ControlPointService.parseResponse(failedCalculateCrcResponseArray)).toEqual(failedCalculateCrcResponseObject);
        });
        it('should parse EXECUTE response', () => {
            expect(ControlPointService.parseResponse(executeResponseArray)).toEqual(executeResponseObject);
            expect(ControlPointService.parseResponse(failedExecuteResponseArray)).toEqual(failedExecuteResponseObject);
        });
        it('should parse SELECT response', () => {
            expect(ControlPointService.parseResponse(selectResponseArray)).toEqual(selectResponseObject);
            expect(ControlPointService.parseResponse(failedSelectResponseArray)).toEqual(failedSelectResponseObject);
        });
    });

});
