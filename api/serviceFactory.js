'use strict';

const Service = require('./service');
const Characteristic = require('./characteristic');
const Descriptor = require('./descriptor');

class ServiceFactory {
    constructor(database) {
        if (database) {
            this.database = database;
        }
    }

    createService(uuid) {
        if (this.database) {
            // TODO: use database to retrieve name? what should the name be used for? no getter for service name...
        }

        return new Service('local', uuid);
    }

    // returns Characteristic
    createCharacteristic(service, uuid, properties, value, security) {
        if (this.database) {
            // TODO: use database to retrieve name? what should the name be used for? no getter for characteristic name...
        }

        const characteristic = new Characteristic(service.instanceId, uuid, properties, value);
        service._factory_characteristics[characteristic.instanceId] = characteristic;
        return characteristic;
    }

    createDescriptor(characteristic, uuid, value) {
        if (this.database) {
            // TODO: use database to retrieve name? what should the name be used for? no getter for decriptor name...
        }

        const descriptor = new Descriptor(characteristic.instanceId, uuid, value);
        characteristic._factory_descriptors[descriptor.instanceId] = descriptor;
        return descriptor;
    }
}

module.exports = ServiceFactory;
