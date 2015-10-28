'use strict';

const util = require('util');
const EventEmitter = require('events');
const _ = require('underscore');

const AdapterState = require('./adapterState');
const Device = require('./device');
const Service = require('./service');
const Characteristic = require('./characteristic');
const Descriptor = require('./descriptor');
const AdType = require('./util/adType');
const Converter = require('./util/sdConv');

// No caching of devices
// Do cache service database

var make_error = function(userMessage, description) {
    return { message: userMessage, description: description };
};

var getType = function(service) {
    var type;

    if (service.type) {
        if (service.type === 'primary') {
            type = this._bleDriver.BLE_GATTS_SRVC_TYPE_PRIMARY;
        } else if (service.type === 'secondary') {
            type = this._bleDriver.BLE_GATTS_SRVC_TYPE_SECONDARY;
        } else {
            throw new Error(`Service type ${service.type} is unknown to me. Must be 'primary' or 'secondary'.`);
        }
    } else {
        throw new Error(`Service type is not specified. Must be 'primary' or 'secondary'.`);
    }

    return type;
};

class Adapter extends EventEmitter {
    constructor(bleDriver, instanceId, port) {
        super();

        if (bleDriver === undefined) throw new Error('Missing argument bleDriver.');
        if (instanceId === undefined) throw new Error('Missing argument instanceId.');
        if (port === undefined) throw new Error('Missing argument port.');

        this._bleDriver = bleDriver;
        this._instanceId = instanceId;
        this._adapterState = new AdapterState(instanceId, port);

        this._devices = {};
        this._services = {};
        this._characteristics = {};
        this._descriptors = {};

        this._converter = new Converter(this._bleDriver);

        this._maxPayloadSize = this._bleDriver.GATT_MTU_SIZE_DEFAULT - 3;

        this._gapOperationsMap = {};
        this._gattOperationsMap = {};
    }

    // Get the instance id
    get instanceId() {
        return this._instanceId;
    }

    checkAndPropagateError(err, userMessage, callback) {
        if (err) {
            var error = make_error(userMessage, err);
            this.emit('error', JSON.stringify(error));
            if (callback) callback(error);
            return true;
        }

        return false;
    }

    _changeAdapterState(changingStates, swallowEmit) {
        let changed = false;

        for (let state in changingStates) {
            const newValue = changingStates[state];
            const previousValue = this._adapterState[state];

            // Use isEqual to compare objects
            if (!_.isEqual(previousValue, newValue)) {
                this._adapterState[state] = newValue;
                changed = true;
            }
        }

        if (swallowEmit) {
            return;
        }

        if (changed) {
            this.emit('adapterStateChanged', this._adapterState);
        }
    }

/*
    _arrayToString(array) {
        let string = '';

        for (let i = array.length - 1; i >= 0; i--) {
            let byteString = array[i].toString(16);
            byteString = ('0' + byteString).slice(-2);
            string += byteString;
        }

        string = '0x' + string.toUpperCase();

        return string;
    }
*/

    _numberTo16BitUuid(uuid16Bit) {
        const base = '-0000-1000-8000-00805F9B34FB';
        let string = '0000';

        let byteString = uuid16Bit.toString(16);
        byteString = ('000' + byteString).slice(-4);
        string += byteString;

        string += base;
        return string.toUpperCase();
    }

    _arrayTo128BitUuid(array) {
        const insertHyphen = (string, index) => {
            return string.substr(0, index) + '-' + string.substr(index);
        };

        let string = '';

        for (let i = array.length - 1; i >= 0; i--) {
            let byteString = array[i].toString(16);
            byteString = ('0' + byteString).slice(-2);
            string += byteString;
        }

        string = insertHyphen(string, 20);
        string = insertHyphen(string, 16);
        string = insertHyphen(string, 12);
        string = insertHyphen(string, 8);

        return string.toUpperCase();
    }

    // Callback signature function(err) {}
    open(options, callback) {
        this._changeAdapterState({baudRate: options.baudRate, parity: options.parity, flowControl: options.flowControl});

        if (!options.eventInterval) options.eventInterval = 0;
        options.logCallback = this._logCallback.bind(this);
        options.eventCallback = this._eventCallback.bind(this);

        this._bleDriver.open(this._adapterState.port, options, err => {
            if (this.checkAndPropagateError(err, 'Error occurred opening serial port.', callback)) return;

            this._changeAdapterState({available: true});

            this.getAdapterState((err, adapterState) => {
                if (this.checkAndPropagateError(err, 'Error retrieving adapter state.', callback)) return;
                if (callback) callback();
            });
        });
    }

    // Callback signature function(err) {}
    close(callback) {
        this._bleDriver.close(callback);
        this._changeAdapterState({available: false});
    }

    // TODO: log callback function declared here or in open call?;
    _logCallback(severity, message) {
        if (severity > 0) {
            console.log('log: ' + severity + ', ' + message);
        }
    }

    // TODO: event callback function declared here or in open call?;
    _eventCallback(eventArray) {
        eventArray.forEach(event => {
            switch (event.id){
                case this._bleDriver.BLE_GAP_EVT_CONNECTED:
                    this._parseConnectedEvent(event);
                    break;
                case this._bleDriver.BLE_GAP_EVT_DISCONNECTED:
                    this._parseDisconnectedEvent(event);
                    break;
                case this._bleDriver.BLE_GAP_EVT_CONN_PARAM_UPDATE:
                    this._parseConnectionParameterUpdateEvent(event);
                    break;

                // TODO: Implement for security/bonding
                /*
                case this._bleDriver.BLE_GAP_EVT_SEC_PARAMS_REQUEST:
                case this._bleDriver.BLE_GAP_EVT_SEC_INFO_REQUEST:
                case this._bleDriver.BLE_GAP_EVT_PASSKEY_DISPLAY:
                case this._bleDriver.BLE_GAP_EVT_AUTH_KEY_REQUEST:
                case this._bleDriver.BLE_GAP_EVT_AUTH_STATUS:
                case this._bleDriver.BLE_GAP_EVT_CONN_SEC_UPDATE:
                */
                case this._bleDriver.BLE_GAP_EVT_TIMEOUT:
                    this._parseTimeoutEvent(event);
                    break;
                case this._bleDriver.BLE_GAP_EVT_RSSI_CHANGED:
                    this._parseRssiChangedEvent(event);
                    break;
                case this._bleDriver.BLE_GAP_EVT_ADV_REPORT:
                    this._parseAdvertismentReportEvent(event);
                    break;
                /*
                case this._bleDriver.BLE_GAP_EVT_SEC_REQUEST:
                */
                case this._bleDriver.BLE_GAP_EVT_CONN_PARAM_UPDATE_REQUEST:
                    this._parseConnectionParameterUpdateRequestEvent(event);
                    break;
                case this._bleDriver.BLE_GAP_EVT_SCAN_REQ_REPORT:
                    // TODO: implement to know when a scan request is received.
                    break;
                case this._bleDriver.BLE_GATTC_EVT_PRIM_SRVC_DISC_RSP:
                    this._parsePrimaryServiceDiscoveryResponseEvent(event);
                    break;
                case this._bleDriver.BLE_GATTC_EVT_REL_DISC_RSP:
                    // TODO: Needed?
                    break;
                case this._bleDriver.BLE_GATTC_EVT_CHAR_DISC_RSP:
                    this._parseCharacteristicDiscoveryResponseEvent(event);
                    break;
                case this._bleDriver.BLE_GATTC_EVT_DESC_DISC_RSP:
                    this._parseDescriptorDiscoveryResponseEvent(event);
                    break;
                case this._bleDriver.BLE_GATTC_EVT_CHAR_VAL_BY_UUID_READ_RSP:
                    // TODO: Needed?
                    break;
                case this._bleDriver.BLE_GATTC_EVT_READ_RSP:
                    this._parseReadResponseEvent(event);
                    break;
                case this._bleDriver.BLE_GATTC_EVT_CHAR_VALS_READ_RSP:
                    break;
                case this._bleDriver.BLE_GATTC_EVT_WRITE_RSP:
                    this._parseWriteResponseEvent(event);
                    break;
                case this._bleDriver.BLE_GATTC_EVT_HVX:
                    this._parseHvxEvent(event);
                    break;
                case this._bleDriver.BLE_GATTC_EVT_TIMEOUT:
                    // TODO: Implement
                    break;
                case this._bleDriver.BLE_GATTS_EVT_WRITE:
                    // TODO: Implement
                    break;
                case this._bleDriver.BLE_GATTS_EVT_RW_AUTHORIZE_REQUEST:
                    // TODO: Implement when doing other security features?
                    break;
                case this._bleDriver.BLE_GATTS_EVT_SYS_ATTR_MISSING:
                    // TODO: Implement
                    break;
                case this._bleDriver.BLE_GATTS_EVT_HVC:
                    // TODO: Implement
                    break;
                case this._bleDriver.BLE_GATTS_EVT_SC_CONFIRM:
                    // TODO: Implement when we want service changed...
                    break;
                case this._bleDriver.BLE_GATTS_EVT_TIMEOUT:
                    // TODO: Implement
                    break;
                default:
                    console.log(`Unsupported event received from SoftDevice: ${event.id} - ${event.name}`);
                    break;
            }
        });
    }

