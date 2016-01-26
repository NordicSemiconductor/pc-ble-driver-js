'use strict';

var driver = require('bindings')('ble_driver_js');

var adapter1 = new driver.Adapter();
var adapter2 = new driver.Adapter();

var connected = false;

open('COM18', adapter1, 1);
console.log('Started first connection');

function open(port, adapter, adapternr)
{
    const options = {
        baudRate: 115200,
        parity: 'none',
        flowControl: 'none',
        eventInterval: 1,
        logLevel: 'trace',
        logCallback: (severity, message) => {
            console.log('logMessage ' + severity + ' ' + message);
        },

        eventCallback: eventArray => {
            eventArray.forEach(event => {
                console.log(event.name);
            });
        },

        errorCallback: (code, message) => {
            console.log('Error: Code: ' + code + ' ' + message);
        },
    };

    console.log('About to open. Adapternr: ' + adapternr);
    adapter.open(port, options, (err, id) => {
        console.log('Callback called. Adapternr ' + adapternr + ' ID ' + id);
        if (err)
        {
            console.log('ERROR' + err + ' port: ' + port + ' adapter: ' + adapternr);
            return;
        }

        console.log('Connected to adapter# ' + adapternr);

        if (adapternr === 1) {
            console.log('Starting second connection');
            open('COM27', adapter2, 2);
        } else {
            startAdvertising(adapter1, 1);
        }
    });
}

const AD_PACKET_MAX_SIZE = 20;

// Remove hyphens and reverse byte ordering to little endian
let cleanUpUuid = function(uuid) {
    return uuid
        .replace(/-/g, '')
        .match(/.{2}/g)
        .reverse()
        .join('');
};

let flagsTypeMarshaller = function(buf, offset, flags) {
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

let serviceUuidsMarshaller = function(buf, offset, uuids) {
    // TODO: add uuids
    var pos = offset;

    for (let uuid in uuids) {
        const temp = new Buffer(cleanUpUuid(uuids[uuid]), 'hex');
        temp.copy(buf, pos, 0);
        pos += temp.length;
    }

    return pos;
};

let txPowerLevelMarshaller = function(buf, offset, powerLevel) {
    if (powerLevel < -127 || powerLevel > 127) {
        throw new Error('powerLevel is outside acceptable levels (-127 to +127 dBm)');
    }

    return buf.writeInt8(powerLevel, offset);
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

    static convertFromBuffer(buffer) {
        throw new Error('Not implemented!');
    }
}

function _getAdvertisementParams(params) {
    var retval = {};

    retval.channel_mask = {};
    retval.channel_mask.ch_37_off = false;
    retval.channel_mask.ch_38_off = false;
    retval.channel_mask.ch_39_off = false;

    if (params.channelMask) {
        for (let channel in params.channelMask) {
            switch (params.channelMask[channel]) {
                case 'ch37off':
                    retval.channel_mask.ch_37_off = true;
                    break;
                case 'ch38off':
                    retval.channel_mask.ch_38_off = true;
                    break;
                case 'ch39off':
                    retval.channel_mask.ch_39_off = true;
                    break;
                default:
                    throw new Error(`Channel ${channel} is not possible to switch off during advertising.`);
            }
        }
    }

    if (params.interval) {
        retval.interval = params.interval;
    } else {
        throw new Error('You have to provide an interval.');
    }

    if (params.timeout || params.timeout === 0) {
        retval.timeout = params.timeout;
    } else {
        throw new Error('You have to provide a timeout.');
    }

    // TOOD: fix fp logic later
    retval.fp = driver.BLE_GAP_ADV_FP_ANY;

    // Default value is that device is connectable undirected.
    retval.type = driver.BLE_GAP_ADV_TYPE_ADV_IND;

    // TODO: we do not support directed connectable mode yet
    if (params.connectable !== undefined) {
        if (!params.connectable) {
            retval.type |= driver.BLE_GAP_ADV_TYPE_NONCONN_IND;
        }
    }

    if (params.scannable !== undefined) {
        if (params.scannable) {
            retval.type |= driver.BLE_GAP_ADV_TYPE_ADV_SCAN_IND;
        }
    }

    return retval;
}

function start_Advertising(adapter, options, callback) {
    const advParams = _getAdvertisementParams(options);

    adapter.gapStartAdvertising(advParams, err => {
        if (callback) callback();
    });
}

function setAdvertisingData(adapter, advData, scanRespData, callback) {
    const advDataStruct = Array.from(AdType.convertToBuffer(advData));
    const scanRespDataStruct = Array.from(AdType.convertToBuffer(scanRespData));

    adapter.gapSetAdvertisingData(
        advDataStruct,
        scanRespDataStruct,
        err => {
            if (callback) callback();
        }
    );
}

function startAdvertising(adapter, adapternr)
{
    var advData = {};
    advData.completeLocalName = 'Wayland' + adapternr;
    advData.txPowerLevel = 20;

    console.log('Setting advertisement data. adapterID: ' + adapternr);
    setAdvertisingData(adapter, advData, {}, error => {
        if (error) {
            console.log('Failed setting advertisement data ' + adapternr);
            return;
        }

        const advOptions = {
            interval: 100,
            timeout: 10000,
        };

        console.log('Starting advertisement. adapterID' + adapternr);
        start_Advertising(adapter, advOptions, error => {
            if (error) {
                console.log('Failed starting advertisement ' + adapternr);
            } else {
                console.log('Started advertisement ' + adapternr);
            }

            if (adapternr === 1) {
                console.log('About to start second adapter.');
                startAdvertising(adapter2, 2);
            } else {
                console.log('Advertising on both devices.');
            }
        });
    });
}
