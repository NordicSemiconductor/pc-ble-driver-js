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

        this._maxReadPayloadSize = this._bleDriver.GATT_MTU_SIZE_DEFAULT - 1;
        this._maxShortWritePayloadSize = this._bleDriver.GATT_MTU_SIZE_DEFAULT - 3;
        this._maxLongWritePayloadSize = this._bleDriver.GATT_MTU_SIZE_DEFAULT - 5;

        this._gapOperationsMap = {};
        this._gattOperationsMap = {};

        this._preparedWritesMap = {};
    }

    _getServiceType(service) {
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
    }

    // Get the instance id
    get instanceId() {
        return this._instanceId;
    }

    // get current adapter state. No calls to driver.
    get adapterState() {
        return this._adapterState;
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
            this.emit('opened', this);
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
        this.emit('closed', this);
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
            switch (event.id) {
                case this._bleDriver.BLE_GAP_EVT_CONNECTED:
                    this._parseConnectedEvent(event);
                    break;
                case this._bleDriver.BLE_GAP_EVT_DISCONNECTED:
                    this._parseDisconnectedEvent(event);
                    break;
                case this._bleDriver.BLE_GAP_EVT_CONN_PARAM_UPDATE:
                    this._parseConnectionParameterUpdateEvent(event);
                    break;
                case this._bleDriver.BLE_GAP_EVT_SEC_PARAMS_REQUEST:
                    this._parseSecParamsRequestEvent(event);
                    break;
                case this._bleDriver.BLE_GAP_EVT_AUTH_STATUS:
                    this._parseAuthStatusEvent(event);
                    break;
                case this._bleDriver.BLE_GAP_EVT_CONN_SEC_UPDATE:
                    this._parseConnSecUpdateEvent(event);
                    break;
                // TODO: Implement for security/bonding
                /*
                case this._bleDriver.BLE_GAP_EVT_SEC_INFO_REQUEST:
                case this._bleDriver.BLE_GAP_EVT_PASSKEY_DISPLAY:
                case this._bleDriver.BLE_GAP_EVT_AUTH_KEY_REQUEST:
                */
                case this._bleDriver.BLE_GAP_EVT_TIMEOUT:
                    this._parseGapTimeoutEvent(event);
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
                    console.log('GATTC timeout');
                    console.log(event);
                    // TODO: Implement
                    break;
                case this._bleDriver.BLE_GATTS_EVT_WRITE:
                    this._parseWriteEvent(event);
                    break;
                case this._bleDriver.BLE_GATTS_EVT_RW_AUTHORIZE_REQUEST:
                    this._parseRWAutorizeRequestEvent(event);
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
                    console.log('Timeout');
                    break;
                case this._bleDriver.BLE_EVT_USER_MEM_REQUEST:
                    // TODO: Need this for receiving long writes?
                    //this._bleDriver.user_mem_request(null);
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

        this.emit('deviceConnected', device);

        if (deviceRole === 'peripheral') {
            const callback = this._gapOperationsMap.connecting.callback;
            delete this._gapOperationsMap.connecting;
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
            // TODO: How do we know what the callback expects? Check disconnected event reason?
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
        if (this._gapOperationsMap[device.instanceId]) {
            const callback = this._gapOperationsMap[device.instanceId].callback;
            delete this._gapOperationsMap[device.instanceId];
            callback(undefined, device);
        }

        this.emit('connParamUpdate', device);
    }

    _parseSecParamsRequestEvent(event) {
        const device = this._getDeviceByConnectionHandle(event.conn_handle);
        const role = device.role;

        const secParamsCentral = null;
        const secParamsPeripheral = {
                bond: false,
                mitm: false,
                io_caps: this._bleDriver.BLE_GAP_IO_CAPS_NONE,
                oob: false,
                min_key_size: 7,
                max_key_size: 16,
                kdist_periph: {
                    enc: false,
                    id: false,
                    sign: false,
                },
                kdist_central: {
                    enc: false,
                    id: false,
                    sign: false,
                },
        };

        let secParams;
        if (role === 'central') {
            secParams = secParamsPeripheral;
        } else {
            secParams = secParamsCentral;
        }

        const connectionHandle = event.conn_handle;

        this._bleDriver.gap_sec_params_reply(
            event.conn_handle,
            this._bleDriver.BLE_GAP_SEC_STATUS_SUCCESS, //sec_status
            secParams,
            { // sec_keyset
                keys_periph: {
                    enc_key: {
                        enc_info: {
                            ltk: [0, 0, 0, 0, 0, 0, 0, 0],
                            auth: false,
                            ltk_len: 8,
                        },
                        master_id: {
                            ediv: 0x1234,
                            rand: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                        },
                    },
                    id_key: null,
                    sign_key: null,
                },
                keys_central: {
                    enc_key: {
                        enc_info: {
                            ltk: [0, 0, 0, 0, 0, 0, 0, 0],
                            auth: false,
                            ltk_len: 8,
                        },
                        master_id: {
                            ediv: 0x1234,
                            rand: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                        },
                    },
                    id_key: null,
                    sign_key: null,
                },
            },
            (err, keyset) => {
                if (err) {
                    this.emit('error', 'Failed to call security parameters reply');
                    this._changeAdapterState({securityRequestPending: false});
                    return;
                }
            }
        );
    }

    _parseConnSecUpdateEvent(event) {
        //console.log('Received connSecUpdate event: ' + JSON.stringify(event));
    }

    _parseAuthStatusEvent(event) {
        //console.log('Received authStatus event: ' + JSON.stringify(event));
        if (event.auth_status === this._bleDriver.BLE_GAP_SEC_STATUS_SUCCESS) {
            this.emit('securityChanged', event);
        } else {
            this.emit('error', 'Pairing failed with error ' + event.auth_status);
        }

        this._changeAdapterState({securityRequestPending: false});
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
        discoveredDevice.processEventData(event);
        this.emit('deviceDiscovered', discoveredDevice);
    }

    _parseGapTimeoutEvent(event) {
        switch (event.src) {
            case this._bleDriver.BLE_GAP_TIMEOUT_SRC_ADVERTISING:
                this._changeAdapterState({advertising: false});
                break;
            case this._bleDriver.BLE_GAP_TIMEOUT_SRC_SCAN:
                this._changeAdapterState({scanning: false});
                break;
            case this._bleDriver.BLE_GAP_TIMEOUT_SRC_CONN:
                this._changeAdapterState({connecting: false});
                break;
            case this._bleDriver.BLE_GAP_TIMEOUT_SRC_SECURITY_REQUEST:
                this._changeAdapterState({securityRequestPending: false});
                this.emit('error', make_error('Security operation timeout.'));
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
                    // Only take the first found handle and start the read process.
                    const handleAsNumber = parseInt(handle, 10);
                    this._bleDriver.gattc_read(device.connectionHandle, handleAsNumber, 0, err => {
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
            const newCharacteristic = new Characteristic(service.instanceId, uuid, [], properties);
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
        const handleRange = {start_handle: nextStartHandle, end_handle: service.endHandle};

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
                    const handleAsNumber = parseInt(handle, 10);

                    // Just take the first found handle and start the read process.
                    this._bleDriver.gattc_read(device.connectionHandle, handleAsNumber, 0, err => {
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
        const data = event.data;
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
                const newReadHandleAsNumber = parseInt(newReadHandle, 10);

                // Just take the first found handle and start the read process.
                this._bleDriver.gattc_read(device.connectionHandle, newReadHandleAsNumber, 0, err => {
                    if (err) {
                        this.emit('error', err);

                        // Call getAttributecallback callback??
                    }
                });
                break;
            }
        } else {
            gattOperation.readBytes = gattOperation.readBytes.concat(event.data);

            if (event.data.length < this._maxReadPayloadSize) {
                delete this._gattOperationsMap[device.instanceId];
                gattOperation.callback(undefined, gattOperation.readBytes);
            } else if (event.data.length === this._maxReadPayloadSize) {
                // We need to read more:
                this._bleDriver.gattc_read(event.conn_handle, event.handle, gattOperation.readBytes.length, err => {
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

        if (!device) {
            delete this._gattOperationsMap[device.instanceId];
            this.emit('error', 'Failed to handle write event, no device with handle ' + device.instanceId + 'found.');
            gattOperation.callback(make_error('Failed to handle write event, no device with connection handle ' + event.conn_handle + 'found'));
            return;
        }

        // TODO: Check gatt error? event.gatt_status === BLE_GATT_STATUS_SUCCESS

        if (event.write_op === this._bleDriver.BLE_GATT_OP_WRITE_CMD) {
            gattOperation.attribute.value = gattOperation.value;
        } else if (event.write_op === this._bleDriver.BLE_GATT_OP_PREP_WRITE_REQ) {

            const writeParameters = {
                write_op: 0,
                flags: 0,
                handle: handle,
                offset: 0,
                len: 0,
                p_value: [],
            };

            if (gattOperation.bytesWritten < gattOperation.value.length) {
                const value = gattOperation.value.slice(gattOperation.bytesWritten, gattOperation.bytesWritten + this._maxLongWritePayloadSize);

                writeParameters.write_op = this._bleDriver.BLE_GATT_OP_PREP_WRITE_REQ;
                writeParameters.handle = handle;
                writeParameters.offset = gattOperation.bytesWritten;
                writeParameters.len = value.length;
                writeParameters.p_value = value;
                gattOperation.bytesWritten += value.length;

                this._bleDriver.gattc_write(device.connectionHandle, writeParameters, err => {

                    if (err) {
                        console.log('some error');
                        this._longWriteCancel(device, gattOperation.attribute);
                        this.emit('error', make_error('Failed to write value to device/handle ' + device.instanceId + '/' + handle, err));
                        return;
                    }
                });
            } else {
                writeParameters.write_op = this._bleDriver.BLE_GATT_OP_EXEC_WRITE_REQ;
                writeParameters.flags = this._bleDriver.BLE_GATT_EXEC_WRITE_FLAG_PREPARED_WRITE;

                this._bleDriver.gattc_write(device.connectionHandle, writeParameters, err => {

                    if (err) {
                        this._longWriteCancel(device, gattOperation.attribute);
                        this.emit('error', make_error('Failed to write value to device/handle ' + device.instanceId + '/' + handle, err));
                        return;
                    }
                });
            }

            return;
        } else if (event.write_op === this._bleDriver.BLE_GATT_OP_EXEC_WRITE_REQ) {
            // TODO: Need to check if gattOperation.bytesWritten is equal to gattOperation.value length?
            gattOperation.attribute.value = gattOperation.value;
            delete this._gattOperationsMap[device.instanceId];
        } else if (event.write_op === this._bleDriver.BLE_GATT_OP_WRITE_REQ) {
            gattOperation.attribute.value = gattOperation.value;
            delete this._gattOperationsMap[device.instanceId];
        }

        this._emitAttributeValueChanged(gattOperation.attribute);

        gattOperation.callback(undefined, gattOperation.attribute);
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

    _getCharacteristicByValueHandle(valueHandle) {
        return _.find(this._characteristics, (characteristic) => characteristic.valueHandle === valueHandle);
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

    _getAttributeByHandle(deviceInstanceId, handle) {
        return this._getDescriptorByHandle(deviceInstanceId, handle) ||
               this._getCharacteristicByValueHandle(deviceInstanceId, handle) ||
               this._getCharacteristicByHandle(deviceInstanceId, handle) ||
               this._getServiceByHandle(deviceInstanceId, handle);
    }

    _emitAttributeValueChanged(attribute) {
        if (attribute instanceof Characteristic) {
            this.emit('characteristicValueChanged', attribute);
        } else if (attribute instanceof Descriptor) {
            this.emit('descriptorValueChanged', attribute);
        }
    }

    _parseHvxEvent(event) {
        if (event.type === this._bleDriver.BLE_GATT_HVX_INDICATION) {
            this._bleDriver.gattc_confirm_handle_value(event.conn_handle, event.handle);
        }

        const characteristic = this._getCharacteristicByValueHandle(event.handle);
        if (!characteristic) {
            this.emit('error', make_Error('Cannot handle HVX event', 'No characteristic has a value descriptor with handle: ' + event.handle));
            return;
        }

        characteristic.value = event.data;
        this.emit('characteristicValueChanged', characteristic);
    }

    _parseWriteEvent(event) {
        // TODO: BLE_GATTS_OP_SIGN_WRITE_CMD not supported?
        const device = this._getDeviceByConnectionHandle(event.conn_handle);
        const attribute = this._getAttributeByHandle(device.instanceId, event.handle);

        if (event.op === this._bleDriver.BLE_GATTS_OP_WRITE_REQ) {
            const attribute = this._getAttributeByHandle(event.handle);
            this._setAttributeValueWithOffset(attribute, event.data, event.offset);
            delete this._preparedWritesMap[device.instanceId];
            this._emitAttributeValueChanged(attribute);
        } else if (event.op === this._bleDriver.BLE_GATTS_OP_WRITE_CMD) {
            // TODO: Find attribute and change value
            const attribute = this._getAttributeByHandle(event.handle);
            this._setAttributeValueWithOffset(attribute, event.data, event.offset);
            delete this._preparedWritesMap[device.instanceId];
            this._emitAttributeValueChanged(attribute);
        } else if (event.op === this._bleDriver.BLE_GATTS_OP_PREP_WRITE_REQ) {
            if (!this._preparedWritesMap[device.instanceId]) {
                this._preparedWritesMap[device.instanceId] = {};
            }

            const preparedWrite = this._preparedWritesMap[device.instanceId][event.handle];
            if (!preparedWrite || event.offset <= preparedWrite.offset) {
                this._preparedWritesMap[device.instanceId][event.handle] = {value: event.data, offset: event.offset};
                return;
            }

            // TODO: What to do if event.offset > preparedWrite.offset + preparedWrite.value.length?
            preparedWrite.value = preparedWrite.value.slice(0, event.offset - preparedWrite.offset).concat(event.data);
        } else if (event.op === this._bleDriver.BLE_GATTS_OP_EXEC_WRITE_REQ_CANCEL) {
            delete this._preparedWritesMap[device.instanceId];
        } else if (event.op === this._bleDriver.BLE_GATTS_OP_EXEC_WRITE_REQ_NOW) {
            for (let handle of this._preparedWritesMap[device.instanceId]) {
                const preparedWrite = this._preparedWritesMap[device.instanceId][handle];
                const attribute = this._getAttributeByHandle(handle);

                this._writeLocalValue(attribute, preparedWrite.value, preparedWrite.offset, err => {
                    if (err) {
                        // TODO: Rollback if we fail? if yes should we wait with emiting attributes?
                        this.emit('error', make_error('Failed to set local attribute value when executing prepared writes'));
                        return;
                    }

                    this._emitAttributeValueChanged(attribute);
                });
            }

            delete this._preparedWritesMap[device.instanceId];
        }
    }

    _parseRWAutorizeRequestEvent(event) {
        // TODO: What to do here? Ask user of API for accept or reject?
    }

    _setAttributeValueWithOffset(attribute, value, offset) {
        attribute.value = attribute.value.slice(0, offset).concat(value);
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

    _getDeviceByAddress(address) {
        const foundDeviceId = Object.keys(this._devices).find(deviceId => {
            return this._devices[deviceId].address === address;
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
        if (!_.isEmpty(this._gapOperationsMap)) {
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
                this._gapOperationsMap.connecting = {callback: callback};
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
                delete this._gapOperationsMap.connecting;
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

        retval.channel_mask = {};
        retval.channel_mask.ch_37_off = 0;
        retval.channel_mask.ch_38_off = 0;
        retval.channel_mask.ch_39_off = 0;

        if (params.channelMask) {
            for (let channel in params.channelMask) {
                switch (params.channelMask[channel]) {
                    case 'ch37off':
                        retval.channel_mask.ch_37_off = 1;
                        break;
                    case 'ch38off':
                        retval.channel_mask.ch_38_off = 1;
                        break;
                    case 'ch39off':
                        retval.channel_mask.ch_39_off = 1;
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
            throw new Error('You have to provide a timeout.');
        }

        // TOOD: fix fp logic later
        retval.fp = this._bleDriver.BLE_GAP_ADV_FP_ANY;

        // Default value is that device is connectable undirected.
        retval.type = this._bleDriver.BLE_GAP_ADV_TYPE_ADV_IND;

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

        const advDataStruct = Array.from(AdType.convertToBuffer(advData));
        const scanRespDataStruct = Array.from(AdType.convertToBuffer(scanRespData));

        this._bleDriver.gap_set_advertising_data(
            advDataStruct,
            scanRespDataStruct,
            err => {
                if (this.checkAndPropagateError(err, 'Failed to set advertising data.', callback)) return;

                this._bleDriver.gap_start_advertising(advParams, err => {
                    if (this.checkAndPropagateError(err, 'Failed to start advertising.', callback)) return;
                    this._changeAdapterState({advertising: true});
                    if (callback) callback();
                });
            }
        );
    }

    // Callback function signature: function(err) {}
    stopAdvertising(callback) {
        this._bleDriver.gap_stop_advertising(err => {
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
    updateConnectionParameters(deviceInstanceId, options, callback) {
        const device = this.getDevice(deviceInstanceId);
        if (!device) {
            throw new Error('No device with instance id: ' + deviceInstanceId);
        }

        const connectionParamsStruct = this._getConnectionUpdateParams(options);
        this._bleDriver.gap_update_connection_parameters(device.connectionHandle, connectionParamsStruct, err => {
            if (err) {
                const errorObject = make_error('Failed to update connection parameters', err);
                this.emit('error', errorObject);
                callback(errorObject);
            } else {
                this._gapOperationsMap[deviceInstanceId] = {
                    callback,
                };
            }
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

    // callback signature function(err) {}
    pair(deviceInstanceId, bond, callback) {
        if (bond) {
            const errorObject = make_error('Bonding is not (yet) supported', undefined);
            this.emit('error', errorObject);
            callback(errorObject);
            return;
        }

        if (this.adapterState.securityRequestPending) {
            const errorObject = make_error('Failed to pair, a security operation is already in progress', undefined);
            this.emit('error', errorObject);
            callback(errorObject);
            return;
        }

        const device = this.getDevice(deviceInstanceId);

        if (!device) {
            const errorObject = make_error('Failed to pair, Could not find device with id ' + JSON.stringify(deviceInstanceId));
            this.emit('error', errorObject);
            callback(errorObject);
            return;
        }

        this._changeAdapterState({securityRequestPending: true});

        this._bleDriver.gap_authenticate(device.connectionHandle, {
                bond: false,
                mitm: false,
            io_caps: this._bleDriver.BLE_GAP_IO_CAPS_NONE,
                oob: false,
                min_key_size: 7,
                max_key_size: 16,
                kdist_periph: {
                    enc: false,
                    id: false,
                    sign: false,
                },
                kdist_central: {
                    enc: false,
                    id: false,
                    sign: false,
                },
            },
            err => {
            let errorObject;
                if (err) {
                errorObject = make_error('Failed to authenticate', err);
                    this.emit('error', errorObject);
                }

            this._changeAdapterState({securityRequestPending: false});
            callback(errorObject);
        });
            }

    // GATTS
    // Array of services
    setServices(services, callback) {
        let decodeUUID = (uuid, data) => {
            return new Promise((resolve, reject) => {
                const length = uuid.length === 32 ? 16 : 2;

                this._bleDriver.decode_uuid(length, uuid, (err, _uuid) => {
                    if (err) {
                        // If the UUID is not found it is a 128-bit UUID
                        // so we have to add it to the SD and try again
                        if (err.errno === this._bleDriver.NRF_ERROR_NOT_FOUND && length === 16) {
                            const base_uuid =
                                uuid.substr(0, 4) + '0000-' +
                                uuid.substr(8, 4) + '-' +
                                uuid.substr(12, 4) + '-' +
                                uuid.substr(16, 4) + '-' +
                                uuid.substr(20);

                            this._bleDriver.add_vs_uuid(
                                {uuid128: base_uuid},
                                (err, type) => {
                                    if (err) {
                                        reject(make_error(`Unable to add UUID ${uuid} to SoftDevice`, err));
                                    } else {
                                        this._bleDriver.decode_uuid(length, uuid, (err, _uuid) => {
                                            if (err) {
                                                reject(make_error(`Unable to decode UUID ${uuid}`, err));
                                            } else {
                                                data.decoded_uuid = _uuid;
                                                resolve(data);
                                            }
                                        });
                                    }
                                }
                            );
                        } else {
                            reject(make_error(`Unable to decode UUID ${uuid}`, err));
                        }
                    } else {
                        data.decoded_uuid = _uuid;
                        resolve(data);
                    }
                });
            });
        };

        let addService = (service, type, data) => {
            return new Promise((resolve, reject) => {
                console.log(`Adding service ${JSON.stringify(service)}`);

                var p = Promise.resolve(data);
                var decode = decodeUUID.bind(undefined, service.uuid);

                p.then(decode).then(data => {
                    this._bleDriver.gatts_add_service(type, data.decoded_uuid, (err, serviceHandle) => {
                        if (err) {
                            reject(make_error('Error occurred adding service.', err));
                        } else {
                            data.serviceHandle = serviceHandle;
                            service.handle = serviceHandle;
                            this._services[service.instanceId] = service; // TODO: what if we fail later on this service ?
                            resolve(data);
                        }
                    });
                }).catch(err => {
                    reject(err);
                });
            });
        };

        let addCharacteristic = (characteristic, data) => {
            return new Promise((resolve, reject) => {
                console.log(`Adding characterstic ${JSON.stringify(characteristic)}`);
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
            console.log(`Adding descriptor ${JSON.stringify(descriptor)}`);
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
            p = addService.bind(undefined, service, this._getServiceType(service));
            promises.push(p);

            for (let characteristic of service._factory_characteristics) {
                p = addCharacteristic.bind(undefined, characteristic);
                promises.push(p);

                if (characteristic._factory_descriptors) {
                    for (let descriptor of characteristic._factory_descriptors) {
                        p = addDescriptor.bind(undefined, descriptor);
                        promises.push(p);
                    }
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

        const alreadyFoundServices = _.filter(this._services, service => {
            return deviceInstanceId === service.deviceInstanceId;
        });

        if (!_.isEmpty(alreadyFoundServices)) {
            callback(undefined, alreadyFoundServices);
            return;
        }

        this._gattOperationsMap[device.instanceId] = {callback: callback, pendingHandleReads: {}, parent: device};
        this._bleDriver.gattc_primary_services_discover(device.connectionHandle, 1, 0, (err, services) => {
            if (err) {
                this.emit('error', make_error('Failed to get services', err));
                callback(err);
                return;
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

        const alreadyFoundCharacteristics = _.filter(this._characteristics, characteristic => {
            return serviceId === characteristic.serviceInstanceId;
        });

        if (!_.isEmpty(alreadyFoundCharacteristics)) {
            callback(undefined, alreadyFoundCharacteristics);
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

        const alreadyFoundDescriptor = _.filter(this._descriptors, descriptor => {
            return characteristicId === descriptor.characteristicInstanceId;
        });

        if (!_.isEmpty(alreadyFoundDescriptor)) {
            callback(undefined, alreadyFoundDescriptor);
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
    readCharacteristicValue(characteristicId, callback) {
        const characteristic = this.getCharacteristic(characteristicId);
        if (!characteristic) {
            throw new Error('Characteristic value read failed: Could not get characteristic with id ' + characteristicId);
        }

        if (this._instanceIdIsOnLocalDevice(characteristicId)) {
            this._readLocalValue(characteristic, callback);
            return;
        }

        const device = this._getDeviceByCharacteristicId(characteristicId);
        if (!device) {
            throw new Error('Characteristic value read failed: Could not get device');
        }

        if (this._gattOperationsMap[device.instanceId]) {
            throw new Error('Characteristic value read failed: A gatt operation already in progress with device id ' + device.instanceId);
        }

        this._gattOperationsMap[device.instanceId] = {callback: callback, readBytes: []};

        this._bleDriver.gattc_read(device.connectionHandle, characteristic.valueHandle, 0, err => {
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

        if (this._instanceIdIsOnLocalDevice(characteristicId)) {
            this._writeLocalValue(characteristic, value, 0, callback);
            return;
        }

        const device = this._getDeviceByCharacteristicId(characteristicId);
        if (!device) {
            throw new Error('Characteristic value write failed: Could not get device');
        }

        if (this._gattOperationsMap[device.instanceId]) {
            throw new Error('Characteristic value write failed: A gatt operation already in progress with device id ' + device.instanceId);
        }

        this._gattOperationsMap[device.instanceId] = {callback: callback, bytesWritten: 0, value: value.slice(), attribute: characteristic};

        if (value.length > this._maxShortWritePayloadSize) {
            if (!ack) {
                throw new Error('Long writes do not support BLE_GATT_OP_WRITE_CMD');
            }

            this._gattOperationsMap[device.instanceId].bytesWritten = this._maxLongWritePayloadSize;
            this._longWrite(device, characteristic, value, callback);
        } else {
            this._gattOperationsMap[device.instanceId].bytesWritten = value.length;
            this._shortWrite(device, characteristic, ack, value, callback);
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

    _instanceIdIsOnLocalDevice(instanceId) {
        return instanceId.split('.')[0] === 'local';
    }

    readDescriptorValue(descriptorId, callback) {
        const descriptor = this.getDescriptor(descriptorId);
        if (!descriptor) {
            throw new Error('Descriptor read failed: could not get descriptor with id ' + descriptorId);
        }

        if (this._instanceIdIsOnLocalDevice(descriptorId)) {
            this._readLocalValue(descriptor, callback);
            return;
        }

        const device = this._getDeviceByDescriptorId(descriptorId);
        if (!device) {
            throw new Error('Descriptor read failed: Could not get device');
        }

        if (this._gattOperationsMap[device.instanceId]) {
            throw new Error('Descriptor read failed: A gatt operation already in progress with device with id ' + device.instanceId);
        }

        this._gattOperationsMap[device.instanceId] = {callback: callback, readBytes: []};

        this._bleDriver.gattc_read(device.connectionHandle, descriptor.handle, 0, (err) => {
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

        if (this._instanceIdIsOnLocalDevice(descriptorId)) {
            this._writeLocalValue(descriptor, value, 0, callback);
            return;
        }

        const device = this._getDeviceByDescriptorId(descriptorId);
        if (!device) {
            throw new Error('Descriptor write failed: Could not get device');
        }

        if (this._gattOperationsMap[device.instanceId]) {
            throw new Error('Descriptor write failed: A gatt operation already in progress with device with id ' + device.instanceId);
        }

        this._gattOperationsMap[device.instanceId] = {callback: callback, bytesWritten: 0, value: value.slice(), attribute: descriptor};

        if (value.length > this._maxShortWritePayloadSize) {
            if (!ack) {
                throw new Error('Long writes do not support BLE_GATT_OP_WRITE_CMD');
            }

            this._gattOperationsMap[device.instanceId].bytesWritten = this._maxLongWritePayloadSize;
            this._longWrite(device, descriptor, value, callback);
        } else {
            this._gattOperationsMap[device.instanceId].bytesWritten = value.length;
            this._shortWrite(device, descriptor, value, ack, callback);
        }
    }

    _shortWrite(device, attribute, value, ack, callback) {
        const writeParameters = {
            write_op: ack ? this._bleDriver.BLE_GATT_OP_WRITE_REQ : this._bleDriver.BLE_GATT_OP_WRITE_CMD,
            flags: 0, // don't care for WRITE_REQ / WRITE_CMD
            handle: attribute.handle,
            offset: 0,
            len: value.length,
            p_value: value,
        };

        this._bleDriver.gattc_write(device.connectionHandle, writeParameters, (err) => {
            if (err) {
                delete this._gattOperationsMap[device.instanceId];
                this.emit('error', 'Failed to write to attribute with handle: ' + attribute.handle);
                callback(err);
                return;
            }

            if (!ack) {
                delete this._gattOperationsMap[device.instanceId];
                attribute.value = value;
                callback(undefined, attribute);
            }
        });
    }

    _longWrite(device, attribute, value, callback) {
        if (value.length < this._maxShortWritePayloadSize) {
            throw new Error('Wrong write method. Use regular write for payload sizes < ' + this._maxShortWritePayloadSize);
        }

        const writeParameters = {
            write_op: this._bleDriver.BLE_GATT_OP_PREP_WRITE_REQ,
            flags: this._bleDriver.BLE_GATT_EXEC_WRITE_FLAG_PREPARED_WRITE,
            handle: attribute.handle,
            offset: 0,
            len: this._maxLongWritePayloadSize,
            p_value: value.slice(0, this._maxLongWritePayloadSize),
        };

        this._bleDriver.gattc_write(device.connectionHandle, writeParameters, (err) => {
            if (err) {
                console.log(err);
                this._longWriteCancel(device, attribute);
                this.emit('error', make_error('Failed to write value to device/handle ' + device.instanceId + '/' + attribute.handle, err));
                return;
            }

        });
    }

    _longWriteCancel(device, attribute) {
        const gattOperation = this._gattOperationsMap[device.instanceId];
        const writeParameters = {
            write_op: this._bleDriver.BLE_GATT_OP_EXEC_WRITE_REQ,
            flags: this._bleDriver.BLE_GATT_EXEC_WRITE_FLAG_PREPARED_CANCEL,
            handle: attribute.handle,
            offset: 0,
            len: 0,
            p_value: [],
        };

        this._bleDriver.gattc_write(device.connectionHandle, writeParameters, err => {
            delete this._gattOperationsMap[device.instanceId];

            if (err) {
                this.emit('error', make_error('Failed to cancel failed long write', err));
                gattOperation.callback('Failed to write and failed to cancel write');
            } else {
                gattOperation.callback('Failed to write value to device/handle ' + device.instanceId + '/' + attribute.handle);
            }
        });
    }

    _writeLocalValue(attribute, value, offset, callback) {
        const writeParameters = {
            len: value.length,
            offset: offset,
            p_value: value,
        };

        this._bleDriver.gatts_set_value(this._bleDriver.BLE_CONN_HANDLE_INVALID, attribute.handle, writeParameters, (err, writeResult) => {
            if (err) {
                this.emit('error', make_error('Failed to write local value', err));
                callback(err, undefined);
                return;
            }

            this._setAttributeValueWithOffset(attribute, value, offset);
            callback(undefined, attribute);
        });
    }

    _readLocalValue(attribute, callback) {
        const readParameters = {
            len: 512,
            offset: 0,
            p_value: [],
        };

        this._bleDriver.gatts_get_value(this._bleDriver.BLE_CONN_HANDLE_INVALID, attribute, readParameters, (err, readResults) => {
            if (err) {
                this.emit('error', make_error('Failed to write local value', err));
                callback(err, undefined);
                return;
            }

            attribute.value = readResults.p_value;
            callback(undefined, attribute);
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
                (descriptor.uuid === '0000290200001000800000805F9B34FB');
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
        const disableNotificationBitfield = 0;
        const characteristic = this._characteristics[characteristicId];
        if (!characteristic) {
            throw new Error('Stop characteristic notifications failed: Could not get characteristic with id ' + characteristicId);
        }

        const cccdDescriptor = _.find(this._descriptors, (descriptor) => {
            return (descriptor.characteristicInstanceId === characteristicId) &&
                (descriptor.uuid === '0000290200001000800000805F9B34FB');
        });
        if (!cccdDescriptor) {
            throw new Error('Stop characteristic notifications failed: Could not find CCCD descriptor with parent characteristic id: ' + characteristicId);
        }

        this.writeDescriptorValue(cccdDescriptor.instanceId, [disableNotificationBitfield, 0], true, (err) => {
            if (err) {
                this.emit('error', 'Failed to stop characteristics notifications');
            }

            callback(err);
        });
    }
}

module.exports = Adapter;