    _parseConnectedEvent(event) {
        // TODO: Update device with connection handle
        // TODO: Should 'deviceConnected' event emit the updated device?
        const deviceAddress = event.peer_addr.address;
        const connectionParameters = event.conn_params;
        let deviceRole;

        // If our role is central set the device role to be peripheral.
        if (event.role === 'BLE_GAP_ROLE_CENTRAL') {
            deviceRole = 'peripheral';
        } else if (event.role === 'BLE_GAP_ROLE_PERIPH') {
            deviceRole = 'central';
        }

        const device = new Device(deviceAddress, deviceRole);

        device.connectionHandle = event.conn_handle;
        device.minConnectionInterval = connectionParameters.min_conn_interval;
        device.maxConnectionInterval = connectionParameters.max_conn_interval;
        device.slaveLatency = connectionParameters.slave_latency;
        device.connectionSupervisionTimeout = connectionParameters.conn_sup_timeout;

        device.connected = true;
        this._devices[device.instanceId] = device;

        this._changeAdapterState({connecting: false});
        const callback = this._gapOperationsMap.connecting.callback;
        delete this._gapOperationsMap.connecting;

        this.emit('deviceConnected', device);
        if (deviceRole === 'peripheral') {
            callback(undefined, device);
        }
    }

    _parseDisconnectedEvent(event) {
        const device = this._getDeviceByConnectionHandle(event.conn_handle);
        if (!device) {
            const errorObject = make_error('Disconnect failed', 'Internal inconsistency: Could not find device with connection handle ' + event.conn_handle);

            // cannot reach callback when there is no device. The best we can do is emit error and return.
            this.emit('error', errorObject);
            return;
        }

        device.connected = false;

        // TODO: Delete all operations for this device.

        if (this._gapOperationsMap[device.instanceId]) {
            const callback = this._gapOperationsMap[device.instanceId].callback;
            delete this._gapOperationsMap[device.instanceId];
            callback(undefined, device);
        }

        delete this._devices[device.instanceId];
        this.emit('deviceDisconnected', device);
    }

    _parseConnectionParameterUpdateEvent(event) {
        const device = this._getDeviceByConnectionHandle(event.conn_handle);
         if (!device) {
            this.emit('error', 'Internal inconsistency: Could not find device with connection handle ' + event.conn_handle);
            return;
        }

        device.minConnectionInterval = event.conn_params.min_conn_interval;
        device.maxConnectionInterval = event.conn_params.max_conn_interval;
        device.slaveLatency = event.conn_params.slave_latency;
        device.connectionSupervisionTimeout = event.conn_params.conn_sup_timeout;

        this.emit('connParamUpdate', device);
    }

    _parseConnectionParameterUpdateRequestEvent(event) {
        const device = this._getDeviceByConnectionHandle(event.conn_handle);

        const connectionParameters = {deviceInstanceId: device.instanceId,
                                    minConnectionInterval: event.conn_params.min_conn_interval,
                                    maxConnectionInterval: event.conn_params.max_conn_interval,
                                    slaveLatency: event.conn_params.slave_latency,
                                    connectionSupervisionTimeout: event.conn_params.conn_sup_timeout,
                                };

        this.emit('connParamUpdateRequest', connectionParameters);
    }

    _parseAdvertismentReportEvent(event) {
        // TODO: Check address type?
        const address = event.peer_addr.address;
        const discoveredDevice = new Device(address, 'peripheral');

        if (event.data) {
            if (event.data.BLE_GAP_AD_TYPE_LONG_LOCAL_NAME) {
                discoveredDevice.name = event.data.BLE_GAP_AD_TYPE_LONG_LOCAL_NAME;
            } else if (event.data.BLE_GAP_AD_TYPE_SHORT_LOCAL_NAME) {
                discoveredDevice.name = event.data.BLE_GAP_AD_TYPE_SHORT_LOCAL_NAME;
            } else if (event.data.BLE_GAP_AD_TYPE_COMPLETE_LOCAL_NAME) {
                discoveredDevice.name = event.data.BLE_GAP_AD_TYPE_COMPLETE_LOCAL_NAME;
            }

            let uuids = [];

            if (event.data.BLE_GAP_AD_TYPE_16BIT_SERVICE_UUID_MORE_AVAILABLE) {
                uuids = uuids.concat(event.data.BLE_GAP_AD_TYPE_16BIT_SERVICE_UUID_MORE_AVAILABLE);
            }

            if (event.data.BLE_GAP_AD_TYPE_16BIT_SERVICE_UUID_COMPLETE) {
                uuids = uuids.concat(event.data.BLE_GAP_AD_TYPE_16BIT_SERVICE_UUID_COMPLETE);
            }

            if (event.data.BLE_GAP_AD_TYPE_32BIT_SERVICE_UUID_MORE_AVAILABLE) {
                uuids = uuids.concat(event.data.BLE_GAP_AD_TYPE_32BIT_SERVICE_UUID_MORE_AVAILABLE);
            }

            if (event.data.BLE_GAP_AD_TYPE_32BIT_SERVICE_UUID_COMPLETE) {
                uuids = uuids.concat(event.data.BLE_GAP_AD_TYPE_32BIT_SERVICE_UUID_COMPLETE);
            }

            if (event.data.BLE_GAP_AD_TYPE_128BIT_SERVICE_UUID_MORE_AVAILABLE) {
                uuids = uuids.concat(event.data.BLE_GAP_AD_TYPE_128BIT_SERVICE_UUID_MORE_AVAILABLE);
            }

            if (event.data.BLE_GAP_AD_TYPE_128BIT_SERVICE_UUID_COMPLETE) {
                uuids = uuids.concat(event.data.BLE_GAP_AD_TYPE_128BIT_SERVICE_UUID_COMPLETE);
            }

            discoveredDevice.uuids = uuids;

            if (event.data.BLE_GAP_AD_TYPE_TX_POWER_LEVEL) {
                discoveredDevice.txPower = event.data.BLE_GAP_AD_TYPE_TX_POWER_LEVEL;
            }
        }

        discoveredDevice.rssi = event.rssi;

        this.emit('deviceDiscovered', discoveredDevice);
    }

