'use strict';

const DfuTransport = require('./dfuTransport');
const DeviceInfoService = require('./deviceInfoService');

const SERVICE_UUID = 'FE59';
const DFU_CONTROL_POINT_UUID = '8EC90001F3154F609FB8838830DAEA50';
const DFU_PACKET_UUID = '8EC90002F3154F609FB8838830DAEA50';

class DfuTransportFactory {

    /**
     * Creates a DfuTransport instance for the given adapter and device.
     *
     * @param adapter the adapter instance
     * @param deviceInstanceId the device instance id
     * @returns promise that returns a new DfuTransport instance
     */
    static create(adapter, deviceInstanceId) {
        return DfuTransportFactory._getCharacteristicIds(adapter, deviceInstanceId)
            .then(ids => new DfuTransport(adapter, ids.controlPointCharacteristicId, ids.packetCharacteristicId));
    }

    static _getCharacteristicIds(adapter, deviceInstanceId) {
        const deviceInfoService = new DeviceInfoService(adapter, deviceInstanceId);
        return deviceInfoService.getCharacteristicId(SERVICE_UUID, DFU_CONTROL_POINT_UUID)
            .then(controlPointCharacteristicId => {
                return deviceInfoService.getCharacteristicId(SERVICE_UUID, DFU_PACKET_UUID)
                    .then(packetCharacteristicId => {
                        return {
                            controlPointCharacteristicId,
                            packetCharacteristicId
                        };
                    });
            });
    }

}

module.exports = DfuTransportFactory;
