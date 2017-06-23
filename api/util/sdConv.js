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

class SoftDeviceConverter {
    constructor(bleDriver, adapter) {
        this._bleDriver = bleDriver;
        this._adapter = adapter;

        this.vsUuidStore = [];
    }

    static securityModeToDriver(mode) {
        let sm;
        let lv;

        if (!mode) throw new Error('mode must be specified.');

        for (let m of mode) {
            switch (m) {
                case 'open':
                    if (sm !== undefined || lv !== undefined) throw new Error('Illegal combination.');
                    sm = 1; lv = 1;
                    break;
                case 'no-access':
                    if (sm !== undefined || lv !== undefined) throw new Error('Illegal combination.');
                    sm = 0; lv = 0;
                    break;
                case 'encrypt':
                    if (sm !== undefined) throw new Error('Illegal combination.');
                    sm = 1;
                    break;
                case 'lesc':
                    if (sm !== undefined) throw new Error('Illegal combination.');
                    sm = 1; lv = 4;
                    break;
                case 'signed':
                    if (sm !== undefined) throw new Error('Illegal combination.');
                    sm = 2;
                    break;
                case 'mitm-protection':

                    // This one we have to handle after all other elements have been processed
                    break;
                default:
                    throw new Error(`Huh? I've never heard of security mode ${mode}`);
            }
        }

        if (!sm) throw new Error('Mode not specified. Can be: \'open\', \'no-access\', \'encrypt\', \'signed\'.');

        if (mode.indexOf('mitm-protection') != -1) {
            if (sm == 1) lv = 3;
            if (sm == 2) lv = 2;
        } else if (lv === undefined) {
            if (sm == 1) lv = 2;
            if (sm == 2) lv = 1;
        }

        return { sm: sm, lv: lv };
    }

    /*
    static btAddressToDriver(address) {
        var retval = {};
        // Clean up the address
        address = address.replace(/-/g, '');

        if(address.length == x) {
        ...
        } else if(address.length ==  x) {
        ....
        } else {
            throw new Error('Not able to determine type of address (not 16-bit and not 128-bit).');
        }

        return retval;
    } */

    _replace16bitUuidIn128bitUuid(uuid128, uuid16) {
        return uuid128.slice(0, 4) + uuid16 + uuid128.slice(8);
    }

    // Callback: function(err, uuid)
    uuidToDriver(uuid, callback) {
        var retval = {};

        // Remove - in uuid because driver do not support that.
        uuid = uuid.replace(/-/g, '');

        // Try to register the UUID
        // TODO: cleanup UUID before validating length
        if (uuid.length == 4) {
            retval.type = this._bleDriver.BLE_UUID_TYPE_BLE; // Bluetooth SIG UUID (16-bit)
            retval.uuid = parseInt(uuid, 16);
            callback(undefined, retval);
        } else if (uuid.length == 32) {
            // Register UUID with SoftDevice
            const uuidBase = this._replace16bitUuidIn128bitUuid(uuid, '0000');
            const vsUuidIndex = this.vsUuidStore.indexOf(uuidBase);
            if (vsUuidIndex >= 0) {
                retval.type = vsUuidIndex + 2;
                retval.uuid = parseInt(uuid.slice(4, 8), 16);
                callback(undefined, retval);
                return;
            }

            this._adapter.addVendorspecificUUID({ uuid128: uuid }, (err, type) => {
                if (err) {
                    callback(err);
                    return;
                }

                this.vsUuidStore.push(uuidBase);
                retval.type = type;
                retval.uuid = parseInt(uuid.slice(4, 8), 16);
                callback(undefined, retval);
            });
        } else {
            callback(`Unknown UUID ${uuid} received.`);
        }
    }

    lookupVsUuid(uuid) {
        const uuidBase = this.vsUuidStore[uuid.type - 2];

        if (!uuidBase) {
            return 'Unknown 128 bit descriptor uuid ';
        }

        const uuid16bit = ('000' + uuid.uuid.toString(16)).slice(-4).toUpperCase();
        return this._replace16bitUuidIn128bitUuid(uuidBase, uuid16bit);
    }

    attributeMetadataToDriver(attribute) {
        var retval = {};

        retval.read_perm = SoftDeviceConverter.securityModeToDriver(attribute.readPerm);
        retval.write_perm = SoftDeviceConverter.securityModeToDriver(attribute.writePerm);
        retval.vloc = this._bleDriver.BLE_GATTS_VLOC_STACK; // Attribute Value is located in stack memory, no user memory is required.
        retval.vlen = attribute.variableLength || false; // TODO: validate purpose of this varible

        //TODO: Do these exists at any point?
        retval.rd_auth = attribute.readAuth || false;
        retval.wr_auth = attribute.writeAuth || false;

        return retval;
    }

    isSpecialUUID(uuid) {
        if (uuid === '2901') {
            return true;
        } else if (uuid === '2902') {
            return true;
        } else if (uuid === '2903') {
            return true;
        }

        return false;
    }

