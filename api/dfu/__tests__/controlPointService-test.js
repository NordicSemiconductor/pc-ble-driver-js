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

    describe('when notification store returns response', () => {

        let adapter;
        let controlPointService;
        let notificationStore;

        beforeEach(() => {
            adapter = {
                writeCharacteristicValue: (id, command, ack, callback) => callback()
            };
            notificationStore = {
                startListening: jest.fn(),
                stopListening: jest.fn(),
                readLatest: () => Promise.resolve([1, 2, 3])
            };
            controlPointService = new ControlPointService(adapter);
            controlPointService._notificationStore = notificationStore;
        });

        it('should return response', () => {
            return controlPointService._sendCommand({}).then(response => {
                expect(response).toEqual([1, 2, 3]);
            });
        });

        it('should stop listening for response notifications', () => {
            return controlPointService._sendCommand({}).then(() => {
                expect(notificationStore.stopListening).toHaveBeenCalled();
            });
        });

    });

});

