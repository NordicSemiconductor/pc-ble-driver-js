'use strict';

const Service = require('./service');
const Characteristic = require('./characteristic');
const Descriptor = require('./descriptor');

class ServiceFactory {
    constructor(database) {
        if (database) {
            this._database = database;
        }
    }

    createService(uuid) {
        if (this._database) {
            // TODO: use database to retrieve name? what should the name be used for? no getter for service name...
        }

        return new Service('local', uuid);
    }

    // returns Characteristic
    createCharacteristic(service, properties) {
        if(!service) throw new Error('Service to add characteritics to must be provided.');

        if (this._database) {
            // TODO: use database to retrieve name? what should the name be used for? no getter for characteristic name...
        }

        if(service._factory_characteristics === undefined) {
            service._factory_characteristics = [];
        }

        const characteristic = new Characteristic(service.instanceId, properties);
        service._factory_characteristics.push(characteristic);
        return characteristic;
    }

    createDescriptor(characteristic, uuid, value) {
        if (this._database) {
            // TODO: use database to retrieve name? what should the name be used for? no getter for decriptor name...
        }

        const descriptor = new Descriptor(characteristic, uuid, value);
        characteristic._factory_descriptors[descriptor.instanceId] = descriptor;
        return descriptor;
    }
}

module.exports = ServiceFactory;
