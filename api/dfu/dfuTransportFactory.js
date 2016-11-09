'use strict';

const DfuTransport = require('./dfuTransport');
const DeviceInfoService = require('./deviceInfoService');

const SERVICE_UUID = 'FE59';
const DFU_CONTROL_POINT_UUID = '8EC90001F3154F609FB8838830DAEA50';
const DFU_PACKET_UUID = '8EC90002F3154F609FB8838830DAEA50';

class DfuTransportFactory {

    /**
     * Creates a DfuTransport instance for the given transport parameters,
     * trying to establish the connection first if necessary.
     *
     * @param transportParameters object containing
     * @returns promise that returns a new DfuTransport instance
     */

    static create(transportParameters) {
        let adapter = transportParameters.adapter;
        const targetAddress = transportParameters.targetAddress;
        const targetAddressType = transportParameters.targetAddressType;
        const prnValue = transportParameters.prnValue;
        const mtuSize = transportParameters.mtuSize;

        let transport = null;

        return DfuTransportFactory._connectIfNeeded(adapter, targetAddress, targetAddressType)
            .then(() => DfuTransportFactory._getCharacteristicIds(adapter, adapter._getDeviceByAddress(targetAddress).instanceId))
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


    static _connectIfNeeded(adapter, targetAddress, targetAddressType) {
        // if connected
        if (adapter && adapter._getDeviceByAddress(targetAddress)
                && adapter._getDeviceByAddress(targetAddress).connected) {
            return Promise.resolve();
        // not connected
        } else {
            return DfuTransportFactory._connect(adapter, targetAddress, targetAddressType);
        }
    }


    static _connect(adapter, targetAddress, targetAddressType) {

        const rejectOnCompleted = () => Promise.reject('Timed out while trying to connect.');
        const resolveOnCompleted = () => Promise.resolve();

        return new Promise((resolve, reject) => {
            if (adapter === null) {
                reject('Adapter not provided.');
            }

            const connectionParameters = {
                min_conn_interval: 7.5,
                max_conn_interval: 7.5,
                slave_latency: 0,
                conn_sup_timeout: 4000,
            };

            const scanParameters = {
                active: true,
                interval: 100,
                window: 50,
                timeout: 20,
            };

            const options = {
                scanParams: scanParameters,
                connParams: connectionParameters,
            }

            adapter.once('deviceConnected', resolveOnCompleted);
            adapter.once('connectTimedOut', rejectOnCompleted);

            adapter.connect(
                { address: targetAddress, type: targetAddressType },
                options,
                err => {
                    if (err) {
                        adapter.removeListener('deviceConnected', resolveOnCompleted);
                        adapter.removeListener('connectTimedOut', rejectOnCompleted);
                        reject(err);
                    }
                    resolve();
                }
            );
        }).then(() => {
            adapter.removeListener('deviceConnected', resolveOnCompleted);
            adapter.removeListener('connectTimedOut', rejectOnCompleted);
        });
    }

}

module.exports = DfuTransportFactory;
