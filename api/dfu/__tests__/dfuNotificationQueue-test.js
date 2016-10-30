'use strict';

const EventEmitter = require('events');
const DfuNotificationQueue = require('../dfuNotificationQueue');
const { ControlPointOpcode, ResultCode } = require('../dfuConstants');

describe('listening', () => {

    let adapter;
    let notificationQueue;

    beforeEach(() => {
        adapter = {
            on: jest.fn(),
            removeListener: jest.fn()
        };
        notificationQueue = new DfuNotificationQueue(adapter);
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
        notificationQueue = new DfuNotificationQueue(adapter, characteristicId);
        notificationQueue.startListening();
    });

    afterEach(() => {
        notificationQueue.stopListening();
    });

    describe('when reading latest CALCULATE_CRC response', () => {

        describe('when no notifications emitted', () => {

            it('should time out', () => {
                jest.useFakeTimers();
                const promise = notificationQueue.readNext(ControlPointOpcode.CALCULATE_CRC).catch(error => {
                    expect(error).toContain('Timed out');
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
                    expect(error).toContain('Timed out');
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
                    expect(error).toContain('Timed out');
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

            it('should return error', () => {
                jest.useFakeTimers();
                const promise = notificationQueue.readNext(ControlPointOpcode.CALCULATE_CRC).catch(error => {
                    expect(error.message).toContain('Got unexpected response');
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

            it('should return error', () => {
                jest.useFakeTimers();
                const promise = notificationQueue.readNext(ControlPointOpcode.CALCULATE_CRC).catch(error => {
                    expect(error.message).toContain('returned error code');
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

