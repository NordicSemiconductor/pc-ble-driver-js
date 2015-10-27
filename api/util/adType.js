'use strict';

const AD_PACKET_MAX_SIZE = 20;

let cleanUpUuid = function(uuid) {
    return uuid.replace(/-/g, '');
};

let flagsTypeMarshaller = function(buf, offset, flags) {
    let value = 0x00;

    for (let flag in flags) {
        switch (flags[flag]) {
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

    return buf.writeUInt8(value, offset);
};

let serviceUuidsMarshaller = function(buf, offset, uuids) {
    // TODO: add uuids
    var pos = offset;

    for (let uuid in uuids) {
        var temp = new Buffer(cleanUpUuid(uuids[uuid]), 'hex');
        temp.copy(buf, pos, 0);
        pos += temp.length;
    }

    return pos;
};

let txPowerLevelMarshaller = function(buf, offset, powerLevel) {
    if (powerLevel < -127 || powerLevel > 127) {
        throw new Error('powerLevel is outside acceptable levels (-127 to +127 dBm)');
    }

    var value = powerLevel + 127;
    return buf.writeUInt8(value, offset);
};

const notImplemented = function(buf, offset, name) {
    throw new Error('Not implemented!');
};

const adTypeConverter = {
    flags: { id: 0x01, marshall: flagsTypeMarshaller },

    incompleteListOf16BitServiceUuids:  { id: 0x02, marshall: serviceUuidsMarshaller },
    completeListOf16BitServiceUuids:    { id: 0x03, marshall: serviceUuidsMarshaller },
    incompleteListOf32BitServiceUuids:  { id: 0x04, marshall: serviceUuidsMarshaller },
    completeListOf32BitServiceUuids:    { id: 0x05, marshall: serviceUuidsMarshaller },
    incompleteListOf128BitServiceUuids: { id: 0x06, marshall: serviceUuidsMarshaller },
    completeListOf128BitServiceUuids:   { id: 0x07, marshall: serviceUuidsMarshaller },

    shortenedLocalName: { id: 0x08, marshall: (buf, offset, name) => { return buf.write(name, offset, name.length, 'binary') + offset; }, },

    completeLocalName:  { id: 0x09, marshall: (buf, offset, name) => { return buf.write(name, offset, name.length, 'binary') + offset; } },

    txPowerLevel:  { id: 0x0a, marshall: txPowerLevelMarshaller },
    classOfDevice: { id: 0x0d, marshall: notImplemented },

    simplePairingHashC:       { id: 0x0e, marshall: notImplemented },
    simplePairingRandomizerR: { id: 0x0f, marshall: notImplemented },

    securityManagerTkValue:   { id: 0x10, marshall: notImplemented },
    securityManagerOobFlags:  { id: 0x11, marshall: notImplemented },

    slaveConnectionIntervalRange: { id: 0x12, marshall: notImplemented },
    solicitedServiceUuids16bit:  { id: 0x14, marshall: notImplemented },
    solicitedServiceUuids128bit: { id: 0x15, marshall: notImplemented },
    serviceData: { id: 0x16, marshall: notImplemented },
    publicTargetAddress: { id: 0x17, marshall: notImplemented },
    randomTargetAddress: { id: 0x18, marshall: notImplemented },
    appearance: { id: 0x19, marshall: notImplemented },
    advertisingInterval: { id: 0x1a, marshall: notImplemented },
    leBluetoothDeviceAddress: { id: 0x1b, marshall: notImplemented },
    leRole: { id: 0x1c, marshall: notImplemented },

    simplePairingHashC256:       { id: 0x1d, marshall: notImplemented },
    simplePairingRandomizerR256: { id: 0x1e, marshall: notImplemented },

    serviceData32bitUuid:  { id: 0x20, marshall: notImplemented },
    serviceData128bitUuid: { id: 0x21, marshall: notImplemented },
    '3dInformationData': { id: 0x3d, marshall: notImplemented },
    manufacturerSpecificData: { id: 0xff, marshall: notImplemented },
};

class AdType {
    /**
     * @brief Converts advertisement object to buffer
     *
     */
    static convertToBuffer(obj) {
        let buffer = new Buffer(AD_PACKET_MAX_SIZE);
        var bufferPosition = 0;

        // We assume that all marshall methods returns an absolute position in the provided buffer
        for (let property in obj) {
            if (obj.hasOwnProperty(property)) {
                let conv = adTypeConverter[property];

                if (conv !== undefined) {
                    let len = 0;
                    let startPos = bufferPosition;
                    bufferPosition = buffer.writeUInt8(conv.id, bufferPosition + 1); // AD Type
                    bufferPosition = conv.marshall(buffer, bufferPosition, obj[property]); // AD Data

                    let length = bufferPosition - startPos - 1;

                    if (bufferPosition > AD_PACKET_MAX_SIZE) {
                        throw new Error(`Length of packet is ${bufferPosition} bytes, which is larger than the maximum of ${AD_PACKET_MAX_SIZE} bytes.`);
                    }

                    buffer.writeUInt8(length, startPos, true); // AD Length
                } else {
                    throw new Error(`I do not know how to marshall ${property}.`);
                }
            }
        }

        return buffer.slice(0, bufferPosition);
    }

    /**
     * @brief Generates a decoded representation of the data in the buffer
     *
     */
    static convertFromBuffer(buffer) {
        throw new Error('Not implemented!');
    }
}

module.exports = AdType;
