
import Service from './service';
import Characteristic from './characteristic';
import Descriptor from './descriptor';

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

        let deviceInstanceId = 'local';
        return new Service(deviceInstanceId, uuid);
    }

    // returns Characteristic
    createCharacteristic(service, uuid, properties, value, security) {
        if (this.database) {
            // TODO: use database to retrieve name? what should the name be used for? no getter for service name...
        }

        let characteristic = new Characteristic(service.instanceId, uuid, properties, value);
        service.characteristics[characteristic.instanceId] = characteristic;
        return characteristic;
    }

    createDescriptor(characteristic, uuid, value) {
        if (this.database) {
            // TODO: use database to retrieve name? what should the name be used for? no getter for service name...
        }

        let descriptor = new Descriptor(characteristic.instanceId, uuid, value);
        characteristic.descriptors[descriptor.instanceId] = descriptor;
        return descriptor;
    }
}
