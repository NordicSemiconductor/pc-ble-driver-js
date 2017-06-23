/* Copyright (c) 2010 - 2017, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Use in source and binary forms, redistribution in binary form only, with
 * or without modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions in binary form, except as embedded into a Nordic
 *    Semiconductor ASA integrated circuit in a product or a software update for
 *    such product, must reproduce the above copyright notice, this list of
 *    conditions and the following disclaimer in the documentation and/or other
 *    materials provided with the distribution.
 *
 * 2. Neither the name of Nordic Semiconductor ASA nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 *
 * 3. This software, with or without modification, must only be used with a Nordic
 *    Semiconductor ASA integrated circuit.
 *
 * 4. Any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

const ControlPointService = require('../controlPointService');
const ControlPointOpcode = require('../../dfuConstants').ControlPointOpcode;
const ErrorCode = require('../../dfuConstants').ErrorCode;
const createError = require('../../dfuConstants').createError;

describe('_sendCommand', () => {

    describe('when writing of characteristic value failed', () => {

        let adapter;
        let controlPointService;
        let notificationQueue;

        beforeEach(() => {
            adapter = {
                writeCharacteristicValue: (id, command, ack, callback) => {
                    callback(new Error('Write failed'));
                }
            };
            notificationQueue = {
                startListening: jest.fn(),
                stopListening: jest.fn()
            };
            controlPointService = new ControlPointService(adapter);
            controlPointService._notificationQueue = notificationQueue;
        });

        it('should return error with message', () => {
            return controlPointService._sendCommand([ControlPointOpcode.CREATE]).catch(error => {
                expect(error.code).toEqual(ErrorCode.WRITE_ERROR);
                expect(error.message).toContain('Could not write CREATE command: Write failed');
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
        const errorMessage = 'Error from notification queue';

        beforeEach(() => {
            adapter = {
                writeCharacteristicValue: (id, command, ack, callback) => {
                    callback();
                }
            };
            notificationQueue = {
                startListening: jest.fn(),
                stopListening: jest.fn(),
                readNext: () => Promise.reject({message: errorMessage})
            };
            controlPointService = new ControlPointService(adapter);
            controlPointService._notificationQueue = notificationQueue;
        });

        it('should propagate error message', () => {
            return controlPointService._sendCommand([ControlPointOpcode.CREATE]).catch(error => {
                expect(error.message).toContain(errorMessage);
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
