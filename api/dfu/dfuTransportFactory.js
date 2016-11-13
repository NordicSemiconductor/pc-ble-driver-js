'use strict';

const DfuTransport = require('./dfuTransport');

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

        return Promise.resolve()
            .then(() => new DfuTransport(adapter, targetAddress, targetAddressType))
            .then(transport => {
                return Promise.resolve()
                    .then(() => transport.init())
                    .then(() => prnValue ? transport.setPrn(prnValue) : null)
                    .then(() => mtuSize ? transport.setMtuSize(mtuSize) : null)
                    .then(() => transport);
            });
    }

}

module.exports = DfuTransportFactory;