    _parseTimeoutEvent(event) {
        switch (event.src) {
            case this._bleDriver.BLE_GAP_TIMEOUT_SRC_SCAN:
                this._changeAdapterState({scanning: false});
                break;
            case this._bleDriver.BLE_GAP_TIMEOUT_SRC_CONN:
                this._changeAdapterState({connecting: false});
                break;
            default:
                console.log(`GAP operation timed out: ${event.src_name} (${event.src}).`);
        }
    }

    _parseRssiChangedEvent(event) {
        const device = this._getDeviceByConnectionHandle(event.conn_handle);
        device.rssi = event.rssi;

        // TODO: How do we notify the application of a changed rssi?
        //emit('rssiChanged', device);
    }

    _parsePrimaryServiceDiscoveryResponseEvent(event) {
        const device = this._getDeviceByConnectionHandle(event.conn_handle);
        const services = event.services;
        const gattOperation = this._gattOperationsMap[device.instanceId];

        if (event.count === 0) {
            if (_.isEmpty(gattOperation.pendingHandleReads)) {
                // No pending reads to wait for.
                const callbackServices = [];

                for (let serviceInstanceId in this._services) {
                    const service = this._services[serviceInstanceId];
                    if (service.deviceInstanceId === gattOperation.parent.instanceId) {
                        callbackServices.push(this._services[serviceInstanceId]);
                    }
                }

                delete this._gattOperationsMap[device.instanceId];
                gattOperation.callback(undefined, callbackServices);
            } else {
                for (let handle in gattOperation.pendingHandleReads) {
                    // Just take the first found handle and start the read process.
                    this._bleDriver.gattc_read(device.connectionHandle, handle, 0, err => {
                        if (err) {
                            this.emit('error', err);

                            // Call getServices callback??
                        }
                    });
                    break;
                }
            }

            return;
        }

        services.forEach(service => {
            const handle = service.handle_range.start_handle;
            let uuid = this._numberTo16BitUuid(service.uuid.uuid);

            if (service.uuid.type === this._bleDriver.BLE_UUID_TYPE_UNKNOWN) {
                uuid = null;
            }

            const newService = new Service(device.instanceId, uuid);
            newService.startHandle = service.handle_range.start_handle;
            newService.endHandle = service.handle_range.end_handle;
            this._services[newService.instanceId] = newService;

            if (uuid === null) {
                gattOperation.pendingHandleReads[handle] = newService;
            } else {
                this.emit('serviceAdded', newService);
            }
        });

        const nextStartHandle = services[services.length - 1].handle_range.end_handle + 1;

        this._bleDriver.gattc_primary_services_discover(device.connectionHandle, nextStartHandle, 0, err => {
            if (err) {
                this.emit('error', 'Failed to get services');

                // Call getServices callback??
            }
        });
    }

    _parseCharacteristicDiscoveryResponseEvent(event) {
        const device = this._getDeviceByConnectionHandle(event.conn_handle);
        const characteristics = event.chars;
        const gattOperation = this._gattOperationsMap[device.instanceId];

        const finishCharacteristicDiscovery = () => {
            if (_.isEmpty(gattOperation.pendingHandleReads)) {
                // No pending reads to wait for.
                const callbackCharacteristics = [];

                for (let characteristicInstanceId in this._characteristics) {
                    const characteristic = this._characteristics[characteristicInstanceId];
                    if (characteristic.serviceInstanceId === gattOperation.parent.instanceId) {
                        callbackCharacteristics.push(characteristic);
                    }
                }

                delete this._gattOperationsMap[device.instanceId];
                gattOperation.callback(undefined, callbackCharacteristics);
            } else {
                for (let handle in gattOperation.pendingHandleReads) {
                    // Just take the first found handle and start the read process.
                    this._bleDriver.gattc_read(device.connectionHandle, handle, 0, err => {
                        if (err) {
                            this.emit('error', err);

                            // Call getDescriptors callback??
                        }
                    });
                    break;
                }
            }
        };

        if (event.count === 0) {
            finishCharacteristicDiscovery();
            return;
        }

        // We should only receive characteristics under one service.
        const service = this._getServiceByHandle(device.instanceId, characteristics[0].handle_decl);

        characteristics.forEach(characteristic => {
            const declarationHandle = characteristic.handle_decl;
            const valueHandle = characteristic.handle_value;
            let uuid = this._numberTo16BitUuid(characteristic.uuid.uuid);

            if (characteristic.uuid.type === this._bleDriver.BLE_UUID_TYPE_UNKNOWN) {
                uuid = null;
            }

            const properties = characteristic.char_props;
            const newCharacteristic = new Characteristic(service.instanceId, uuid, properties, null);
            newCharacteristic.declarationHandle = characteristic.handle_decl;
            newCharacteristic.valueHandle = characteristic.handle_value;
            this._characteristics[newCharacteristic.instanceId] = newCharacteristic;

            if (uuid === null) {
                gattOperation.pendingHandleReads[declarationHandle] = newCharacteristic;
            }

            // Add pending reads to get characteristics values.
            if (properties.read) {
                gattOperation.pendingHandleReads[valueHandle] = newCharacteristic;
            }
        });

        const nextStartHandle = characteristics[characteristics.length - 1].handle_decl + 1;
        const handleRange = {startHandle: nextStartHandle, endHandle: service.endHandle};

        if (service.endHandle <= nextStartHandle) {
            finishCharacteristicDiscovery();
            return;
        }

        this._bleDriver.gattc_characteristic_discover(device.connectionHandle, handleRange, err => {
            if (err) {
                this.emit('error', 'Failed to get Characteristics');

                // Call getCharacteristics callback??
            }
        });
    }

