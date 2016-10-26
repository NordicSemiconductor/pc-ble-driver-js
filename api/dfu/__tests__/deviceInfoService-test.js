'use strict';

const DeviceInfoService = require('../deviceInfoService');

describe('getCharacteristicId', () => {

    let service;
    let adapter;

    describe('when adapter throws error when getting attributes', () => {

        beforeEach(() => {
            adapter = {
                getAttributes: (id, callback) => callback('Some error')
            };
            service = new DeviceInfoService(adapter);
        });

        it('should return error', () => {
            return service.getCharacteristicId().catch(error => {
                expect(error).toEqual('Some error');
            });
        });
    });

    describe('when the device has a service with a characteristic', () => {

        beforeEach(() => {
            adapter = {
                getAttributes: (id, callback) => callback(null, {
                    services: {
                        'service-id-123': {
                            uuid: 'service-uuid-123',
                            characteristics: {
                                'characteristic-id-123': {
                                    uuid: 'characteristic-uuid-123'
                                }
                            }
                        }
                    }

                })
            };
            service = new DeviceInfoService(adapter);
        });

        describe('when asking for non-existing service uuid', () => {

            it('should return error', () => {
                const serviceUuid = 'non-existing-uuid';
                return service.getCharacteristicId(serviceUuid).catch(error => {
                    expect(error).toContain('Unable to find service');
                });
            });

        });

        describe('when asking for existing service uuid, but non-existing characteristic uuid', () => {

            it('should return error', () => {
                const serviceUuid = 'service-uuid-123';
                const characteristicUuid = 'non-existing-characteristic-uuid';
                return service.getCharacteristicId(serviceUuid, characteristicUuid).catch(error => {
                    expect(error).toContain('Unable to find characteristic');
                });
            });
        });

        describe('when asking for existing service uuid and characteristic uuid', () => {

            it('should return characteristic id', () => {
                const serviceUuid = 'service-uuid-123';
                const characteristicUuid = 'characteristic-uuid-123';
                return service.getCharacteristicId(serviceUuid, characteristicUuid).then(characteristicId => {
                    expect(characteristicId).toEqual('characteristic-id-123');
                });
            });
        });
    });
});
