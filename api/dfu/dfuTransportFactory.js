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

    static create(transportParameters) {
        let adapter = transportParameters.adapter;
        let targetAddress = transportParameters.targetAddress;
        const prnValue = transportParameters.prnValue;
        const mtuSize = transportParameters.mtuSize;

        let transport = null;

        return DfuTransportFactory._getCharacteristicIds(adapter, adapter._getDeviceByAddress(targetAddress).instanceId)
            .then(ids => new DfuTransport(adapter, ids.controlPointCharacteristicId, ids.packetCharacteristicId))
            .then(t => transport = t)
            .then(prnValue ? () => transport.setPrn(prnValue) : Promise.resolve())
            .then(mtuSize ? () => transport.setMtuSize(mtuSize) : Promise.resolve())
            .then(() => { return transport; });
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
