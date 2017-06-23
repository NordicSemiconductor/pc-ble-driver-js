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

const AD_PACKET_MAX_SIZE = 31;

// Remove hyphens and reverse byte ordering to little endian
let cleanUpUuid = function (uuid) {
    return uuid
        .replace(/-/g, '')
        .match(/.{2}/g)
        .reverse()
        .join('');
};

let flagsTypeMarshaller = function (buf, offset, flags) {
    let value = 0x00;

    for (const flag in flags) {
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

let serviceUuidsMarshaller = function (buf, offset, uuids) {
    // TODO: add uuids
    var pos = offset;

    for (let uuid in uuids) {
        const temp = new Buffer(cleanUpUuid(uuids[uuid]), 'hex');
        temp.copy(buf, pos, 0);
        pos += temp.length;
    }

    return pos;
};

let txPowerLevelMarshaller = function (buf, offset, powerLevel) {
    if (powerLevel < -127 || powerLevel > 127) {
        throw new Error('powerLevel is outside acceptable levels (-127 to +127 dBm)');
    }

    return buf.writeInt8(powerLevel, offset);
};

// Special case marshaller, requires id value to be provided in payload
let customMarshaller = function (buf, offset, customData) {
    let pos = offset - 1; // Overwrite the ID field at position offset - 1 since it is included in customData
    const temp = new Buffer(customData, 'hex');
    temp.copy(buf, pos);
    pos += temp.length;

    return pos;
};

const notImplemented = function (buf, offset, name) {
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

    shortenedLocalName: { id: 0x08, marshall: (buf, offset, name) => buf.write(name, offset, name.length, 'binary') + offset },

    completeLocalName:  { id: 0x09, marshall: (buf, offset, name) => buf.write(name, offset, name.length, 'binary') + offset },

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

    custom: { id: null, marshall: customMarshaller },
};

class AdType {
    /**
     * @brief Converts advertisement object to buffer
     *
     */
    static convertToBuffer(obj) {
        let buffer = new Buffer(100); // Set buffer size well above max size to avoid out of index error before length check has been performed
        let bufferPosition = 0;

        // We assume that all marshall methods returns an absolute position in the provided buffer
        for (let property in obj) {
            if (obj.hasOwnProperty(property)) {
                // strip away optional property index e.g.: custom:0 => custom
                const convType = property.split(':')[0];
                const conv = adTypeConverter[convType];

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

    static convertFromBuffer(buffer) {
        throw new Error('Not implemented!');
    }
}

module.exports = AdType;