    _parseDescriptorDiscoveryResponseEvent(event) {
        const device = this._getDeviceByConnectionHandle(event.conn_handle);
        const descriptors = event.descs;
        const gattOperation = this._gattOperationsMap[device.instanceId];

        const finishDescriptorDiscovery = () => {
            if (_.isEmpty(gattOperation.pendingHandleReads)) {
                // No pending reads to wait for.
                const callbackDescriptors = [];

                for (let descriptorInstanceId in this._descriptors) {
                    const descriptor = this._descriptors[descriptorInstanceId];
                    if (descriptor.characteristicInstanceId === gattOperation.parent.instanceId) {
                        callbackDescriptors.push(descriptor);
                    }
                }

                delete this._gattOperationsMap[device.instanceId];
                gattOperation.callback(undefined, callbackDescriptors);
            } else {
                for (let handle in gattOperation.pendingHandleReads) {
                    // Just take the first found handle and start the read process.
                    this._bleDriver.gattc_read(device.connectionHandle, handle, 0, err => {
                        if (err) {
                            this.emit('error', err);

                            // Call getDescriptors callback??
                        }
                    });
                    break;
                }
            }
        };

        if (event.count === 0) {
            finishDescriptorDiscovery();
            return;
        }

        // We should only receive descriptors under one characteristic.
        const characteristic = gattOperation.parent;

        descriptors.forEach(descriptor => {
            const handle = descriptor.handle;
            let uuid = this._numberTo16BitUuid(descriptor.uuid.uuid);

            if (characteristic.uuid.type === this._bleDriver.BLE_UUID_TYPE_UNKNOWN) {
                uuid = 'unknown-descriptor-uuid';
            }

            // TODO: Fix magic number? Primary Service and Characteristic Declaration uuids
            if (uuid === 0x2800 || uuid === 0x2803) {
                // Found a service or characteristic declaration
                finishDescriptorDiscovery();
                return;
            }

            const newDescriptor = new Descriptor(characteristic.instanceId, uuid, null);
            newDescriptor.handle = handle;
            this._descriptors[newDescriptor.instanceId] = newDescriptor;

            // TODO: We cannot read descriptor 128bit uuid.

            gattOperation.pendingHandleReads[handle] = newDescriptor;
        });

        const service = this._services[gattOperation.parent.serviceInstanceId];
        const nextStartHandle = descriptors[descriptors.length - 1].handle + 1;

        if (service.endHandle < nextStartHandle) {
            finishDescriptorDiscovery();
            return;
        }

        const handleRange = {startHandle: nextStartHandle, endHandle: service.endHandle};

        this._bleDriver.gattc_descriptor_discover(device.connectionHandle, handleRange, err => {
            if (err) {
                this.emit('error', 'Failed to get Descriptors');

                // Call getDescriptors callback?
            }
        });
    }

    _parseReadResponseEvent(event) {
        const device = this._getDeviceByConnectionHandle(event.conn_handle);
        const handle = event.handle;
        const data = event.data.data;
        const gattOperation = this._gattOperationsMap[device.instanceId];
        const pendingHandleReads = gattOperation.pendingHandleReads;
        /*
        event.offset;
        event.len;
        */

        if (pendingHandleReads && !_.isEmpty(pendingHandleReads)) {
            const attribute = pendingHandleReads[handle];

            if (!attribute) {
                console.log('something went wrong in bookkeeping of pending reads');
                return;
            }

            delete pendingHandleReads[handle];

            if (attribute instanceof Service) {
                // TODO: Translate from uuid to name?
                attribute.uuid = this._arrayTo128BitUuid(data);
                this.emit('serviceAdded', attribute);

                if (_.isEmpty(pendingHandleReads)) {
                    const callbackServices = [];
                    for (let serviceInstanceId in this._services) {
                        if (this._services[serviceInstanceId].deviceInstanceId === device.instanceId) {
                            callbackServices.push(this._services[serviceInstanceId]);
                        }
                    }

                    delete this._gattOperationsMap[device.instanceId];
                    gattOperation.callback(undefined, callbackServices);
                }
            } else if (attribute instanceof Characteristic) {
                // TODO: Translate from uuid to name?
                if (handle === attribute.declarationHandle) {
                    attribute.uuid = this._arrayTo128BitUuid(data.slice(2));
                } else if (handle === attribute.valueHandle) {
                    attribute.value = data;
                }

                if (attribute.uuid && attribute.value) {
                    this.emit('characteristicAdded', attribute);
                }

                if (_.isEmpty(pendingHandleReads)) {
                    const callbackCharacteristics = [];
                    for (let characteristicInstanceId in this._characteristics) {
                        if (this._characteristics[characteristicInstanceId].serviceInstanceId === attribute.serviceInstanceId) {
                            callbackCharacteristics.push(this._characteristics[characteristicInstanceId]);
                        }
                    }

                    delete this._gattOperationsMap[device.instanceId];
                    gattOperation.callback(undefined, callbackCharacteristics);
                }
            } else if (attribute instanceof Descriptor) {
                attribute.value = data;

                if (_.isEmpty(pendingHandleReads)) {
                    const callbackDescriptors = [];
                    for (let descriptorInstanceId in this._descriptors) {
                        if (this._descriptors[descriptorInstanceId].characteristicInstanceId === attribute.characteristicInstanceId) {
                            callbackDescriptors.push(this._descriptors[descriptorInstanceId]);
                        }
                    }

                    delete this._gattOperationsMap[device.instanceId];
                    gattOperation.callback(undefined, callbackDescriptors);
                }
            }

            for (let newReadHandle in pendingHandleReads) {
                // Just take the first found handle and start the read process.
                this._bleDriver.gattc_read(device.connectionHandle, newReadHandle, 0, err => {
                    if (err) {
                        this.emit('error', err);

                        // Call getAttributecallback callback??
                    }
                });
                break;
            }
        } else {
            gattOperation.readBytes = gattOperation.readBytes.concat(event.data);

            if (event.data.length < this._maxPayloadSize) {
                delete this._gattOperationsMap[device.instanceId];
                gattOperation.callback(undefined, gattOperation.readBytes);
            } else if (event.data.length === this._maxPayloadSize) {
                // We need to read more:
                this._bleDriver.read(event.conn_handle, event.handle, gattOperation.readBytes.length, (err) => {
                    if (err) {
                        delete this._gattOperationsMap[device.instanceId];
                        this.emit('error', make_error('Read value failed', err));
                        gattOperation.callback('Failed reading at byte #' + gattOperation.readBytes.length);
                    }
                });
            } else {
                delete this._gattOperationsMap[device.instanceId];
                this.emit('error', 'Length of Read response is > mtu');
                gattOperation.callback('Invalid read response length. (> mtu)');
            }
        }
    }

    _parseWriteResponseEvent(event) {
        // 1. Check if there is a long write in progress for this device
        // 2a. If there is check if it is done after next write
        // 2ai. If it is done after next write
        //      Perform the last write and if success, exec write on fail, cancel write
        //      callback, delete callback, delete pending write, emit
        // 2aii. if not done, issue one more PREPARED_WRITE, update pendingwrite

        // TODO: Do more checking of write response?
        const device = this._getDeviceByConnectionHandle(event.conn_handle);
        const handle = event.handle;
        const gattOperation = this._gattOperationsMap[device.instanceId];

        const go = ['callback', 'bytesWritten', 'value', 'attribute'];

        if (!device) {
            delete this._gattOperationsMap[device.instanceId];
            this.emit('error', 'Failed to handle write event, no device with handle ' + device.instanceId + 'found.');
            gattOperation.callback(make_error('Failed to handle write event, no device with connection handle ' + event.conn_handle + 'found'));
            return;
        }

        // TODO: Check gatt error? event.gatt_status === BLE_GATT_STATUS_SUCCESS

        if (event.type === this._bleDriver.BLE_GATT_OP_WRITE_CMD) {
            gattOperation.attribute.value = gattOperation.value;
        } else if (event.type === this._bleDriver.BLE_GATT_OP_PREP_WRITE_REQ) {
            const writeParameters = {
                write_op: 0,
                flags: 0,
                handle: handle,
                offset: 0,
                len: 0,
                value: [],
            };

            if (gattOperation.bytesWritten < gattOperation.value.length) {
                const value = gattOperation.value.slice(gattOperation.bytesWritten, gattOperation.bytesWritten + this._maxPayloadSize);

                writeParameters.write_op = this._bleDriver.BLE_GATT_OP_PREP_WRITE_REQ;
                writeParameters.handle = handle;
                writeParameters.offset = gattOperation.bytesWritten;
                writeParameters.len = value.length;
                writeParameters.value = value;

                this._bleDriver.write(device.connectionHandle, writeParameters, err => {
                    if (err) {
                        this._longWriteCancel(device, handle);
                        this.emit('error', make_error('Failed to write value to device/handle ' + device.instanceId + '/' + handle, err));
                    }
                });
            } else {
                writeParameters.write_op = this._bleDriver.BLE_GATT_OP_EXEC_WRITE_REQ;
                writeParameters.flags = this._bleDriver.BLE_GATT_EXEC_WRITE_FLAG_PREPARED_WRITE;

                this._bleDriver.write(device.connectionHandle, writeParameters, (err) => {
                    if (err) {
                        this._longWriteCancel(device, handle);
                        this.emit('error', make_error('Failed to write value to device/handle ' + device.instanceId + '/' + handle, err));
                    }
                });
            }
        } else if (event.type === this._bleDriver.BLE_GATT_OP_EXEC_WRITE_REQ) {
            // TODO: Need to check if gattOperation.bytesWritten is equal to gattOperation.value length?
            gattOperation.attribute.value = gattOperation.value;
        }

        if (gattOperation.attribute instanceof Characteristic) {
            this.emit('characteristicValueChanged', gattOperation.attribute);
        } else if (gattOperation.attribute instanceof Descriptor) {
            this.emit('descriptorValueChanged', gattOperation.attribute);
        }
    }

