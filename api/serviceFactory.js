'use strict';

const Service = require('./service');
const Characteristic = require('./characteristic');
const Descriptor = require('./descriptor');

class ServiceFactory {
    constructor() {
    }

    createService(uuid, serviceType) {
        if (!serviceType) serviceType = 'primary';
        return new Service('local', uuid, serviceType);
    }

    // returns Characteristic
    createCharacteristic(service, uuid, value, properties) {
        if (!service) throw new Error('Service to add characteritics to must be provided.');

        if (service._factory_characteristics === undefined) {
            service._factory_characteristics = [];
        }

        const characteristic = new Characteristic(
            service.instanceId,
            uuid,
            value,
            properties);

        service._factory_characteristics.push(characteristic);
        return characteristic;
    }

    createDescriptor(characteristic, uuid, value) {
        if (!characteristic) throw new Error('Characteristic to add descriptor to must be provided.');

        if (characteristic._factory_descriptors === undefined) {
            characteristic._factory_descriptors = [];
        }

        const descriptor = new Descriptor(characteristic.instanceId, uuid, value);

        characteristic._factory_descriptors.push(descriptor);
        return descriptor;
    }
}

module.exports = ServiceFactory;
