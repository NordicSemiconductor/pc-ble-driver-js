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

const EventEmitter = require('events');
const NotificationQueue = require('../notificationQueue');
const ControlPointOpcode = require('../../dfuConstants').ControlPointOpcode;
const ResultCode = require('../../dfuConstants').ResultCode;
const ErrorCode = require('../../dfuConstants').ErrorCode;

describe('listening', () => {

    let adapter;
    let notificationQueue;

    beforeEach(() => {
        adapter = {
            on: jest.fn(),
            removeListener: jest.fn()
        };
        notificationQueue = new NotificationQueue(adapter);
    });

    describe('when startListening is called', () => {

        it('should listen to characteristic value changes', () => {
            notificationQueue.startListening();
            expect(adapter.on).toHaveBeenCalled();
            const firstArgument = adapter.on.mock.calls[0][0];
            expect(firstArgument).toEqual('characteristicValueChanged');
        });

    });

    describe('when stopListening is called', () => {

        it('should stop listening to characteristic value changes', () => {
            notificationQueue.stopListening();
            expect(adapter.removeListener).toHaveBeenCalled();
            const firstArgument = adapter.removeListener.mock.calls[0][0];
            expect(firstArgument).toEqual('characteristicValueChanged');
        });

        it('should clear notifications', () => {
            notificationQueue._notifications = [1, 2, 3];
            notificationQueue.stopListening();
            expect(notificationQueue._notifications).toEqual([]);
        });

    });
});

describe('readNext', () => {

    const characteristicId = 123;
    let adapter = {
        on: jest.fn()
    };
    let notificationQueue;

    beforeEach(() => {
        adapter = new EventEmitter();
        notificationQueue = new NotificationQueue(adapter, characteristicId);
        notificationQueue.startListening();
    });

    afterEach(() => {
        notificationQueue.stopListening();
    });

    describe('when reading latest CALCULATE_CRC response', () => {

        describe('when no notifications emitted', () => {

            it('should time out with error code and message', () => {
                jest.useFakeTimers();
                const promise = notificationQueue.readNext(ControlPointOpcode.CALCULATE_CRC).catch(error => {
                    expect(error.code).toEqual(ErrorCode.NOTIFICATION_TIMEOUT);
                    expect(error.message).toEqual(`Timed out while waiting for response ` +
                        `to operation code ${ControlPointOpcode.CALCULATE_CRC} (CALCULATE_CRC)`);
                });
                jest.runOnlyPendingTimers();
                return promise;
            });

        });

        describe('when notification emitted for other characteristic id', () => {

            const notification = {
                _instanceId: 456
            };

            it('should time out', () => {
                jest.useFakeTimers();
                const promise = notificationQueue.readNext(ControlPointOpcode.CALCULATE_CRC).catch(error => {
                    expect(error.code).toEqual(ErrorCode.NOTIFICATION_TIMEOUT);
                });
                adapter.emit('characteristicValueChanged', notification);
                jest.runOnlyPendingTimers();
                return promise;
            });

        });

        describe('when notification emitted for given characteristic, but opcode is something other than RESPONSE', () => {

            const notification = {
                _instanceId: 123,
                value: [ControlPointOpcode.SELECT]
            };

            it('should time out', () => {
                jest.useFakeTimers();
                const promise = notificationQueue.readNext(ControlPointOpcode.CALCULATE_CRC).catch(error => {
                    expect(error.code).toEqual(ErrorCode.NOTIFICATION_TIMEOUT);
                });
                adapter.emit('characteristicValueChanged', notification);
                jest.runOnlyPendingTimers();
                return promise;
            });

        });

        describe('when RESPONSE notification emitted for given characteristic, but command is not CALCULATE_CRC', () => {

            const notification = {
                _instanceId: 123,
                value: [ControlPointOpcode.RESPONSE, ControlPointOpcode.SELECT]
            };

            it('should return error code and message', () => {
                jest.useFakeTimers();
                const promise = notificationQueue.readNext(ControlPointOpcode.CALCULATE_CRC).catch(error => {
                    expect(error.code).toEqual(ErrorCode.UNEXPECTED_NOTIFICATION);
                    expect(error.message).toEqual(`Got unexpected response from DFU Target. ` +
                        `Expected response to operation code ${ControlPointOpcode.CALCULATE_CRC} ` +
                        `(CALCULATE_CRC), but got response to operation code ${ControlPointOpcode.SELECT} (SELECT)`);
                });
                adapter.emit('characteristicValueChanged', notification);
                jest.runOnlyPendingTimers();
                return promise;
            });

        });

        describe('when CALCULATE_CRC response notification emitted for given characteristic, but status is not SUCCESS', () => {

            const notification = {
                _instanceId: 123,
                value: [ControlPointOpcode.RESPONSE, ControlPointOpcode.CALCULATE_CRC, ResultCode.OPERATION_FAILED]
            };

            it('should return error code and message', () => {
                jest.useFakeTimers();
                const promise = notificationQueue.readNext(ControlPointOpcode.CALCULATE_CRC).catch(error => {
                    expect(error.code).toEqual(ErrorCode.COMMAND_ERROR);
                    expect(error.message).toEqual(`Operation code ${ControlPointOpcode.CALCULATE_CRC} ` +
                        `(CALCULATE_CRC) failed on DFU Target. Result code ${ResultCode.OPERATION_FAILED} ` +
                        `(OPERATION_FAILED)`);
                });
                adapter.emit('characteristicValueChanged', notification);
                jest.runOnlyPendingTimers();
                return promise;
            });

        });

        describe('when successful notification emitted for given characteristic', () => {

            const notification = {
                _instanceId: 123,
                value: [ControlPointOpcode.RESPONSE, ControlPointOpcode.CALCULATE_CRC, ResultCode.SUCCESS, 1, 2, 3]
            };

            it('should return notification payload', () => {
                jest.useFakeTimers();
                const promise = notificationQueue.readNext(ControlPointOpcode.CALCULATE_CRC).then(response => {
                    expect(response).toEqual(notification.value);
                });
                adapter.emit('characteristicValueChanged', notification);
                jest.runOnlyPendingTimers();
                return promise;
            });

        });

        describe('when successful notification already present for given characteristic', () => {

            const notification = {
                _instanceId: 123,
                value: [ControlPointOpcode.RESPONSE, ControlPointOpcode.CALCULATE_CRC, ResultCode.SUCCESS, 1, 2, 3]
            };

            it('should return notification payload', () => {
                notificationQueue._notifications = [notification];
                return notificationQueue.readNext(ControlPointOpcode.CALCULATE_CRC).then(response => {
                    expect(response).toEqual(notification.value);
                });
            });

        });
    });
});
