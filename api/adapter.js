'use strict';

const util = require('util');
const EventEmitter = require('events');
const _ = require('underscore');

const AdapterState = require('./adapterState');
const Device = require('./device');
const Service = require('./service');

// No caching of devices
// Do cache service database

var make_error = function(userMessage, description) {
    return { 'message': userMessage, 'description': description };
}

class Adapter extends EventEmitter {
    constructor(bleDriver, instanceId, port) {
        super();

        if(bleDriver === undefined) throw new Error('Missing argument bleDriver');
        if(instanceId === undefined) throw new Error('Missing argument instanceId');
        if(port === undefined) throw new Error('Missing argument port');

        this._bleDriver = bleDriver;
        this._instanceId = instanceId;
        this._adapterState = new AdapterState(instanceId, port);

        this._devices = {};

        this._services = {};
        this._characteristics = {};
        this._descriptors = {};
    }

    // Get the instance id
    get instanceId() {
        return this._instanceId;
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

    // options = { baudRate: x, parity: x, flowControl: x }
    // Callback signature function(err) {}
    open(options, callback) {
        this._changeAdapterState({baudRate: options.baudRate, parity: options.parity, flowControl: options.flowControl});

        // options.eventInterval = options.eventInterval;
        options.logCallback = this._logCallback.bind(this);
        options.eventCallback = this._eventCallback.bind(this);

        this._bleDriver.open(this._adapterState.port, options, err => {
            if(err) {
                var error = make_error('Error occurred opening serial port.', err);
                this.emit('error', error);
                callback(error);
                return;
            } else {
                this.getAdapterState((err, adapterState) => {
                    if(err) {
                        var error = make_error('Error retrieving adapter state.', err);
                        this.emit('error', error);
                        callback(error);
                        return;
                    }
                });

            }

            callback(err);
            return;
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
            switch(event.id){
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
                case this._bleDriver.BLE_GATTC_EVT_REL_DISC_RSP:
                case this._bleDriver.BLE_GATTC_EVT_CHAR_DISC_RSP:
                case this._bleDriver.BLE_GATTC_EVT_DESC_DISC_RSP:
                case this._bleDriver.BLE_GATTC_EVT_CHAR_VAL_BY_UUID_READ_RSP:
                case this._bleDriver.BLE_GATTC_EVT_READ_RSP:
                case this._bleDriver.BLE_GATTC_EVT_CHAR_VALS_READ_RSP:
                case this._bleDriver.BLE_GATTC_EVT_WRITE_RSP:
                case this._bleDriver.BLE_GATTC_EVT_HVX:
                case this._bleDriver.BLE_GATTC_EVT_TIMEOUT:
                    console.log(`Unsupported GATTC event received from SoftDevice: ${event.id} - ${event.name}`);
                    break;
                case this._bleDriver.BLE_GATTS_EVT_WRITE:
                case this._bleDriver.BLE_GATTS_EVT_RW_AUTHORIZE_REQUEST:
                case this._bleDriver.BLE_GATTS_EVT_SYS_ATTR_MISSING:
                case this._bleDriver.BLE_GATTS_EVT_HVC:
                case this._bleDriver.BLE_GATTS_EVT_SC_CONFIRM:
                case this._bleDriver.BLE_GATTS_EVT_TIMEOUT:
                    console.log(`Unsupported GATTS event received from SoftDevice: ${event.id} - ${event.name}`);
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
        if (event.role = 'BLE_GAP_ROLE_CENTRAL') {
            deviceRole = 'peripheral';
        } else if (event.role = 'BLE_GAP_ROLE_PERIPH') {
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
    }

    _parseDisconnectedEvent(event) {
        const device = this._getDeviceByConnectionHandle(event.conn_handle);
        if (!device) {
            throw new Error('Internal inconsistency: Could not find device with connection handle ' + event.conn_handle);
        }

        device.connected = false;
        delete this._devices[device.instanceId];
        this.emit('deviceDisconnected', device);
    }

    _parseConnectionParameterUpdateEvent(event) {
        const device = this._getDeviceByConnectionHandle(event.conn_handle);

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
                                    connectionSupervisionTimeout: event.conn_params.conn_sup_timeout};

        this.emit('connParamUpdateRequest', connectionParameters);
    }

    _parseAdvertismentReportEvent(event) {
        // TODO: Check address type?
        const address = event.peer_addr.address;
        const discoveredDevice = new Device(address, 'peripheral');

        if (event.data.BLE_GAP_AD_TYPE_LONG_LOCAL_NAME) {
            discoveredDevice.name = event.data.BLE_GAP_AD_TYPE_LONG_LOCAL_NAME;
        } else if (event.data.BLE_GAP_AD_TYPE_SHORT_LOCAL_NAME) {
            discoveredDevice.name = event.data.BLE_GAP_AD_TYPE_SHORT_LOCAL_NAME;
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

        discoveredDevice.rssi = event.rssi;

        this.emit('deviceDiscovered', discoveredDevice);
    }

    _parseTimeoutEvent(event) {
        switch(event.src) {
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

        if (event.count === 0) {
            // TODO: implement how we know when to call the callback from getServices.
            device.getServicesCallback();
            device.getServicesCallback = null;
            return;
        }

        services.forEach(service => {
            let uuid = service.uuid.uuid;

            if (service.uuid.type === this._bleDriver.BLE_UUID_TYPE_UNKNOWN) {
                //TODO: Implement handing of unkown uuid type (read handle)
                uuid = null;
            }

            const newService = new Service(device.instanceId, uuid);
            newService.startHandle = service.start_handle;
            newService.endHandle = service.end_handle;
            this._services[newService.instanceId] = newService;
        });

        const nextStartHandle = services[services.length - 1].end_handle + 1;

        this._bleDriver.gattc_primary_services_discover(device.connectionHandle, nextStartHandle, null);
    }

    // Callback signature function(err, state) {}
    getAdapterState(callback) {
        const changedAdapterStates = {};

        this._bleDriver.get_version((version, err) => {
            if (err) {
                var error = make_error('Failed to retrieve softdevice firmwareVersion', err);
                this.emit('error', error);
                callback(error);
                return;
            }

            changedAdapterStates.firmwareVersion = version;

            this._bleDriver.gap_get_device_name( (name, err) => {
                if (err) {
                    const error = make_error('Failed to retrieve driver version.', err);
                    this.emit('error', error);
                    callback(error);
                    return;
                }
                changedAdapterStates.name = name;

                this._bleDriver.gap_get_address( (address, err) => {
                    if (err) {
                        const error = make_error('Failed to retrieve device address.', err);
                        this.emit('error', error);
                        callback(error);
                        return;
                    }

                    changedAdapterStates.address = address;
                    changedAdapterStates.available = true;

                    this._changeAdapterState(changedAdapterStates);
                    callback(undefined, this._adapterState);
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
        const cycleMode = this._bleDriver.BLE_GAP_ADDR_CYCLE_MODE_NONE;
        // TODO: if privacy is active use this._bleDriver.BLE_GAP_ADDR_CYCLE_MODE_AUTO?

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
        const foundDeviceId = Object.keys(this._devices).find( (deviceId) => {
            return this._devices[deviceId].connectionHandle === connectionHandle;
        });
        return this._devices[foundDeviceId];
    }

    // Only for central

    // options: { active: x, interval: x, window: x timeout: x TODO: other params}. Callback signature function(err).
    startScan(options, callback) {
        this._bleDriver.start_scan(options, err => {
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
        this._bleDriver.stop_scan(err => {
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
        this._bleDriver.gap_connect(deviceAddress, options.scanParams, options.connParams, err => {
            if (err) {
                this.emit('error', make_error(`Could not connect to ${deviceAddress}`, err));
            } else {
                this._changeAdapterState({scanning: false, connecting: true});
            }

            callback(err);
        });
    }

    // Callback signature function() {}
    cancelConnect(callback) {
        this._bleDriver.gap_cancel_connect(err => {
            if (err) {
                // TODO: log more
                this.emit('error', make_error('Error occured when canceling connection', err));
            } else {
                this._changeAdapterState({connecting: false});
            }

            callback(err);
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

    _getAdvertismentParams(type, addressStruct, filterPolicy, interval, timeout) {
        // TODO: as parameters?
        const whitelistStruct = null;
        const channelMaskStruct = null;

        return {type: type, peer_addr: addressStruct, fp: filterPolicy, whitelist: whitelistStruct,
                interval: interval, timeout:timeout, channelMask: channelMaskStruct};
    }

    // name given from setName. Callback function signature: function(err) {}
    startAdvertising(advertisingData, scanResponseData, options, callback) {
        const type = this._bleDriver.BLE_GAP_ADV_TYPE_ADV_IND;
        const addressStruct = this._getAddressStruct(options.address, options.addressType);
        const filterPolicy = this._bleDriver.BLE_GAP_ADV_FP_ANY;
        const interval = options.interval;
        const timeout = options.timeout;

        //TODO: need to parse advertising and scanData and convert to byte array?
        this._bleDriver.gap_set_adv_data(advertisingData, scanResponseData);

        const advertismentParamsStruct = this._getAdvertismentParams(type, addressStruct, filterPolicy, interval, timeout);

        this._bleDriver.gap_start_advertising(advertismentParamsStruct, err => {
            if (err) {
                console.log('Failed to start advertising');
            } else {
                this._adapterState.scanning = true;
                this.emit('adapterStateChanged', this._adapterState);
            }

            callback(err);
        });
    }

    // Callback function signature: function(err) {}
    stopAdvertising(callback) {
        this._bleDriver.gap_stop_advertising(err => {
            if (err) {
                // TODO: probably is state already set to false, but should we make sure? if ys, emit adapterStateChanged?
                console.log('Error occured when stopping advertising');
            } else {
                this._changeAdapterState({advertising: false});
            }

            callback(err);
        });
    }

    // Central/peripheral

    disconnect(deviceInstanceId, callback) {
        const device = this.getDevice(deviceInstanceId);
        const hciStatusCode = this._bleDriver.BLE_HCI_REMOTE_USER_TERMINATED_CONNECTION;
        this._bleDriver.gap_disconnect(device.connectionHandle, hciStatusCode, err => {
            if (err) {
                this.emit('error', make_error('Failed to disconnect', err));
            }

            callback(err);
        });
    }

    _getConnectionUpdateParams(options) {
        return {min_conn_interval: options.minConnectionInterval, max_conn_interval: options.maxConnectionInterval,
                slave_latency: options.slaveLatency, conn_sup_timeout: options.connectionSupervisionTimeout};
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
    setServices(services) {

    }

    // GATTS/GATTC

    // Callback signature function(err, service) {}
    getService(serviceInstanceId, callback) {
        // TODO: Do read on service?
        callback(undefined, this._services[serviceInstanceId]);
    }

    // Callback signature function(err, services) {}. If deviceInstanceId is local, local database (GATTS)
    getServices(deviceInstanceId, callback) {
        const device = this.getDevice(deviceInstanceId);

        this._bleDriver.gattc_primary_services_discover(device.connectionHandle, 0, null, err => {
            if (err) {
                this.emit('error', make_error('Failed to get services', err));
                callback(err);
                return;
            }

            // TODO: Find better way to store this callback?
            device.getServicesCallback = callback;
        });
    }


    // Callback signature function(err, characteristic) {}
    getCharacteristic(characteristicId, callback) {
        // TODO: Do read on characteristic?
        callback(undefined, this._characteristics[characteristicId]);
    }

    // Callback signature function(err, characteristics) {}
    getCharacteristics(serviceId, callback) {
        const service = this.getService(serviceId);
        const device = this.getDevice(service.deviceInstanceId);
        const handleRange = {startHandle: service.startHandle, endHandle: service.endHandle};

        this._bleDriver.gattc_characteristic_discover(device.connectionHandle, handleRange, err => {
            if (err) {
                this.emit('error', make_error('Failed to get Characteristics', err));
                callback(err);
                return;
            }

            // TODO: Find better way to store this callback?
            service.getCharacteristicsCallback = callback;
        });
    }


    // Callback signature function(err, descriptor) {}
    getDescriptor(descriptorId, callback) {
        // TODO: Do read on descriptor?
        callback(undefined, this._descriptors[descriptorId]);
    }

    // Callback signature function(err, descriptors) {}
    getDescriptors(characteristicId, callback) {
        const characteristic = this.getCharacteristic(characteristicId);
        const service = this.getService(characteristic.serviceInstanceId);
        const device = this.getDevice(service.deviceInstanceId);

        // TODO: How do we know where characteristic end?
        const handleRange = {startHandle: characteristic.valueHandle+1, endHandle: service.endHandle};

        this._bleDriver.gattc_characteristic_discover(device.connectionHandle, handleRange, err => {
            if (err) {
                this.emit('error', make_error('Failed to get Descriptors', err));
                callback(err);
                return;
            }

            // TODO: Find better way to store this callback?
            characteristic.getDescriptorsCallback = callback;
        });
    }


    // Callback signature function(err) {}
    readCharacteristicsValue(characteristicId, offset, callback) {

    }

    // Callback signature function(err) {}  ack: require acknowledge from device, irrelevant in GATTS role. options: {ack, long, offset}
    writeCharacteristicsValue(characteristicId, value, options, callback) {

    }


    // Callback signature function(err) {}
    readDescriptorValue(descriptorId, offset, callback) {

    }

    // Callback signature function(err) {}, callback will not be called unti ack is received. options: {ack, long, offset}
    writeDescriptorValue(descriptorId, value, options, callback) {

    }

    // Only for GATTC role

    // Callback signature function(err) {}, ack: require all notifications to ack, callback will not be called until ack is received
    startCharacteristicsNotifications(characteristicId, ack_notifications, callback) {

    }

    // Callback signature function(err) {}
    stopCharacteristicsNotifications(characteristicId, callback) {

    }
}

module.exports = Adapter;