    _getServiceByHandle(deviceInstanceId, handle) {
        for (let serviceInstanceId in this._services) {
            const service = this._services[serviceInstanceId];

            if (service.deviceInstanceId !== deviceInstanceId) {
                continue;
            }

            if (service.startHandle <= handle && handle <= service.endHandle) {
                return service;
            }
        }

        return null;
    }

    _getCharacteristicByHandle(deviceInstanceId, handle) {
        const service = this._getServiceByHandle(deviceInstanceId, handle);

        let foundCharacteristic = null;

        for (let characteristicInstanceId in this._characteristics) {
            const characteristic = this._characteristics[characteristicInstanceId];

            if (characteristic.serviceInstanceId !== service.instanceId) {
                continue;
            }

            if (characteristic.declarationHandle <= handle && (!foundCharacteristic || foundCharacteristic.declarationHandle < characteristic.declarationHandle)) {
                foundCharacteristic = characteristic;
            }
        }

        return foundCharacteristic;
    }

    _getDescriptorByHandle(deviceInstanceId, handle) {
        const characteristic = this._getCharacteristicByHandle(deviceInstanceId, handle);

        for (let descriptorInstanceId in this._descriptors) {
            const descriptor = this._descriptors[descriptorInstanceId];

            if (descriptor.characteristicInstanceId !== characteristic.instanceId) {
                continue;
            }

            if (descriptor.handle === handle) {
                return descriptor;
            }
        }

        return null;
    }

    _getCharacteristicByValueHandle(valueHandle) {
        return _.find(this._characteristics, (characteristic) => characteristic.valueHandle === valueHandle);
    }

    _parseHvxEvent(event) {
        if (event.type === this._bleDriver.BLE_GATT_HVX_INDICATION) {
            this._bleDriver.gattc_confirm_handle_value(event.conn_handle, event.handle);
        }

        const characteristic = this._getCharacteristicByValueHandle(event.handle);
        if (!characteristic) {
            this.emit('error', 'Cannot handle HVX event. No characteristic has a value descriptor with handle: ' + event.handle);
            return;
        }

        characteristic.value = event.data;
        this.emit('characteristicValueChanged', characteristic);
    }

    // Callback signature function(err, state) {}
    getAdapterState(callback) {
        const changedAdapterStates = {};

        this._bleDriver.get_version((version, err) => {
            if (this.checkAndPropagateError(
                err,
                'Failed to retrieve softdevice firmwareVersion.',
                callback)) return;

            changedAdapterStates.firmwareVersion = version;

            this._bleDriver.gap_get_device_name((name, err) => {
                if (this.checkAndPropagateError(
                    err,
                    'Failed to retrieve driver version.',
                    callback)) return;

                changedAdapterStates.name = name;

                this._bleDriver.gap_get_address((address, err) => {
                    if (this.checkAndPropagateError(
                        err,
                        'Failed to retrieve device address.',
                        callback)) return;

                    changedAdapterStates.address = address;
                    changedAdapterStates.available = true;

                    this._changeAdapterState(changedAdapterStates);
                    if (callback) callback(undefined, this._adapterState);
                });
            });
        });
    }

    // Set GAP related information
    setName(name, callback) {
        this._bleDriver.gap_set_device_name({sm: 0, lv: 0}, name, err => {
            if (err) {
                this.emit('error', make_error('Failed to set name to adapter', err));
            } else if (this._adapterState.name !== name) {
                this._adapterState.name = name;

                this._changeAdapterState({name: name});
            }

            callback(err);
        });
    }

    _getAddressStruct(address, type) {
        return {address: address, type: type};
    }

    setAddress(address, type, callback) {
        // TODO: if privacy is active use this._bleDriver.BLE_GAP_ADDR_CYCLE_MODE_AUTO?
        const cycleMode = this._bleDriver.BLE_GAP_ADDR_CYCLE_MODE_NONE;

        const addressStruct = this._getAddressStruct(address, type);

        this._bleDriver.gap_set_address(cycleMode, addressStruct, err => {
            if (err) {
                this.emit('error', make_error('Failed to set address', err));
            } else if (this._adapterState.address !== address) {
                // TODO: adapterState address include type?
                this._changeAdapterState({address: address});
            }

            callback(err);
        });
    }

    // eventName:
    // 'error', 'adapterStateChange'
    // 'deviceConnected', 'deviceDisconnected' // Role central
    // 'serviceAdded', 'serviceRemoved', 'serviceChanged' // refresh service database. TODO: relevant for GATTS role ?
    // 'characteristicValueChanged', 'descriptorValueChanged' // changed == value received, changed or not
    // 'connParamUpdateRequest', 'connParamUpdate'
    // 'insufficentPrivileges',
    // 'deviceDiscovered' // Callback signature function(device) {}
    // 'securityRequest', 'securityParameters'
    /*
    on(eventName, callback) {

    }
    */

    // Get connected device/devices
    // Callback signature function(devices : Device[]) {}
    getDevices() {
        return this._devices;
    }

    getDevice(deviceInstanceId) {
        return this._devices[deviceInstanceId];
    }

    _getDeviceByConnectionHandle(connectionHandle) {
        const foundDeviceId = Object.keys(this._devices).find(deviceId => {
            return this._devices[deviceId].connectionHandle === connectionHandle;
        });
        return this._devices[foundDeviceId];
    }

    // Only for central

    // options: { active: x, interval: x, window: x timeout: x TODO: other params}. Callback signature function(err).
    startScan(options, callback) {
        this._bleDriver.gap_start_scan(options, err => {
            if (err) {
                this.emit('error', make_error('Error occured when starting scan', err));
            } else {
                this._changeAdapterState({scanning: true});
            }

            callback(err);
        });
    }

    // Callback signature function(err)
    stopScan(callback) {
        this._bleDriver.gap_stop_scan(err => {
            if (err) {
                // TODO: probably is state already set to false, but should we make sure? if yes, emit adapterStateChanged?
                this.emit('error', make_error('Error occured when stopping scanning', err));
            } else {
                this._changeAdapterState({scanning: false});
            }

            callback(err);
        });
    }