    descriptorToDriver(descriptor, callback) {
        var err = '';

        // Check if mandatory attributes are present in the characteristic object
        if (!descriptor.uuid) err = 'UUID must be provided. ';
        if (!descriptor.value) err += 'value must be provided. ';
        if (!descriptor.maxLength) err += 'maxLength must be provided. ';

        if (err.length !== 0) {
            callback(err);
            return;
        }

        // Now let's start converting
        var retval = {};
        retval.attr_md = {};

        this.uuidToDriver(descriptor.uuid, (err, uuid) => {
            if (err) {
                console.log('Error converting uuid to driver.');
                callback(err);
                return;
            }

            retval.uuid = uuid;

            retval.attr_md = this.attributeMetadataToDriver(descriptor);

            retval.init_len = descriptor.value.length;
            retval.init_offs = 0;
            retval.max_len = descriptor.maxLength || retval.init_len;
            retval.value = descriptor.value;

            callback(undefined, retval);
        });
    }

    getAttributeMetadataForSpecialDescriptor(characteristic, uuid) {
        if (characteristic._factory_descriptors === undefined) {
            return null;
        }

        var descriptorsLength = characteristic._factory_descriptors.length;

        for (var i = 0; i < descriptorsLength; i++) {
            var descriptor = characteristic._factory_descriptors[i];
            if (descriptor.uuid === uuid) {
                return this.attributeMetadataToDriver(descriptor);
            }
        }

        return null;
    }

    getPresentationFormat(characteristic) {
        //TODO: Implement
        return null;
    }

    characteristicToDriver(characteristic, callback) {
        /* INPUT
                        {
                uuid: 'be-ef', // Automatically determine type by uuid length (BT SIG: 16-bit, UUID: 128-bit)
                value: [1, 2, 3],
                maxLength: 3,
                readPerm: ['open'], // can be ['encrypt,'mitm-protection'], ['signed','mitm-protection'] or ['no-access'] default is ['open']
                writePerm: ['encrypt'],
                properties: { // BT properties
                    broadcast: true,
                    read: true,
                    write: true,
                    writeWoResp: true,
                    reliableWrite: false,
                    notify: false,
                    indicate: true
                }
            }

            https://github.com/NordicSemiconductor/pc-ble-driver-js/blob/1bc6ce7f8cbe98859863fea39245c5f8284ab458/examples/example_advertisement.js#L133

        */

        var err = '';

        // Check if mandatory attributes are present in the characteristic object
        if (!characteristic.uuid) err = 'UUID must be provided. ';
        if (!characteristic.value) err += 'value must be provided. ';
        if (!characteristic.properties) err += 'properties must be provided. ';
        if (!characteristic.maxLength) err += 'maxLength must be provided. ';

        if (err.length !== 0) {
            callback(err);
            return;
        }

        // Now let's start converting
        var retval = {};
        retval.metadata = {};
        retval.metadata.char_props = {};
        retval.metadata.char_ext_props = {};
        retval.attribute = {};
        retval.attribute.attr_md = {};

        var props = retval.metadata.char_props;
        props.broadcast = characteristic.properties.broadcast || false;
        props.read = characteristic.properties.read || false;
        props.write_wo_resp = characteristic.properties.writeWoResp || false;
        props.write = characteristic.properties.write || false;
        props.notify = characteristic.properties.notify || false;
        props.indicate = characteristic.properties.indicate || false;
        props.auth_signed_wr = characteristic.properties.authSignedWr || false;

        retval.metadata.char_ext_props.reliable_wr = characteristic.properties.reliableWr || false;
        retval.metadata.char_ext_props.wr_aux = characteristic.properties.wrAux || false;

        retval.metadata.char_user_desc_max_size = 0; // TODO: check what this is used for
        retval.metadata.char_user_desc_size = 0; // TODO: check what this is used for

        retval.metadata.char_pf = this.getPresentationFormat(characteristic);
        retval.metadata.user_desc_md = this.getAttributeMetadataForSpecialDescriptor(characteristic, '2901');
        retval.metadata.cccd_md = this.getAttributeMetadataForSpecialDescriptor(characteristic, '2902');
        retval.metadata.sccd_md = this.getAttributeMetadataForSpecialDescriptor(characteristic, '2903');

        this.uuidToDriver(characteristic.uuid, (err, uuid) => {
            if (err) {
                callback(err);
                return;
            }

            retval.attribute.uuid = uuid;

            retval.attribute.value = characteristic.value;
            retval.attribute.attr_md = this.attributeMetadataToDriver(characteristic);
            retval.attribute.init_len = characteristic.value.length;
            retval.attribute.init_offs = 0;
            retval.attribute.max_len = characteristic.maxLength || retval.attribute.init_len;

            callback(undefined, retval);
        });
    }
}

module.exports = SoftDeviceConverter;
