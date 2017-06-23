/* Copyright (c) 2010 - 2017, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Use in source and binary forms, redistribution in binary form only, with
 * or without modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions in binary form, except as embedded into a Nordic
 *    Semiconductor ASA integrated circuit in a product or a software update for
 *    such product, must reproduce the above copyright notice, this list of
 *    conditions and the following disclaimer in the documentation and/or other
 *    materials provided with the distribution.
 *
 * 2. Neither the name of Nordic Semiconductor ASA nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 *
 * 3. This software, with or without modification, must only be used with a Nordic
 *    Semiconductor ASA integrated circuit.
 *
 * 4. Any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

const Service = require('./service');
const Characteristic = require('./characteristic');
const Descriptor = require('./descriptor');

/**
 * Class that provides factory methods for creating `Service`, `Characteristic` and `Descriptor` instances.
 */
class ServiceFactory {
    /**
     * Factory method to create a service in the Bluetooth `Device's` 'local.server' GATT attribute table.
     *
     * @param {string} uuid A 128-bit or 16-bit unique identifier for this service.
     * @param {string} serviceType The server service type. 'primary' (default) or `secondary`.
     * @returns {Service} A newly created `Service` instance.
     */
    createService(uuid, serviceType) {
        serviceType = typeof serviceType !== 'undefined' ? serviceType : 'primary';
        return new Service('local.server', uuid, serviceType);
    }

    /**
     * Factory method to create a characteristic in the Bluetooth `Device's` GATT attribute table.
     *
     * @param {Service} service The `Service` instance this characteristic is to be added to.
     * @param {string} uuid A 128-bit or 16-bit unique identifier for this characteristic.
     * @param {array} value The initial value of this characteristic.
     * @param {Object} properties This GATT characteristic's metadata.
     * Available characteristic properties:
     *  <ul>
     *  <li>{boolean} broadcast: Broadcasting of the value permitted.
     *  <li>{boolean} read: Reading the value permitted.
     *  <li>{boolean} write: Writing the value with Write Request permitted.
     *  <li>{boolean} writeWoResp: Writing the value with Write Command permitted.
     *  <li>{boolean} reliableWrite: Writing the value with Queued Write operations permitted.
     *  <li>{boolean} notify: Notications of the value permitted.
     *  <li>{boolean} indicate: Indications of the value permitted.
     *  <li>{boolean} authSignedWr: Writing the value with Signed Write Command permitted.
     *  <li>{boolean} wrAux: Writing the Characteristic User Description descriptor permitted.
     *  </ul>
     * @param {Object} options This GATT characteristic's attribute's metadata.
     * Available characteristic options:
     *  <ul>
     *  <li>{string} readPerm: Read permissions.
     *  <li>{string} writePerm: Write permissions.
     *  <li>{boolean} variableLength: Variable length attribute.
     *  <li>{number} maxLength: Maximum attribute value length in bytes, see ref BLE_GATTS_ATTR_LENS_MAX for maximum values.
     *  <li>{boolean} readAuth: Read authorization and value will be requested from the application on every read operation.
     *  <li>{boolean} writeAuth: Write authorization will be requested from the application on every Write Request operation (but not Write Command).
     *  <li>Note: vloc = this._bleDriver.BLE_GATTS_VLOC_STACK; // Attribute Value is located in stack memory, no user memory is required.
     *  </ul>
     * @returns {Characteristic} A newly created `Characteristic` instance.
     */
    createCharacteristic(service, uuid, value, properties, options) {
        // TODO: we are mutating the service parameter here. May want to re-work this method.

        if (!service) {
            throw new Error('Service to add characteristics to must be provided.');
        }

        if (service._factory_characteristics === undefined) {
            service._factory_characteristics = [];
        }

        const characteristic = new Characteristic(service.instanceId, uuid, value, properties, options);

        service._factory_characteristics.push(characteristic);
        return characteristic;
    }

    /**
     * Factory method to create a descriptor in the Bluetooth `Device's` GATT attribute table.
     *
     * @param {Characteristic} characteristic The `Characteristic` instance this descriptor is to be added to.
     * @param {string} uuid A 128-bit or 16-bit unique identifier for this descriptor.
     * @param {array} value The initial value of this descriptor.
     * @param {Object} options This GATT descriptor's attribute's metadata.
     * Available descriptor options:
     * <ul>
     * <li>{string} readPerm: Read permissions.
     * <li>{string} writePerm: Write permissions.
     * <li>{boolean} variableLength: Variable length attribute.
     * <li>{number} maxLength: Maximum attribute value length in bytes, see ref BLE_GATTS_ATTR_LENS_MAX for maximum values.
     * <li>{boolean} readAuth: Read authorization and value will be requested from the application on every read operation.
     * <li>{boolean} writeAuth: Write authorization will be requested from the application on every Write Request operation (but not Write Command).
     * <li>Note: vloc = this._bleDriver.BLE_GATTS_VLOC_STACK; // Attribute Value is located in stack memory, no user memory is required.
     * </ul>
     * @returns {Descriptor} A newly created `Descriptor` instance.
     */
    createDescriptor(characteristic, uuid, value, options) {
        // TODO: we are mutating the characteristic parameter here. May want to re-work this method.

        if (!characteristic) {
            throw new Error('Characteristic to add descriptor to must be provided.');
        }

        if (characteristic._factory_descriptors === undefined) {
            characteristic._factory_descriptors = [];
        }

        const descriptor = new Descriptor(characteristic.instanceId, uuid, value, options);

        characteristic._factory_descriptors.push(descriptor);
        return descriptor;
    }
}

module.exports = ServiceFactory;