    // options: scanParams, connParams, Callback signature function(err) {}. Do not start service discovery. Err if connection timed out, +++
    connect(deviceAddress, options, callback) {
        if (!_.isEmpty(this._gapOperationsMap) ) {
            const errorObject = make_error('Could not connect. Another connect is in progress.');
            this.emit('error', errorObject);
            callback(errorObject);
        }
        this._bleDriver.gap_connect(deviceAddress, options.scanParams, options.connParams, err => {
            if (err) {
                this.emit('error', make_error(`Could not connect to ${deviceAddress}`, err));
                callback(make_error('Failed to connect to ' + deviceAddress, err));
            } else {
                this._changeAdapterState({scanning: false, connecting: true});
                this._gapOperationsMap['connecting'] = {callback: callback};
            }
        });
    }

    // Callback signature function() {}
    cancelConnect(callback) {
        this._bleDriver.gap_cancel_connect(err => {
            if (err) {
                // TODO: log more
                const newError = make_error('Error occured when canceling connection', err);
                this.emit('error', newError);
                callback(newError);
            } else {
                delete this._gapOperationsMap['connecting'];
                this._changeAdapterState({connecting: false});
                callback(undefined);
            }
        });
    }

    // Role peripheral
    /**
     * @brief [brief description]
     * @details [long description]
     *
     * @param sendName If name shall be sent (from setName)
     * @param adveritisingData
     * // { short_name: true/false/other name,
     * long_name: true/false/other name
     * tx_power_level: x,
     * local_services: [serviceA, serviceB] // could be UUID text strings (array),
     * service_solicitation:
     * and more....
     * }
     * @param scanResponseData
     * { name: true/false/other name},
     * and more...
     * @param options
     * { interval: x, timeout: x, channel_map: [35]  optional, if nothing, use all }
     *
     */

    // Enable the client role and starts advertising

