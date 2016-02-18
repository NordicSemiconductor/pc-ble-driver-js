/* Copyright (c) 2016 Nordic Semiconductor. All Rights Reserved.
 *
 * The information contained herein is property of Nordic Semiconductor ASA.
 * Terms and conditions of usage are described in detail in NORDIC
 * SEMICONDUCTOR STANDARD SOFTWARE LICENSE AGREEMENT.
 *
 * Licensees are granted free, non-transferable use of the information. NO
 * WARRANTY of ANY KIND is provided. This heading must NOT be removed from
 * the file.
 *
 */

'use strict';

const Service = require('./service');
const Characteristic = require('./characteristic');
const Descriptor = require('./descriptor');

class ServiceFactory {
    constructor() {
    }

    createService(uuid, serviceType) {
        if (!serviceType) serviceType = 'primary';
        return new Service('local.server', uuid, serviceType);
    }

    // returns Characteristic
    createCharacteristic(service, uuid, value, properties, options) {
        if (!service) throw new Error('Service to add characteritics to must be provided.');

        if (service._factory_characteristics === undefined) {
            service._factory_characteristics = [];
        }

        const characteristic = new Characteristic(
            service.instanceId,
            uuid,
            value,
            properties,
            options);

        service._factory_characteristics.push(characteristic);
        return characteristic;
    }

    createDescriptor(characteristic, uuid, value, options) {
        if (!characteristic) throw new Error('Characteristic to add descriptor to must be provided.');

        if (characteristic._factory_descriptors === undefined) {
            characteristic._factory_descriptors = [];
        }

        const descriptor = new Descriptor(characteristic.instanceId, uuid, value, options);

        characteristic._factory_descriptors.push(descriptor);
        return descriptor;
    }
}

module.exports = ServiceFactory;
