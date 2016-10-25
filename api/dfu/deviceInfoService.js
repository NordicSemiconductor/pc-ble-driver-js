'use strict';

class DeviceInfoService {

    /**
     * Creates a service that returns properties for a device.
     *
     * @param adapter a connected adapter instance
     * @param deviceInstanceId instance id for the device
     */
    constructor(adapter, deviceInstanceId) {
        this._adapter = adapter;
        this._deviceId = deviceInstanceId;
    }

    /**
     * Get the internal characteristic id for the given serviceUuid and
     * characteristicUuid.
     *
     * @param serviceUuid
     * @param characteristicUuid
     * @returns promise that returns characteristic id
     */
    getCharacteristicId(serviceUuid, characteristicUuid) {
        return this._adapter.getAttributes(this._deviceInstanceId)
            .then(attributeData => this._getService(attributeData, serviceUuid))
            .then(service => this._getCharacteristicIdFromService(service, characteristicUuid));
    }

    _getService(attributeData, serviceUuid) {
        const serviceIds = Object.keys(attributeData.services);
        const serviceId = serviceIds.find(id => {
            return attributeData.services[id].uuid === serviceUuid;
        });
        if (serviceId) {
            return Promise.resolve(attributeData.services[serviceId]);
        } else {
            return Promise.reject(`Unable to find service ${serviceUuid} for device ${this._deviceId}`);
        }
    }

    _getCharacteristicIdFromService(service, characteristicUuid) {
        const characteristicIds = Object.keys(service.characteristics);
        const characteristicId = characteristicIds.find(id => {
            return service.characteristics[id].uuid === characteristicUuid;
        });
        if (characteristicId) {
            return Promise.resolve(characteristicId);
        } else {
            return Promise.reject(`Unable to find characteristic ${characteristicUuid} for ` +
                `service ${service.uuid} on device ${this._deviceId}`);
        }
    }
}

module.exports = DeviceInfoService;