    _getAdvertisementParams(params) {
        var retval = {};

        if (params.channelMask) {
            retval.channel_mask = {};

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

        if (params.timeout) {
            retval.timeout = params.timeout;
        } else {
            throw new Error('You have to provide an timeout.');
        }

        // Default value is that device is connectable undirected.
        retval.type = this._bleDriver.BLE_GAP_ADV_TYPE_IND;

        // TODO: we do not support directed connectable mode yet
        if (params.connectable !== undefined) {
            if (!params.connectable) {
                retval.type |= this._bleDriver.BLE_GAP_ADV_TYPE_NONCONN_IND;
            }
        }

        if (params.scannable !== undefined) {
            if (params.scannable) {
                retval.type |= this._bleDriver.BLE_GAP_ADV_TYPE_ADV_SCAN_IND;
            }
        }

        return retval;
    }

    // name given from setName. Callback function signature: function(err) {}
    startAdvertising(advData, scanRespData, options, callback) {
        const advParams = this._getAdvertisementParams(options);

        var advDataStruct = AdType.convertToBuffer(advData);
        var scanRespDataStruct = AdType.convertToBuffer(scanRespData);

        this._bleDriver.gap_set_adv_data(
            advDataStruct,
            scanRespDataStruct,
            err => {
                if (this.checkAndPropagateError(err, 'Failed to set advertising data.', callback)) return;

                this._bleDriver.gap_start_advertisement(advParams, err => {
                    if (this.checkAndPropagateError(err, 'Failed to start advertising.', callback)) return;
                    this._changeAdapterState({advertising: true});
                    if (callback) callback();
                });
            });
    }

    // Callback function signature: function(err) {}
    stopAdvertising(callback) {
        this._bleDriver.gap_stop_advertisement(err => {
            if (this.checkAndPropagateError(err, 'Failed to stop advertising.', callback)) return;
            this._changeAdapterState({advertising: false});
            if (callback) callback();
        });
    }

    // Central/peripheral

    disconnect(deviceInstanceId, callback) {
        const device = this.getDevice(deviceInstanceId);
        if (!device) {
            const errorObject = make_error('Failed to disconnect', 'Failed to find device with id ' + deviceInstanceId);
            this.emit('error', errorObject);
            callback(errorObject);
        }

        const hciStatusCode = this._bleDriver.BLE_HCI_REMOTE_USER_TERMINATED_CONNECTION;
        this._bleDriver.gap_disconnect(device.connectionHandle, hciStatusCode, err => {
            if (err) {
                const errorObject = make_error('Failed to disconnect', err);
                this.emit('error', errorObject);
                callback(errorObject);
            } else {
                // Expect a disconnect event down the road
                this._gapOperationsMap[deviceInstanceId] = {
                    callback: callback,
                };
            }
        });
    }

    _getConnectionUpdateParams(options) {
        return {
                min_conn_interval: options.minConnectionInterval,
                max_conn_interval: options.maxConnectionInterval,
                slave_latency: options.slaveLatency,
                conn_sup_timeout: options.connectionSupervisionTimeout,
            };
    }

    // options: connParams, callback signature function(err) {} returns true/false
    updateConnParams(deviceInstanceId, options, callback) {
        const connectionHandle = this.getDevice(deviceInstanceId).connectionHandle;
        if (!connectionHandle) {
            throw new Error('No connection handle found for device with instance id: ' + deviceInstanceId);
        }

        const connectionParamsStruct = this._getConnectionUpdateParams(options);
        this._bleDriver.gap_update_connection_parameters(connectionHandle, connectionParamsStruct, err => {
            if (err) {
                this.emit('error', make_error('Failed to update connection parameters', err));
            }

            callback(err);
        });
    }

    // Central role

    // callback signature function(err) {}
    rejectConnParams(deviceInstanceId, callback) {
        const connectionHandle = this.getDevice(deviceInstanceId).connectionHandle;

        // TODO: Does the AddOn support undefined second parameter?
        this._bleDriver.gap_update_connection_parameters(connectionHandle, null, err => {
            if (err) {
                this.emit('error', make_error('Failed to reject connection parameters', err));
            }

            callback(err);
        });
    }

    // Bonding (when in central role)

    setCapabilities(keyboard, screen) {
        this._keyboard = keyboard;
        this._screen = screen;
    }

    setLongTermKey(deviceAddress, ltk) {

    }

    // TODO: clarify when needed
    setEDIV(ediv, rnd) {

    }

    // Callback signature function(err) {}
    pair(deviceAddress, mitm, passkey, callback) {

    }

    // TODO: check if sending paramters from event is OK
    // Callback signature function(err) {}
    encrypt(deviceAddress, callback) {

    }

    // Bonding (peripheral role)

    // GATTS
    // Array of services
    setServices(services, callback) {
        let addService = (service, type, data) => {
            return new Promise((resolve, reject) => {
                // TODO: check if 16 bytes or 2 bytes service.uuid
                this._bleDriver.decode_uuid(16, service.uuid, (err, uuid) => {
                    if (err) {
                        reject(make_error(`Unable to decode UUID ${service.uuid}`, err));
                        return;
                    }

                    this._bleDriver.gatts_add_service(type, uuid, (err, serviceHandle) => {
                        if (err) {
                            reject(make_error('Error occurred adding service.', err));
                            return;
                        }

                        data.serviceHandle = serviceHandle;
                        service.handle = serviceHandle;
                        this._services[service.instanceId] = service; // TODO: what if we fail later on this service ?
                        resolve(data);
                    });
                });
            });
        };

        let addCharacteristic = (characteristic, data) => {
            return new Promise((resolve, reject) => {
                this._converter.characteristicToDriver(characteristic, (err, characteristicForDriver) => {
                    if (err) {
                        reject(make_error('Error converting characteristic to driver.', err));
                    } else {
                        this._bleDriver.gatts_add_characteristic(
                            data.serviceHandle,
                            characteristicForDriver.metadata,
                            characteristicForDriver.attribute,
                            (err, handles) => {
                                if (err) {
                                    reject(make_error('Error occurred adding characteristic.', err));
                                } else {
                                    characteristic.valueHandle = data.characteristicHandle = handles.value_handle;
                                    this._characteristics[characteristic.instanceId] = characteristic; // TODO: what if we fail later on this ?
                                    resolve(data);
                                }
                            }
                        );
                    }
                });
            });
        };

        let addDescriptor = (descriptor, data) => {
            return new Promise((resolve, reject) => {
                this._converter.descriptorToDriver(descriptor, (err, descriptorForDriver) => {
                    if (err) {
                        reject(make_error('Error converting descriptor.', err));
                    } else {
                        this._bleDriver.gatts_add_descriptor(
                            data.characteristicHandle,
                            descriptorForDriver,
                            (err, handle) => {
                                if (err) {
                                    reject(make_error(err, 'Error adding descriptor.'));
                                } else {
                                    descriptor.handle = data.descriptorHandle = handle;
                                    this._descriptors[descriptor.instanceId] = descriptor; // TODO: what if we fail later on this ?
                                    resolve(data);
                                }
                            }
                        );
                    }
                });
            });
        };

        let promiseSequencer = (list, data) => {
            var p = Promise.resolve(data);
            return list.reduce((previousP, nextP) => {
                return previousP.then(nextP);
            }, p);
        };

        // Create array of function objects to call in sequence.
        var promises = [];

        for (let service of services) {
            var p;
            p = addService.bind(undefined, service, getType(service));
            promises.push(p);

            for (let characteristic of service._factory_characteristics) {
                p = addCharacteristic.bind(undefined, characteristic);
                promises.push(p);

                for (let descriptor of characteristic._factory_descriptors) {
                    p = addDescriptor.bind(undefined, descriptor);
                    promises.push(p);
                }
            }
        }

        // Execute the promises in sequence, start with an empty object that
        // is propagated to all promises.
        promiseSequencer(promises, {}).then(data => {
            // TODO: Ierate over all servicses, descriptors, characterstics from parameter services
            callback();
        }).catch(err => {
            this.emit('error', err);
            callback(err);
        });
    }

    // GATTS/GATTC

    // Callback signature function(err, service) {}
    getService(serviceInstanceId, callback) {
        // TODO: Do read on service? callback?
        return this._services[serviceInstanceId];
    }

    // Callback signature function(err, services) {}. If deviceInstanceId is local, local database (GATTS)
    getServices(deviceInstanceId, callback) {
        // TODO: Implement something for when device is local
        const device = this.getDevice(deviceInstanceId);

        if (this._gattOperationsMap[device.instanceId]) {
            this.emit('error', make_error('Failed to get services, a gatt operation already in progress', undefined));
            return;
        }

        this._gattOperationsMap[device.instanceId] = {callback: callback, pendingHandleReads: {}, parent: device};
        this._bleDriver.gattc_primary_services_discover(device.connectionHandle, 1, 0, (err, services) => {
            if (err) {
                this.emit('error', make_error('Failed to get services', err));
                callback(err);
                return;
            } else {
                console.log('successfully issued primary_services_discover to driver');
            }
        });
    }

    getCharacteristic(characteristicId) {
        return this._characteristics[characteristicId];
    }

    // Callback signature function(err, characteristics) {}
    getCharacteristics(serviceId, callback) {
        // TODO: Implement something for when device is local

        const service = this.getService(serviceId);
        if (!service) {
            throw new Error(make_error('Failed to get characteristics.', 'Could not find service with id: ' + serviceId));
        }
        const device = this.getDevice(service.deviceInstanceId);

        if (this._gattOperationsMap[device.instanceId]) {
            this.emit('error', make_error('Failed to get characteristics, a gatt operation already in progress', undefined));
            return;
        }

        const handleRange = {start_handle: service.startHandle, end_handle: service.endHandle};
        this._gattOperationsMap[device.instanceId] = {callback: callback, pendingHandleReads: {}, parent: service};

        this._bleDriver.gattc_characteristic_discover(device.connectionHandle, handleRange, err => {
            if (err) {
                this.emit('error', make_error('Failed to get Characteristics', err));
                callback(err);
                return;
            }
        });
    }

    getDescriptor(descriptorId) {
        return this._descriptors[descriptorId];
    }

    // Callback signature function(err, descriptors) {}
    getDescriptors(characteristicId, callback) {
        // TODO: Implement something for when device is local
        const characteristic = this.getCharacteristic(characteristicId);
        const service = this.getService(characteristic.serviceInstanceId);
        const device = this.getDevice(service.deviceInstanceId);

        if (this._gattOperationsMap[device.instanceId]) {
            this.emit('error', make_error('Failed to get descriptors, a gatt operation already in progress', undefined));
            return;
        }

        const handleRange = {start_handle: characteristic.valueHandle + 1, end_handle: service.endHandle};
        this._gattOperationsMap[device.instanceId] = {callback: callback, pendingHandleReads: {}, parent: characteristic};
        this._bleDriver.gattc_descriptor_discover(device.connectionHandle, handleRange, err => {
            if (err) {
                this.emit('error', make_error('Failed to get Descriptors', err));
                callback(err);
                return;
            }
        });
    }

    // Callback signature function(err) {}
    readCharacteristicValue(characteristicId, offset, callback) {
        const characteristic = this.getCharacteristic(characteristicId);
        if (!characteristic) {
            throw new Error('Characteristic value read failed: Could not get characteristic with id ' + characteristicId);
        }

        const device = this._getDeviceByCharacteristicId(characteristicId);
        if (!device) {
            throw new Error('Characteristic value read failed: Could not get device');
        }

        if (this._gattOperationsMap[device.instanceId]) {
            throw new Error('Characteristic value read failed: A gatt operation already in progress with device id ' + device.instanceId);
        }

        this._gattOperationsMap[device.instanceId] = {callback: callback, readBytes: []};

        this._bleDriver.read(device.connectionHandle, characteristic.valueHandle, 0, err => {
            if (err) {
                this.emit('error', make_error('Read characteristic value failed', err));
            }
        });
    }

    // Callback signature function(err) {}  ack: require acknowledge from device, irrelevant in GATTS role. options: {ack, long, offset}
    writeCharacteristicValue(characteristicId, value, ack, callback) {
        const characteristic = this.getCharacteristic(characteristicId);
        if (!characteristic) {
            throw new Error('Characteristic value write failed: Could not get characteristic with id ' + characteristicId);
        }

        const device = this._getDeviceByCharacteristicId(characteristicId);
        if (!device) {
            throw new Error('Characteristic value write failed: Could not get device');
        }

        if (this._gattOperationsMap[device.instanceId]) {
            throw new Error('Characteristic value write failed: A gatt operation already in progress with device id ' + device.instanceId);
        }

        this._gattOperationsMap[device.instanceId] = {callback: callback, bytesWritten: this._maxPayloadSize, value: value.slice(), attribute: characteristic};

        if (value.length > this._maxPayloadSize) {
            if (!ack) {
                throw new Error('Long writes do not support BLE_GATT_OP_WRITE_CMD');
            }

            this._longWrite(device, characteristic.valueHandle, value, callback);
        } else {
            this.shortWrite(device, characteristic.valueHandle, ack, value, callback);
        }
    }

    _getDeviceByDescriptorId(descriptorId) {
        const descriptor = this._descriptors[descriptorId];
        if (!descriptor) {
            throw new Error('No descriptor found with descriptor id: ' + descriptorId);
        }

        return this._getDeviceByCharacteristicId(descriptor.characteristicInstanceId);
    }

    _getDeviceByCharacteristicId(characteristicId) {
        const characteristic = this._characteristics[characteristicId];
        if (!characteristic) {
            throw new Error('No characteristic found with id: ' + characteristicId);
        }

        const service = this._services[characteristic.serviceInstanceId];
        if (!service) {
            throw new Error('No service found with id: ' + characteristic.serviceInstanceId);
        }

        const device = this._devices[service.deviceInstanceId];
        if (!device) {
            throw new Error('No device found with id: ' + service.deviceInstanceId);
        }

        return device;
    }

    readDescriptorValue(descriptorId, callback) {
        const descriptor = this.getDescriptor(descriptorId);
        if (!descriptor) {
            throw new Error('Descriptor read failed: could not get descriptor with id ' + descriptorId);
        }

        const device = this._getDeviceByDescriptorId(descriptorId);
        if (!device) {
            throw new Error('Descriptor read failed: Could not get device');
        }

        if (this._gattOperationsMap[device.instanceId]) {
            throw new Error('Descriptor read failed: A gatt operation already in progress with device with id ' + device.instanceId);
        }

        this._gattOperationsMap[device.instanceId] = {callback: callback, readBytes: []};

        this._bleDriver.read(device.connectionHandle, descriptor.handle, 0, (err) => {
            if (err) {
                this.emit('error', make_error('Read descriptor value failed', err));
            }
        });
    }

    // Callback signature function(err) {}, callback will not be called until ack is received. options: {ack, long, offset}
    writeDescriptorValue(descriptorId, value, ack, callback) {
        // Does not support reliable write
        const descriptor = this.getDescriptor(descriptorId);
        if (!descriptor) {
            throw new Error('Descriptor write failed: could not get descriptor with id ' + descriptorId);
        }

        const device = this._getDeviceByDescriptorId(descriptorId);
        if (!device) {
            throw new Error('Descriptor write failed: Could not get device');
        }

        if (this._gattOperationsMap[device.instanceId]) {
            throw new Error('Descriptor write failed: A gatt operation already in progress with device with id ' + device.instanceId);
        }

        this._gattOperationsMap[device.instanceId] = {callback: callback, bytesWritten: this._maxPayloadSize, value: value.slice(), attribute: descriptor};

        if (value.length > this._maxPayloadSize) {
            if (!ack) {
                throw new Error('Long writes do not support BLE_GATT_OP_WRITE_CMD');
            }

            this._longWrite(device, descriptor.handle, value, callback);
        } else {
            this.shortWrite(device, descriptor.handle, ack, value, callback);
        }
    }

    _shortWrite(device, handle, value, ack, callback) {
        const writeParameters = {
            write_op: ack ? this._bleDriver.BLE_GATT_OP_WRITE_REQ : this._bleDriver.BLE_GATT_OP_WRITE_CMD,
            flags: 0, // don't care for WRITE_REQ / WRITE_CMD
            handle: handle,
            offset: 0,
            len: value.length,
            value: value,
        };

        this._bleDriver.write(device.connectionHandle, writeParameters, (err) => {
            if (err) {
                delete this._gattOperationsMap[device.instanceId];
                this.emit('error', 'Failed to write to attribute with handle: ' + handle);
                callback(err);
                return;
            }

            if (!ack) {
                delete this._gattOperationsMap[device.instanceId];
                callback(undefined);
            }
        });
    }

    _longWrite(device, handle, value, callback) {
        if (value.length < this._maxPayloadSize) {
            throw new Error('Wrong write method. Use regular write for payload sizes < ' + this._maxPayloadSize);
        }

        const writeParameters = {
            write_op: this._bleDriver.BLE_GATT_OP_PREP_WRITE_REQ,
            flags: 0,
            handle: handle,
            offset: 0,
            len: this._maxPayloadSize,
            value: value.slice(0, this._maxPayloadSize),
        };

        this._bleDriver.write(device.connectionHandle, writeParameters, (err) => {
            if (err) {
                this._longWriteCancel(device, handle);
                this.emit('error', make_error('Failed to write value to device/handle ' + device.instanceId + '/' + handle, err));
            }
        });
    }

    _longWriteCancel(device, attributeHandle) {
        const gattOperation = this._gattOperationsMap[device.instanceId];
        const writeParameters = {
            write_op: this._bleDriver.BLE_GATT_OP_EXEC_WRITE_REQ,
            flags: this._bleDriver.BLE_GATT_EXEC_WRITE_FLAG_PREPARED_CANCEL,
            handle: attributeHandle,
            offset: 0,
            len: 0,
            value: [],
        };

        this._bleDriver.write(device.connectionHandle, writeParameters, err => {
            delete this._gattOperationsMap[device.instanceId];

            if (err) {
                this.emit('error', make_error('Failed to cancel failed long write', err));
                gattOperation.callback('Failed to write and failed to cancel write');
            } else {
                gattOperation.callback('Failed to write value to device/handle ' + device.instanceId + '/' + attributeHandle);
            }
        });
    }

    // Only for GATTC role

    // Callback signature function(err) {}, ack: require all notifications to ack, callback will not be called until ack is received
    startCharacteristicsNotifications(characteristicId, requireAck, callback) {
        // TODO: If CCCD not discovered do a decriptor discovery
        const enableNotificationBitfield = requireAck ? 2 : 1;
        const characteristic = this._characteristics[characteristicId];
        if (!characteristic) {
            throw new Error('Start characteristic notifications failed: Could not get characteristic with id ' + characteristicId);
        }

        const cccdDescriptor = _.find(this._descriptors, (descriptor) => {
            return (descriptor.characteristicInstanceId === characteristicId) &&
                (descriptor.uuid === 0x2902);
        });
        if (!cccdDescriptor) {
            throw new Error('Start characteristic notifications failed: Could not find CCCD descriptor with parent characteristic id: ' + characteristicId);
        }

        this.writeDescriptorValue(cccdDescriptor.instanceId, [enableNotificationBitfield, 0], true, (err) => {
            if (err) {
                this.emit('error', 'Failed to start characteristics notifications');
            }

            callback(err);
        });
    }

    // Callback signature function(err) {}
    stopCharacteristicsNotifications(characteristicId, callback) {
        // TODO: If CCCD not discovered how did we start it?
        const enableNotificationBitfield = 0;
        const characteristic = this._characteristics[characteristicId];
        if (!characteristic) {
            throw new Error('Stop characteristic notifications failed: Could not get characteristic with id ' + characteristicId);
        }

        const cccdDescriptor = _.find(this._descriptors, (descriptor) => {
            return (descriptor.characteristicInstanceId === characteristicId) &&
                (descriptor.uuid === 0x2902);
        });
        if (!cccdDescriptor) {
            throw new Error('Stop characteristic notifications failed: Could not find CCCD descriptor with parent characteristic id: ' + characteristicId);
        }

        this.writeDescriptorValue(cccdDescriptor.instanceId, [enableNotificationBitfield, 0], (err) => {
            if (err) {
                this.emit('error', 'Failed to stop characteristics notifications');
            }

            callback(err);
        });
    }
}

module.exports = Adapter;
