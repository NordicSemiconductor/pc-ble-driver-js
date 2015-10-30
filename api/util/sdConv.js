'use strict';

class SoftDeviceConverter {
    constructor(bleDriver) {
        this._bleDriver = bleDriver;
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

        return {sm: sm, lv: lv};
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
            // TODO: add UUID to a API register, if it does not exist in register, call function below
            this._bleDriver.add_vs_uuid({ uuid128: uuid }, (err, type) => {
                if (err) {
                    callback(err);
                    return;
                }

                retval.type = type;
                retval.uuid = uuid; // TODO: Use callback function to retrieve 16-bit version of UUID
                callback(undefined, retval);
            });
        } else {
            callback(`Unknown UUID ${uuid} received.`);
        }
    }

    descriptorToDriver(descriptor, callback) {
        var err = '';

        // Check if mandatory attributes are present in the characteristic object
        if (!descriptor.uuid) err = 'UUID must be provided. ';
        if (!descriptor.value) err += 'value must be provided. ';
        if (!descriptor.properties) err += 'properties must be provided. ';
        if (!descriptor.properties.maxLength) err += 'maxLength must be provided. ';

        if (err.length !== 0) {
            callback(err);
            return;
        }

        console.log('D->: SRC: ' + JSON.stringify(descriptor, null, 1));

        // Now let's start converting
        var retval = {};
        retval.p_attr_md = {};

        this.uuidToDriver(descriptor.uuid, (err, uuid) => {
            if (err) {
                console.log('Error converting uuid to driver.');
                callback(err);
                return;
            }

            retval.p_uuid = uuid;

            retval.p_attr_md.read_perm = SoftDeviceConverter.securityModeToDriver(descriptor.properties.readPerm);
            retval.p_attr_md.write_perm = SoftDeviceConverter.securityModeToDriver(descriptor.properties.writePerm);
            retval.p_attr_md.vloc = this._bleDriver.BLE_GATTS_VLOC_STACK; // Attribute Value is located in stack memory, no user memory is required.
            retval.p_attr_md.vlen = descriptor.properties.variableLength || false; // TODO: validate purpose of this varible
            retval.p_attr_md.rd_auth = descriptor.properties.readAuth || false;
            retval.p_attr_md.wr_auth = descriptor.properties.writeAuth || false;

            retval.init_len = descriptor.value.length;
            retval.init_offs = 0;
            retval.max_len = descriptor.properties.maxLength || retval.init_len;
            retval.p_value = descriptor.value;

            console.log('D -> DST: ' + JSON.stringify(retval, null, 1));

            callback(undefined, retval);
        });
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
        if (!characteristic.properties.maxLength) err += 'maxLength must be provided. ';

        if (err.length !== 0) {
            callback(err);
            return;
        }

        console.log('SRC: ' + JSON.stringify(characteristic, null, 1));

        // Now let's start converting
        var retval = {};
        retval.metadata = {};
        retval.metadata.char_props = {};
        retval.metadata.char_ext_props = {};
        retval.attribute = {};
        retval.attribute.p_attr_md = {};

        var props = retval.metadata.char_props;
        props.broadcast = characteristic.properties.properties.broadcast || false;
        props.read = characteristic.properties.properties.read || false;
        props.write_wo_resp = characteristic.properties.properties.writeWoResp || false;
        props.write = characteristic.properties.properties.write || false;
        props.notify = characteristic.properties.properties.notify || false;
        props.indicate = characteristic.properties.properties.indicate || false;
        props.auth_signed_wr = characteristic.properties.properties.authSignedWr || false;

        retval.metadata.char_ext_props.reliable_wr = characteristic.properties.properties.reliableWrite || false;
        retval.metadata.char_ext_props.wr_aux = false;

        retval.metadata.char_user_desc_max_size = 0; // TODO: check what this is used for
        retval.metadata.char_user_desc_size = 0; // TODO: check what this is used for

        this.uuidToDriver(characteristic.uuid, (err, uuid) => {
            if (err) {
                callback(err);
                return;
            }

            retval.attribute.p_uuid = uuid;

            retval.attribute.p_value = characteristic.value;
            retval.attribute.p_attr_md.read_perm = SoftDeviceConverter.securityModeToDriver(characteristic.properties.readPerm);
            retval.attribute.p_attr_md.write_perm = SoftDeviceConverter.securityModeToDriver(characteristic.properties.writePerm);
            retval.attribute.p_attr_md.vloc = this._bleDriver.BLE_GATTS_VLOC_STACK; // Attribute Value is located in stack memory, no user memory is required.
            retval.attribute.p_attr_md.vlen = characteristic.properties.variableLength || false;
            retval.attribute.p_attr_md.rd_auth = characteristic.properties.readAuth || false;
            retval.attribute.p_attr_md.wr_auth = characteristic.properties.writeAuth || false;
            retval.attribute.init_len = characteristic.value.length;
            retval.attribute.init_offs = 0;
            retval.attribute.max_len = characteristic.properties.maxLength || retval.attribute.init_len;

            console.log('DST: ' + JSON.stringify(retval, null, 1));
            callback(undefined, retval);
        });
    }
}

module.exports = SoftDeviceConverter;
