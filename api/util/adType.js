'use strict';

const AD_PACKET_MAX_SIZE = 20;

let flagsTypeMarshaller = function(buf, offset, flags) {
    let value = 0x00;

    for(let flag in flags) {
        switch(flags[flag]) {
            case 'leLimitedDiscMode':
                value |= 0x01;
                break;
            case 'leGeneralDiscMode':
                value |= 0x02;
                break;
            case 'brEdrNotSupported':
                value |= 0x04;
                break;
            case 'leBrEdrController':
                value |= 0x08;
                break;
            case 'leBrEdrHost':
                value |= 0x10;
                break;
            default:
                throw new Error(`Unknown flag ${flags[flag]}`);
        }
    }

    console.log('flags: ' + value);
    return buf.writeUInt8(value, offset);
};

let listOf16BitServiceUuidsMarshaller = function(buf, offset, uuids) {
    return buf.writeUInt8(ret, offset);
};

let listOf32BitServiceUuidsMarshaller = function(buf, offset, uuids) {
    return buf.writeUInt8(ret, offset);
};

let listOf128BitServiceUuidsMarshaller = function(buf, offset, uuids) {
    return buf.writeUInt8(ret, offset);
};

let txPowerLevelMarshaller = function(buf, offset, powerLevel) {
    if(powerLevel < -127 || powerLevel > 127) {
        throw new Error('powerLevel is outside acceptable levels (-127 to +127 dBm)');
    }

    var value = powerLevel + 127;
    return buf.writeUInt8(value, offset);
};

const adTypeConverter = {
    flags: { id: 0x01, marshall: flagsTypeMarshaller },

    incompleteListOf16BitServiceUuids:  { id: 0x02, marshall: listOf16BitServiceUuidsMarshaller },
    completeListOf16BitServiceUuids:    { id: 0x03, marshall: listOf16BitServiceUuidsMarshaller },
    incompleteListOf32BitServiceUuids:  { id: 0x04, marshall: listOf32BitServiceUuidsMarshaller },
    completeListOf32BitServiceUuids:    { id: 0x05, marshall: listOf32BitServiceUuidsMarshaller },
    incompleteListOf128BitServiceUuids: { id: 0x06, marshall: listOf128BitServiceUuidsMarshaller },
    completeListOf128BitServiceUuids:   { id: 0x07, marshall: listOf128BitServiceUuidsMarshaller },

    shortenedLocalName: { id: 0x08, marshall: function(buf, offset, name) { return buf.write(name, offset, name.length, 'binary') + offset; } },
    completeLocalName:  { id: 0x09, marshall: function(buf, offset, name) { return buf.write(name, offset, name.length, 'binary') + offset; } },

    txPowerLevel:  { id: 0x0a, marshall: txPowerLevelMarshaller },
    classOfDevice: { id: 0x0d, marshall: function(buf, offset, name) { throw new Error('not implemented'); } },

    simplePairingHashC:       { id: 0x0e, marshall: function(buf, offset, name) { throw new Error('not implemented'); } },
    simplePairingRandomizerR: { id: 0x0f, marshall: function(buf, offset, name) { throw new Error('not implemented'); } },
    securityManagerTkValue:   { id: 0x10, marshall: function(buf, offset, name) { throw new Error('not implemented'); } },
    securityManagerOobFlags:  { id: 0x11, marshall: function(buf, offset, name) { throw new Error('not implemented'); } },
    slaveConnectionIntervalRange: { id: 0x12, marshall: function(buf, offset, name) { throw new Error('not implemented'); } },

    solicitedServiceUuids16bit:  { id: 0x14, marshall: function(buf, offset, name) { throw new Error('not implemented'); } },
    solicitedServiceUuids128bit: { id: 0x15, marshall: function(buf, offset, name) { throw new Error('not implemented'); } },

    serviceData: { id: 0x16, marshall: function(buf, offset, name) { throw new Error('not implemented'); } },

    publicTargetAddress: { id: 0x17, marshall: function(buf, offset, name) { throw new Error('not implemented'); } },
    randomTargetAddress: { id: 0x18, marshall: function(buf, offset, name) { throw new Error('not implemented'); } },

    appearance: { id: 0x19, marshall: function(buf, offset, name) { throw new Error('not implemented'); } },

    advertisingInterval: { id: 0x1a, marshall: function(buf, offset, name) { throw new Error('not implemented'); } },

    leBluetoothDeviceAddress: { id: 0x1b, marshall: function(buf, offset, name) { throw new Error('not implemented'); } },
    leRole: { id: 0x1c, marshall: function(buf, offset, name) { throw new Error('not implemented'); } },

    simplePairingHashC256:       { id: 0x1d, marshall: function(buf, offset, name) { throw new Error('not implemented'); } },
    simplePairingRandomizerR256: { id: 0x1e, marshall: function(buf, offset, name) { throw new Error('not implemented');} },

    serviceData32bitUuid:  { id: 0x20, marshall: function(buf, offset, name) { throw new Error('not implemented'); } },
    serviceData128bitUuid: { id: 0x21, marshall: function(buf, offset, name) { throw new Error('not implemented'); } },

    '3dInformationData': { id: 0x3d, marshall: function(buf, offset, name) { throw new Error('not implemented'); } },

    manufacturerSpecificData: { id: 0xff, marshall: function(buf, offset, name) { throw new Error('not implemented'); } }
};

class AdType {
    /**
     * @brief Converts advertisement object to buffer
     *
     */
    static convertToBuffer(obj) {
        let buffer = new Buffer(AD_PACKET_MAX_SIZE);
        console.log('byte length:' + Buffer.byteLength('1', 'binary'));
        buffer.fill(0);
        var bufferPosition = 0;

        for(let property in obj) {
            if(obj.hasOwnProperty(property)) {
                let conv = adTypeConverter[property];

                if(conv !== undefined) {
                    let len = 0;
                    let startPos = bufferPosition;
                    console.log('');
                    console.log('0 -- property: ' + property + ' value:\'' + obj[property]+ '\'' + ' startPos:' + startPos);

                    console.log('1 -- pos is: ' + bufferPosition + ' len is: ' + len + ' conv.id: ' + conv.id);
                    bufferPosition = buffer.writeUInt8(conv.id, bufferPosition + 1); // AD Type
                    console.log('2 -- pos is: ' + bufferPosition);
                    bufferPosition = conv.marshall(buffer, bufferPosition, obj[property]); // AD Data
                    console.log('3 -- pos is: ' + bufferPosition);

                    let length = bufferPosition - startPos - 1;
                    console.log('4 -- length: ' + length + ' at startPos:' + startPos);
                    buffer.writeUInt8(length, startPos, true); // AD Length

                    console.log(buffer.toJSON());
                }
            }
        }

        return buffer.slice(0, bufferPosition - 1);
    }

    /**
     * @brief Generates a decoded representation of the data in the buffer
     *
     */
    static convertFromBuffer(buffer) {

    }
}

module.exports = AdType;