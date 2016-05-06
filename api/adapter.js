/* Copyright (c) 2016 Nordic Semiconductor. All Rights Reserved.
 *
 * The information contained herein is property of Nordic Semiconductor ASA.
 * Terms and conditions of usage are described in detail in NORDIC
 * SEMICONDUCTOR STANDARD SOFTWARE LICENSE AGREEMENT.
 *
 * Licensees are granted free, non-transferable use of the information. NO
 * WARRANTY of ANY KIND is provided. This heading must NOT be removed from
 * the file.
 *
 */

'use strict';

const EventEmitter = require('events');
const _ = require('underscore');

const AdapterState = require('./adapterState');
const Device = require('./device');
const Service = require('./service');
const Characteristic = require('./characteristic');
const Descriptor = require('./descriptor');
const AdType = require('./util/adType');
const Converter = require('./util/sdConv');
const ToText = require('./util/toText');
const logLevel = require('./util/logLevel');
const Security = require('./security');

const _makeError = function (userMessage, description) {
    return { message: userMessage, description: description };
};

/**
 * Class to mediate error conditions.
 */
class Error {
    constructor(userMessage, description) {
        /**
         * @type {Object}
         * @property {string} message - Message to show to user
         * @property {string} description - A detailed description of the error
         */
        this.message = userMessage;
        this.description = description;
    }
}

class Adapter extends EventEmitter {
    /**
     * Create an adapter, this constructor is used by the AdapterFactory and should not be necessary for the developer to use
     * @param {object} bleDriver - The driver to use for getting constants from the pc-ble-driver-js AddOn
     * @param {object} adapter - The adapter to use. The adapter is an object received from the pc-ble-driver-js AddOn
     * @param {string} instanceId - A unique id that represents this Adapter instance
     * @param {string} port - The port this adapter uses. For example it can be COM1, /dev/ttyUSB0 or similar
     * @param {string} notSupportedMessage - Message given to developer if the adapter is not supported on this platform.
     *
     * @emits {Error} Emitted when error occurs
     *
     */
    constructor(bleDriver, adapter, instanceId, port, notSupportedMessage) {
        super();

        if (bleDriver === undefined) { throw new Error('Missing argument bleDriver.'); }
        if (adapter === undefined) { throw new Error('Missing argument adapter.'); }
        if (instanceId === undefined) { throw new Error('Missing argument instanceId.'); }
        if (port === undefined) { throw new Error('Missing argument port.'); }

        this._bleDriver = bleDriver;
        this._adapter = adapter;
        this._instanceId = instanceId;
        this._state = new AdapterState(instanceId, port);
        this._security = Security.getInstance(this._bleDriver);
        this._notSupportedMessage = notSupportedMessage;

        this._maxReadPayloadSize = this._bleDriver.GATT_MTU_SIZE_DEFAULT - 1;
        this._maxShortWritePayloadSize = this._bleDriver.GATT_MTU_SIZE_DEFAULT - 3;
        this._maxLongWritePayloadSize = this._bleDriver.GATT_MTU_SIZE_DEFAULT - 5;
        this._keys = null;

        this._init();
    }

    _init() {
        this._devices = {};
        this._services = {};
        this._characteristics = {};
        this._descriptors = {};

        this._converter = new Converter(this._bleDriver, this._adapter);

        this._gapOperationsMap = {};
        this._gattOperationsMap = {};

        this._preparedWritesMap = {};

        this._pendingNotificationsAndIndications = {};
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

    /**
     * Get the instaniceId for this Adapter
     * @return {string} unique id for this Adapter
     */
    get instanceId() {
        return this._instanceId;
    }

    /**
     * Get the state for this Adapter.
     * @return {AdapterState} AdapterState for this Adapter.
     */
    get state() {
        return this._state;
    }

    get notSupportedMessage() {
      return this._notSupportedMessage;
    }

    _generateKeyPair() {
        if (this._keys === null) {
            this._keys = this._security.generateKeyPair();
        }
    }

    computeSharedSecret(peerPublicKey) {
        this._generateKeyPair();

        let publicKey = peerPublicKey;

        if (publicKey === null || publicKey === undefined) {
            publicKey = this._keys;
        }

        return this._security.generateSharedSecret(this._keys.sk, publicKey.pk).ss;
    }

    computePublicKey() {
        this._generateKeyPair();
        return this._security.generatePublicKey(this._keys.sk).pk;
    }

    deleteKeys() {
        this._keys = null;
    }

    _checkAndPropagateError(err, userMessage, callback) {
        if (err) {
            let error = new Error(userMessage, err);
            this.emit('error', error);
            if (callback) { callback(error); }
            return true;
        }

        return false;
    }

    _toHexString(value) {
        if (typeof (value) !== 'number') {
            return '';
        }

        const hexValue = value.toString(16);
        return ('0' + hexValue).slice(-Math.ceil(hexValue.length / 2) * 2).toUpperCase();
    }

    _changeState(changingStates, swallowEmit) {
        let changed = false;

        for (let state in changingStates) {
            const newValue = changingStates[state];
            const previousValue = this._state[state];

            // Use isEqual to compare objects
            if (!_.isEqual(previousValue, newValue)) {
                this._state[state] = newValue;
                changed = true;
            }
        }

        if (swallowEmit) {
            return;
        }

        if (changed) {
            this.emit('stateChanged', this._state);
        }
    }

    _numberTo16BitUuid(uuid16Bit) {
        let byteString = uuid16Bit.toString(16);
        byteString = ('000' + byteString).slice(-4);

        return byteString.toUpperCase();
    }

    _arrayTo128BitUuid(array) {
        let string = '';

        for (let i = array.length - 1; i >= 0; i--) {
            let byteString = array[i].toString(16);
            byteString = ('0' + byteString).slice(-2);
            string += byteString;
        }

        return string.toUpperCase();
    }

    // Callback signature function(err) {}
    open(options, callback) {
        if (this.notSupportedMessage !== undefined) {
            let error = new Error(this.notSupportedMessage);
            this.emit('error', error);
            if (callback) { callback(error); }
            return;
        }

        if (!options) {
            options = {
                baudRate: 115200,
                parity: 'none',
                flowControl: 'none',
                eventInterval: 0,
                logLevel: 'info',
                retransmissionInterval: 100,
                responseTimeout: 750,
                enableBLE: true,
            };
        } else {
            if (!options.baudRate) options.baudRate = 115200;
            if (!options.parity) options.parity = 'none';
            if (!options.flowControl) options.flowControl = 'none';
            if (!options.eventInterval) options.eventInterval = 0;
            if (!options.logLevel) options.logLevel = 'info';
            if (!options.retransmissionInterval) options.retransmissionInterval = 100;
            if (!options.responseTimeout) options.responseTimeout = 750;
            if ((typeof options.enableBLE) == 'undefined') options.enableBLE = true;
        }

        this._changeState({baudRate: options.baudRate, parity: options.parity, flowControl: options.flowControl});

        options.logCallback = this._logCallback.bind(this);
        options.eventCallback = this._eventCallback.bind(this);
        options.statusCallback = this._statusCallback.bind(this);

        this._adapter.open(this._state.port, options, err => {
            if (this._checkAndPropagateError(err, 'Error occurred opening serial port.', callback)) { return; }

            this._changeState({available: true});
            this.emit('opened', this);

            if (options.enableBLE) {
                this.getState((err, state) => {
                    if (this._checkAndPropagateError(err, 'Error retrieving adapter state.', callback)) { return; }
                });
            }

            if (callback) { callback(); }
        });
    }

    /**
     * Close Adapter communication and free resources related to the Adapter. The event listeners added to the Adapter are removed.
     */
    close(callback) {
        this._changeState({available: false});
        this._adapter.close(error => {
            this.emit('closed', this);
            if (callback) callback(error);
        });
    }

    getStats() {
        return this._adapter.getStats();
    }

    enableBLE(options, callback) {
        if (options === undefined || options === null) {
            options = {
                gap_enable_params: {
                    periph_conn_count: 1,
                    central_conn_count: 7,
                    central_sec_count: 1,
                },
                gatts_enable_params: {
                    service_changed: false,
                    attr_tab_size: this._bleDriver.BLE_GATTS_ATTR_TAB_SIZE_DEFAULT,
                },
                common_enable_params: {
                    conn_bw_counts: null, // tell SD to use default
                    vs_uuid_count: 10,
                },
            };
        }

        this._adapter.enableBLE(
            options,
            (err, parameters, app_ram_base) => {
                if (this._checkAndPropagateError(err, 'Enabling BLE failed.', callback)) { return; }

                if (callback) {
                    callback(err, parameters, app_ram_base);
                }
        });
    }

    _statusCallback(status) {
        switch (status.id) {
            case this._bleDriver.RESET_PERFORMED:
                this._init();
                this._changeState(
                    {
                        available: false,
                        connecting: false,
                        scanning: false,
                        advertising: false,
                    }
                );
                break;
            case this._bleDriver.CONNECTION_ACTIVE:
                this._changeState(
                    {
                        available: true,
                    }
                );
                break;
        }

        this.emit('status', status);
    }

    _logCallback(severity, message) {
        this.emit('logMessage', severity, message);
    }

    _eventCallback(eventArray) {
        eventArray.forEach(event => {
            const text = new ToText(event);
            // TODO: set the correct level for different types of events:
            this.emit('logMessage', logLevel.DEBUG, text.toString());

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
                case this._bleDriver.BLE_GAP_EVT_SEC_REQUEST:
                    this._parseGapSecurityRequestEvent(event);
                    break;
                case this._bleDriver.BLE_GAP_EVT_SEC_PARAMS_REQUEST:
                    this._parseSecParamsRequestEvent(event);
                    break;
                case this._bleDriver.BLE_GAP_EVT_CONN_SEC_UPDATE:
                    this._parseConnSecUpdateEvent(event);
                    break;
                case this._bleDriver.BLE_GAP_EVT_AUTH_STATUS:
                    this._parseAuthStatusEvent(event);
                    break;
                case this._bleDriver.BLE_GAP_EVT_PASSKEY_DISPLAY:
                    this._parsePasskeyDisplayEvent(event);
                    break;
                case this._bleDriver.BLE_GAP_EVT_AUTH_KEY_REQUEST:
                    this._parseAuthKeyRequest(event);
                    break;
                case this._bleDriver.BLE_GAP_EVT_KEY_PRESSED:
                    this._parseGapKeyPressedEvent(event);
                    break;
                case this._bleDriver.BLE_GAP_EVT_LESC_DHKEY_REQUEST:
                    this._parseLescDhkeyRequest(event);
                    break;
                case this._bleDriver.BLE_GAP_EVT_SEC_INFO_REQUEST:
                    this._parseSecInfoRequest(event);
                    break;
                case this._bleDriver.BLE_GAP_EVT_TIMEOUT:
                    this._parseGapTimeoutEvent(event);
                    break;
                case this._bleDriver.BLE_GAP_EVT_RSSI_CHANGED:
                    this._parseGapRssiChangedEvent(event);
                    break;
                case this._bleDriver.BLE_GAP_EVT_ADV_REPORT:
                    this._parseGapAdvertismentReportEvent(event);
                    break;
                case this._bleDriver.BLE_GAP_EVT_CONN_PARAM_UPDATE_REQUEST:
                    this._parseGapConnectionParameterUpdateRequestEvent(event);
                    break;
                case this._bleDriver.BLE_GAP_EVT_SCAN_REQ_REPORT:
                    // Not needed. Received when a scan request is received.
                    break;
                case this._bleDriver.BLE_GATTC_EVT_PRIM_SRVC_DISC_RSP:
                    this._parseGattcPrimaryServiceDiscoveryResponseEvent(event);
                    break;
                case this._bleDriver.BLE_GATTC_EVT_REL_DISC_RSP:
                    // Not needed. Used for included services discovery.
                    break;
                case this._bleDriver.BLE_GATTC_EVT_CHAR_DISC_RSP:
                    this._parseGattcCharacteristicDiscoveryResponseEvent(event);
                    break;
                case this._bleDriver.BLE_GATTC_EVT_DESC_DISC_RSP:
                    this._parseGattcDescriptorDiscoveryResponseEvent(event);
                    break;
                case this._bleDriver.BLE_GATTC_EVT_CHAR_VAL_BY_UUID_READ_RSP:
                    // Not needed, service discovery is not using the related function.
                    break;
                case this._bleDriver.BLE_GATTC_EVT_READ_RSP:
                    this._parseGattcReadResponseEvent(event);
                    break;
                case this._bleDriver.BLE_GATTC_EVT_CHAR_VALS_READ_RSP:
                    // Not needed, characteristic discovery is not using the related function.
                    break;
                case this._bleDriver.BLE_GATTC_EVT_WRITE_RSP:
                    this._parseGattcWriteResponseEvent(event);
                    break;
                case this._bleDriver.BLE_GATTC_EVT_HVX:
                    this._parseGattcHvxEvent(event);
                    break;
                case this._bleDriver.BLE_GATTC_EVT_TIMEOUT:
                    this._parseGattTimeoutEvent(event);
                    break;
                case this._bleDriver.BLE_GATTS_EVT_WRITE:
                    this._parseGattsWriteEvent(event);
                    break;
                case this._bleDriver.BLE_GATTS_EVT_RW_AUTHORIZE_REQUEST:
                    this._parseGattsRWAutorizeRequestEvent(event);
                    break;
                case this._bleDriver.BLE_GATTS_EVT_SYS_ATTR_MISSING:
                    this._parseGattsSysAttrMissingEvent(event);
                    break;
                case this._bleDriver.BLE_GATTS_EVT_HVC:
                    this._parseGattsHvcEvent(event);
                    break;
                case this._bleDriver.BLE_GATTS_EVT_SC_CONFIRM:
                    // Not needed, service changed is not supported currently.
                    break;
                case this._bleDriver.BLE_GATTS_EVT_TIMEOUT:
                    this._parseGattTimeoutEvent(event);
                    break;
                case this._bleDriver.BLE_EVT_USER_MEM_REQUEST:
                    this._parseMemoryRequest(event);
                    break;
                case this._bleDriver.BLE_EVT_TX_COMPLETE:
                    // No need to handle tx_complete, for now.
                    break;
                default:
                    this.emit('logMessage', logLevel.INFO, `Unsupported event received from SoftDevice: ${event.id} - ${event.name}`);
                    break;
            }
        });
    }

    _parseConnectedEvent(event) {
        // TODO: Update device with connection handle
        // TODO: Should 'deviceConnected' event emit the updated device?
        const deviceAddress = event.peer_addr;
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

        this._changeState({connecting: false});

        if (deviceRole === 'central') {
            this._changeState({advertising: false});
        }

        this.emit('deviceConnected', device);

        this._addDeviceToAllPerConnectionValues(device.instanceId);

        if (deviceRole === 'peripheral') {
            const callback = this._gapOperationsMap.connecting.callback;
            delete this._gapOperationsMap.connecting;
            if (callback) { callback(undefined, device); }
        }
    }

    _parseDisconnectedEvent(event) {
        const device = this._getDeviceByConnectionHandle(event.conn_handle);
        if (!device) {
            const errorObject = _makeError('Disconnect failed', 'Internal inconsistency: Could not find device with connection handle ' + event.conn_handle);

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
            if (callback) { callback(undefined, device); }
        }

        if (this._gattOperationsMap[device.instanceId]) {
            const callback = this._gattOperationsMap[device.instanceId].callback;
            delete this._gattOperationsMap[device.instanceId];

            if (callback) {
                callback(_makeError('Device disconnected', 'Device with address ' + device.address + ' disconnected'));
            }
        }

        delete this._devices[device.instanceId];
        this.emit('deviceDisconnected', device);

        this._clearDeviceFromAllPerConnectionValues(device.instanceId);
        this._clearDeviceFromDiscoveredServices(device.instanceId);
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
            if (callback) { callback(undefined, device); }
        }

        this.emit('connParamUpdate', device);
    }

    _parseSecParamsRequestEvent(event) {
        const device = this._getDeviceByConnectionHandle(event.conn_handle);

        this.emit('secParamsRequest', device, event.peer_params);
    }

    _parseConnSecUpdateEvent(event) {
        const device = this._getDeviceByConnectionHandle(event.conn_handle);
        this.emit('connSecUpdate', device, event.conn_sec);

        const authParamters = {
            securityMode: event.conn_sec.sec_mode.sm,
            securityLevel: event.conn_sec.sec_mode.lv,
        };

        this.emit('securityChanged', device, authParamters);
    }

    _parseAuthStatusEvent(event) {
        const device = this._getDeviceByConnectionHandle(event.conn_handle);
        device.ownPeriphInitiatedPairingPending = false;

        this.emit('authStatus',
            device,
            {
                auth_status: event.auth_status,
                auth_status_name: event.auth_status_name,
                error_src: event.error_src,
                error_src_name: event.error_src_name,
                bonded: event.bonded,
                sm1_levels: event.sm1_levels,
                sm2_levels: event.sm2_levels,
                kdist_own: event.kdist_own,
                kdist_peer: event.kdist_peer,
                keyset: event.keyset,
            }
        );
    }

    _parsePasskeyDisplayEvent(event) {
        const device = this._getDeviceByConnectionHandle(event.conn_handle);
        this.emit('passkeyDisplay', device, event.match_request, event.passkey);
    }

    _parseAuthKeyRequest(event) {
        const device = this._getDeviceByConnectionHandle(event.conn_handle);
        this.emit('authKeyRequest', device, event.key_type);
    }

    _parseGapKeyPressedEvent(event) {
        const device = this._getDeviceByConnectionHandle(event.conn_handle);
        this.emit('keyPressed', device, event.kp_not);
    }

    _parseLescDhkeyRequest(event) {
        const device = this._getDeviceByConnectionHandle(event.conn_handle);

        this.emit('lescDhkeyRequest', device, event.pk_peer, event.oobd_req);
    }

    _parseSecInfoRequest(event) {
        const device = this._getDeviceByConnectionHandle(event.conn_handle);

        this.emit('secInfoRequest', device, event);
    }

    _parseGapSecurityRequestEvent(event) {
        const device = this._getDeviceByConnectionHandle(event.conn_handle);

        this.emit('securityRequest', device, event);
    }

    _parseGapConnectionParameterUpdateRequestEvent(event) {
        const device = this._getDeviceByConnectionHandle(event.conn_handle);

        const connectionParameters = {
            minConnectionInterval: event.conn_params.min_conn_interval,
            maxConnectionInterval: event.conn_params.max_conn_interval,
            slaveLatency: event.conn_params.slave_latency,
            connectionSupervisionTimeout: event.conn_params.conn_sup_timeout,
        };

        this.emit('connParamUpdateRequest', device, connectionParameters);
    }

    _parseGapAdvertismentReportEvent(event) {
        const address = event.peer_addr;
        const discoveredDevice = new Device(address, 'peripheral');
        discoveredDevice.processEventData(event);
        this.emit('deviceDiscovered', discoveredDevice);
    }

    _parseGapTimeoutEvent(event) {
        switch (event.src) {
            case this._bleDriver.BLE_GAP_TIMEOUT_SRC_ADVERTISING:
                this._changeState({advertising: false});
                this.emit('advertiseTimedOut');
                break;
            case this._bleDriver.BLE_GAP_TIMEOUT_SRC_SCAN:
                this._changeState({scanning: false});
                this.emit('scanTimedOut');
                break;
            case this._bleDriver.BLE_GAP_TIMEOUT_SRC_CONN:
                const deviceAddress = this._gapOperationsMap.connecting.deviceAddress;
                delete this._gapOperationsMap.connecting;
                this._changeState({connecting: false});
                this.emit('connectTimedOut', deviceAddress);
                break;
            case this._bleDriver.BLE_GAP_TIMEOUT_SRC_SECURITY_REQUEST:
                const device = this._getDeviceByConnectionHandle(event.conn_handle);
                this.emit('securityRequestTimedOut', device);
                this.emit('error', _makeError('Security request timed out.'));
                break;
            default:
                console.log(`GAP operation timed out: ${event.src_name} (${event.src}).`);
        }
    }

    _parseGapRssiChangedEvent(event) {
        const device = this._getDeviceByConnectionHandle(event.conn_handle);
        device.rssi = event.rssi;

        // TODO: How do we notify the application of a changed rssi?
        //emit('rssiChanged', device);
    }

    _parseGattcPrimaryServiceDiscoveryResponseEvent(event) {
        const device = this._getDeviceByConnectionHandle(event.conn_handle);
        const services = event.services;
        const gattOperation = this._gattOperationsMap[device.instanceId];

        const finishServiceDiscovery = () => {
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
                    const handleAsNumber = parseInt(handle, 10);
                    this._adapter.gattcRead(device.connectionHandle, handleAsNumber, 0, err => {
                        if (err) {
                            this.emit('error', err);
                            // Call getServices callback??
                        }
                    });
                    break;
                }
            }
        };

        if (event.count === 0) {
            finishServiceDiscovery();
            return;
        }

        services.forEach(service => {
            const handle = service.handle_range.start_handle;
            let uuid = this._numberTo16BitUuid(service.uuid.uuid);

            if (service.uuid.type >= this._bleDriver.BLE_UUID_TYPE_VENDOR_BEGIN) {
                uuid = this._converter.lookupVsUuid(service.uuid);
            } else if (service.uuid.type === this._bleDriver.BLE_UUID_TYPE_UNKNOWN) {
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

        if (nextStartHandle > 0xFFFF)
        {
            finishServiceDiscovery();
            return;
        }

        this._adapter.gattcDiscoverPrimaryServices(device.connectionHandle, nextStartHandle, null, err => {
            if (err) {
                this.emit('error', 'Failed to get services');
            }
        });
    }

    _parseGattcCharacteristicDiscoveryResponseEvent(event) {
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
                    this._adapter.gattcRead(device.connectionHandle, handleAsNumber, 0, err => {
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



            if (characteristic.uuid.type >= this._bleDriver.BLE_UUID_TYPE_VENDOR_BEGIN) {
                uuid = this._converter.lookupVsUuid(characteristic.uuid);
            } else if (characteristic.uuid.type === this._bleDriver.BLE_UUID_TYPE_UNKNOWN) {
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

        this._adapter.gattcDiscoverCharacteristics(device.connectionHandle, handleRange, err => {
            if (err) {
                this.emit('error', 'Failed to get Characteristics');

                // Call getCharacteristics callback??
            }
        });
    }

    _parseGattcDescriptorDiscoveryResponseEvent(event) {
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
                    this._adapter.gattcRead(device.connectionHandle, handleAsNumber, 0, err => {
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
        let foundNextServiceOrCharacteristic = false;

        descriptors.forEach(descriptor => {
            if (foundNextServiceOrCharacteristic) {
                return;
            }

            const handle = descriptor.handle;
            let uuid = this._numberTo16BitUuid(descriptor.uuid.uuid);

            if (descriptor.uuid.type >= this._bleDriver.BLE_UUID_TYPE_VENDOR_BEGIN) {
                uuid = this._converter.lookupVsUuid(descriptor.uuid);
            } else if (descriptor.uuid.type === this._bleDriver.BLE_UUID_TYPE_UNKNOWN) {
                uuid = 'Unknown 128 bit descriptor uuid ';
            }

            // TODO: Fix magic number? Primary Service and Characteristic Declaration uuids
            if (uuid === "2800" || uuid === "2803") {
                // Found a service or characteristic declaration
                foundNextServiceOrCharacteristic = true;
                return;
            }

            const newDescriptor = new Descriptor(characteristic.instanceId, uuid, null);
            newDescriptor.handle = handle;
            this._descriptors[newDescriptor.instanceId] = newDescriptor;

            // TODO: We cannot read descriptor 128bit uuid.

            gattOperation.pendingHandleReads[handle] = newDescriptor;
        });

        if (foundNextServiceOrCharacteristic) {
            finishDescriptorDiscovery();
            return;
        }

        const service = this._services[gattOperation.parent.serviceInstanceId];
        const nextStartHandle = descriptors[descriptors.length - 1].handle + 1;

        if (service.endHandle < nextStartHandle) {
            finishDescriptorDiscovery();
            return;
        }

        const handleRange = {start_handle: nextStartHandle, end_handle: service.endHandle};

        this._adapter.gattcDiscoverDescriptors(device.connectionHandle, handleRange, err => {
            if (err) {
                this.emit('error', 'Failed to get Descriptors');

                // Call getDescriptors callback?
            }
        });
    }

    _parseGattcReadResponseEvent(event) {
        const device = this._getDeviceByConnectionHandle(event.conn_handle);
        const handle = event.handle;
        const data = event.data;
        const gattOperation = this._gattOperationsMap[device.instanceId];
        /*
        event.offset;
        event.len;
        */

        if (gattOperation && gattOperation.pendingHandleReads && !_.isEmpty(gattOperation.pendingHandleReads)) {
            const pendingHandleReads = gattOperation.pendingHandleReads;
            const attribute = pendingHandleReads[handle];

            const addVsUuidToDriver = uuid => {
                return new Promise((resolve, reject) => {
                    this._converter.uuidToDriver(uuid, (err, uuid) => {
                        if (err) {
                            reject(err);
                            return;
                        }

                        resolve();
                    });
                });
            };

            if (!attribute) {
                console.log('something went wrong in bookkeeping of pending reads');
                return;
            }

            delete pendingHandleReads[handle];

            if (attribute instanceof Service) {
                // TODO: Translate from uuid to name?
                attribute.uuid = this._arrayTo128BitUuid(data);
                addVsUuidToDriver(attribute.uuid).then();
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
                    attribute.uuid = this._arrayTo128BitUuid(data.slice(3));
                    addVsUuidToDriver(attribute.uuid).then();
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
                this._adapter.gattcRead(device.connectionHandle, newReadHandleAsNumber, 0, err => {
                    if (err) {
                        this.emit('error', err);

                        // Call getAttributecallback callback??
                    }
                });
                break;
            }
        } else {
            if (event.gatt_status !== this._bleDriver.BLE_GATT_STATUS_SUCCESS) {
                delete this._gattOperationsMap[device.instanceId];
                gattOperation.callback(_makeError(`Read operation failed: ${event.gatt_status_name} (0x${this._toHexString(event.gatt_status)})`));
                return;
            }

            gattOperation.readBytes = gattOperation.readBytes ? gattOperation.readBytes.concat(event.data): event.data;

            if (event.data.length < this._maxReadPayloadSize) {
                delete this._gattOperationsMap[device.instanceId];
                gattOperation.callback(undefined, gattOperation.readBytes);
            } else if (event.data.length === this._maxReadPayloadSize) {
                // We need to read more:
                this._adapter.gattcRead(event.conn_handle, event.handle, gattOperation.readBytes.length, err => {
                    if (err) {
                        delete this._gattOperationsMap[device.instanceId];
                        this.emit('error', _makeError('Read value failed', err));
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

    _parseGattcWriteResponseEvent(event) {
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
            gattOperation.callback(_makeError('Failed to handle write event, no device with connection handle ' + event.conn_handle + 'found'));
            return;
        }

        if (event.write_op === this._bleDriver.BLE_GATT_OP_WRITE_CMD) {
            gattOperation.attribute.value = gattOperation.value;
        } else if (event.write_op === this._bleDriver.BLE_GATT_OP_PREP_WRITE_REQ) {

            const writeParameters = {
                write_op: 0,
                flags: 0,
                handle: handle,
                offset: 0,
                len: 0,
                value: [],
            };

            if (gattOperation.bytesWritten < gattOperation.value.length) {
                const value = gattOperation.value.slice(gattOperation.bytesWritten, gattOperation.bytesWritten + this._maxLongWritePayloadSize);

                writeParameters.write_op = this._bleDriver.BLE_GATT_OP_PREP_WRITE_REQ;
                writeParameters.handle = handle;
                writeParameters.offset = gattOperation.bytesWritten;
                writeParameters.len = value.length;
                writeParameters.value = value;
                gattOperation.bytesWritten += value.length;

                this._adapter.gattcWrite(device.connectionHandle, writeParameters, err => {

                    if (err) {
                        console.log('some error');
                        this._longWriteCancel(device, gattOperation.attribute);
                        this.emit('error', _makeError('Failed to write value to device/handle ' + device.instanceId + '/' + handle, err));
                        return;
                    }
                });
            } else {
                writeParameters.write_op = this._bleDriver.BLE_GATT_OP_EXEC_WRITE_REQ;
                writeParameters.flags = this._bleDriver.BLE_GATT_EXEC_WRITE_FLAG_PREPARED_WRITE;

                this._adapter.gattcWrite(device.connectionHandle, writeParameters, err => {

                    if (err) {
                        this._longWriteCancel(device, gattOperation.attribute);
                        this.emit('error', _makeError('Failed to write value to device/handle ' + device.instanceId + '/' + handle, err));
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
            if (event.gatt_status !== this._bleDriver.BLE_GATT_STATUS_SUCCESS) {
                gattOperation.callback(_makeError(`Write operation failed: ${event.gatt_status_name} (0x${this._toHexString(event.gatt_status)})`));
                return;
            }
        }

        this._emitAttributeValueChanged(gattOperation.attribute);

        gattOperation.callback(undefined, gattOperation.attribute);
    }

    _getServiceByHandle(deviceInstanceId, handle) {
        let foundService = null;

        for (let serviceInstanceId in this._services) {
            const service = this._services[serviceInstanceId];

            if (!_.isEqual(service.deviceInstanceId, deviceInstanceId)) {
                continue;
            }

            if (service.startHandle <= handle && (!foundService || foundService.startHandle <= service.startHandle)) {
                foundService = service;
            }
        }

        return foundService;
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

    _getCharacteristicByValueHandle(devinceInstanceId, valueHandle) {
        return _.find(this._characteristics, characteristic => this._services[characteristic.serviceInstanceId].deviceInstanceId === devinceInstanceId && characteristic.valueHandle === valueHandle);
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

    _parseGattcHvxEvent(event) {
        if (event.type === this._bleDriver.BLE_GATT_HVX_INDICATION) {
            this._adapter.gattcConfirmHandleValue(event.conn_handle, event.handle, error => {
                if (error) {
                    this.emit('error', _makeError('Failed to call gattcConfirmHandleValue', error));
                }
            });
        }

        const device = this._getDeviceByConnectionHandle(event.conn_handle);
        const characteristic = this._getCharacteristicByValueHandle(device.instanceId, event.handle);
        if (!characteristic) {
            this.emit('error', _makeError('Cannot handle HVX event', 'No characteristic has a value descriptor with handle: ' + event.handle));
            return;
        }

        characteristic.value = event.data;
        this.emit('characteristicValueChanged', characteristic);
    }

    _parseGattTimeoutEvent(event) {
        const device = this._getDeviceByConnectionHandle(event.conn_handle);
        const gattOperation = this._gattOperationsMap[device.instanceId];
        const error = _makeError('Received a Gatt timeout');
        this.emit('error', error);

        if (gattOperation) {
            if (gattOperation.callback) {
                gattOperation.callback(error);
            }

            delete this._gattOperationsMap[device.instanceId];
        }
    }

    _parseGattsWriteEvent(event) {
        // TODO: BLE_GATTS_OP_SIGN_WRITE_CMD not supported?
        // TODO: Support auth_required flag
        const device = this._getDeviceByConnectionHandle(event.conn_handle);
        const attribute = this._getAttributeByHandle('local.server', event.handle);

        if (event.op === this._bleDriver.BLE_GATTS_OP_WRITE_REQ ||
            event.op === this._bleDriver.BLE_GATTS_OP_WRITE_CMD) {
            if (this._instanceIdIsOnLocalDevice(attribute.instanceId) && this._isCCCDDescriptor(attribute.instanceId)) {
                this._setDescriptorValue(attribute, event.data, device.instanceId);
                this._emitAttributeValueChanged(attribute);
            } else {
                this._setAttributeValueWithOffset(attribute, event.data, event.offset);
                this._emitAttributeValueChanged(attribute);
            }
        }
    }

    _parseGattsRWAutorizeRequestEvent(event) {
        const device = this._getDeviceByConnectionHandle(event.conn_handle);
        let promiseChain = new Promise(resolve => resolve());
        let authorizeReplyParams;

        const createWritePromise = (handle, data, offset) => {
            return new Promise((resolve, reject) => {
                const attribute = this._getAttributeByHandle('local.server', handle);
                this._writeLocalValue(attribute, data, offset, error => {
                    if (error) {
                        this.emit('error', _makeError('Failed to set local attribute value from rwAuthorizeRequest', error));
                        reject(_makeError('Failed to set local attribute value from rwAuthorizeRequest', error));
                    } else {
                        this._emitAttributeValueChanged(attribute);
                        resolve();
                    }
                });
            });
        };

        if (event.type === this._bleDriver.BLE_GATTS_AUTHORIZE_TYPE_WRITE) {
            if (event.write.op === this._bleDriver.BLE_GATTS_OP_WRITE_REQ) {
                promiseChain = promiseChain.then(() => {
                    createWritePromise(event.write.handle, event.write.data, event.write.offset);
                });

                authorizeReplyParams = {
                    type: event.type,
                    write: {
                        gatt_status: this._bleDriver.BLE_GATT_STATUS_SUCCESS,
                        update: 1,
                        offset: event.write.offset,
                        len: event.write.len,
                        data: event.write.data,
                    },
                };
            } else if (event.write.op === this._bleDriver.BLE_GATTS_OP_PREP_WRITE_REQ) {
                if (!this._preparedWritesMap[device.instanceId]) {
                    this._preparedWritesMap[device.instanceId] = [];
                }

                let preparedWrites = this._preparedWritesMap[device.instanceId];
                preparedWrites = preparedWrites.concat({ handle: event.write.handle, value: event.write.data, offset: event.write.offset });

                this._preparedWritesMap[device.instanceId] = preparedWrites;

                authorizeReplyParams = {
                    type: event.type,
                    write: {
                        gatt_status: this._bleDriver.BLE_GATT_STATUS_SUCCESS,
                        update: 1,
                        offset: event.write.offset,
                        len: event.write.len,
                        data: event.write.data,
                    },
                };

            } else if (event.write.op === this._bleDriver.BLE_GATTS_OP_EXEC_WRITE_REQ_CANCEL) {
                delete this._preparedWritesMap[device.instanceId];

                authorizeReplyParams = {
                    type: event.type,
                    write: {
                        gatt_status: this._bleDriver.BLE_GATT_STATUS_SUCCESS,
                        update: 0,
                        offset: 0,
                        len: 0,
                        data: [],
                    },
                };
            } else if (event.write.op === this._bleDriver.BLE_GATTS_OP_EXEC_WRITE_REQ_NOW) {
                for (let preparedWrite of this._preparedWritesMap[device.instanceId]) {
                    promiseChain = promiseChain.then(() => {
                        createWritePromise(preparedWrite.handle, preparedWrite.value, preparedWrite.offset);
                    });
                }

                delete this._preparedWritesMap[device.instanceId];

                authorizeReplyParams = {
                    type: event.type,
                    write: {
                        gatt_status: this._bleDriver.BLE_GATT_STATUS_SUCCESS,
                        update: 0,
                        offset: 0,
                        len: 0,
                        data: [],
                    },
                };
            }
        } else if (event.type === this._bleDriver.BLE_GATTS_AUTHORIZE_TYPE_READ) {
            authorizeReplyParams = {
                type: event.type,
                read: {
                    gatt_status: this._bleDriver.BLE_GATT_STATUS_SUCCESS,
                    update: 0, // 0 = Don't provide data here, read from server.
                    offset: 0,
                    len: 0,
                    data: [],
                },
            };
        }

        promiseChain.then(() => {
            this._adapter.gattsReplyReadWriteAuthorize(event.conn_handle, authorizeReplyParams, error => {
                if (error) {
                    this.emit('error', _makeError('Failed to call gattsReplyReadWriteAuthorize', error));
                }
            });
        });
    }

    _parseGattsSysAttrMissingEvent(event) {
        this._adapter.gattsSystemAttributeSet(event.conn_handle, null, 0, 0, error => {
            if (error) {
                this.emit('error', _makeError('Failed to call gattsSystemAttributeSet', error));
            }
        });
    }

    _parseGattsHvcEvent(event) {
        const remoteDevice = this._getDeviceByConnectionHandle(event.conn_handle);
        const characteristic = this._getCharacteristicByHandle('local.server', event.handle);

        if (this._pendingNotificationsAndIndications.deviceNotifiedOrIndicated) {
            this._pendingNotificationsAndIndications.deviceNotifiedOrIndicated(remoteDevice, characteristic);
        }

        this.emit('deviceNotifiedOrIndicated', remoteDevice, characteristic);

        this._pendingNotificationsAndIndications.remainingIndicationConfirmations--;
        if (this._sendingNotificationsAndIndicationsComplete()) {
            this._pendingNotificationsAndIndications.completeCallback(undefined, characteristic);
            this._pendingNotificationsAndIndications = {};
        }
    }

    _parseMemoryRequest(event) {
        if (event.type === this._bleDriver.BLE_USER_MEM_TYPE_GATTS_QUEUED_WRITES) {
            this._adapter.replyUserMemory(event.conn_handle, null, error => {
                if (error) {
                    this.emit('error', _makeError('Failed to call replyUserMemory', error));
                }
            });
        }
    }

    _setAttributeValueWithOffset(attribute, value, offset) {
        attribute.value = attribute.value.slice(0, offset).concat(value);
    }

    // Callback signature function(err, state) {}
    getState(callback) {
        const changedStates = {};

        this._adapter.getVersion((version, err) => {
            if (this._checkAndPropagateError(
                err,
                'Failed to retrieve softdevice firmwareVersion.',
                callback)) return;

            changedStates.firmwareVersion = version;

            this._adapter.gapGetDeviceName((name, err) => {
                if (this._checkAndPropagateError(
                    err,
                    'Failed to retrieve driver version.',
                    callback)) return;

                changedStates.name = name;

                this._adapter.gapGetAddress((address, err) => {
                    if (this._checkAndPropagateError(
                        err,
                        'Failed to retrieve device address.',
                        callback)) return;

                    changedStates.address = address;
                    changedStates.available = true;

                    this._changeState(changedStates);
                    if (callback) { callback(undefined, this._state); }
                });
            });
        });
    }

    // Set GAP related information
    setName(name, callback) {
        let _name = name.split();
        this._adapter.gapSetDeviceName({sm: 0, lv: 0}, _name, err => {
            if (err) {
                this.emit('error', _makeError('Failed to set name to adapter', err));
            } else if (this._state.name !== name) {
                this._state.name = name;
                this._changeState({name: name});
            }

            if (callback) { callback(err); }
        });
    }

    _getAddressStruct(address, type) {
        return {address: address, type: type};
    }

    setAddress(address, type, callback) {
        // TODO: if privacy is active use this._bleDriver.BLE_GAP_ADDR_CYCLE_MODE_AUTO?
        const cycleMode = this._bleDriver.BLE_GAP_ADDR_CYCLE_MODE_NONE;

        const addressStruct = this._getAddressStruct(address, type);

        this._adapter.gapSetAddress(cycleMode, addressStruct, err => {
            if (err) {
                this.emit('error', _makeError('Failed to set address', err));
            } else if (this._state.address !== address) {
                this._changeState({address: address});
            }

            if (callback) { callback(err); }
        });
    }

    _setDeviceName(deviceName, security, callback) {
        const convertedSecurity = Converter.securityModeToDriver(security);

        this._adapter.gapSetDeviceName(convertedSecurity, deviceName, err => {
            if (err) {
                this.emit('error', _makeError('Failed to set device name', err));
            }

            if (callback) { callback(err); }
        });
    }

    _setDeviceNameFromArray(valueArray, writePerm, callback) {
        const nameArray = valueArray.concat(0);
        this._setDeviceName(nameArray, writePerm, callback);
    }

    _setAppearance(appearance, callback) {
        this._adapter.gapSetAppearance(appearance, err => {
            if (err) {
                this.emit('error', _makeError('Failed to set appearance', err));
            }

            if (callback) { callback(err); }
        });
    }

    _setAppearanceFromArray(valueArray, callback) {
        const appearanceValue = valueArray[0] + (valueArray[1] << 8);
        this._setAppearance(appearanceValue, callback);
    }

    _setPPCP(ppcp, callback) {
        this._adapter.gapSetPPCP(ppcp, err => {
            if (err) {
                this.emit('error', _makeError('Failed to set PPCP', err));
            }

            if (callback) { callback(err); }
        });
    }

    _setPPCPFromArray(valueArray, callback) {
        // TODO: Fix addon parameter check to also accept arrays? Atleast avoid converting twice
        const ppcpParameter = {
            min_conn_interval: (valueArray[0] + (valueArray[1] << 8)) * (1250 / 1000),
            max_conn_interval: (valueArray[2] + (valueArray[3] << 8)) * (1250 / 1000),
            slave_latency: (valueArray[4] + (valueArray[5] << 8)),
            conn_sup_timeout: (valueArray[6] + (valueArray[7] << 8)) * (10000 / 1000),
        };

        this._setPPCP(ppcpParameter, callback);
    }

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
        this._adapter.gapStartScan(options, err => {
            if (err) {
                this.emit('error', _makeError('Error occured when starting scan', err));
            } else {
                this._changeState({scanning: true});
            }

            if (callback) { callback(err); }
        });
    }

    // Callback signature function(err)
    stopScan(callback) {
        this._adapter.gapStopScan(err => {
            if (err) {
                // TODO: probably is state already set to false, but should we make sure? if yes, emit stateChanged?
                this.emit('error', _makeError('Error occured when stopping scanning', err));
            } else {
                this._changeState({scanning: false});
            }

            if (callback) { callback(err); }
        });
    }

    // options: scanParams, connParams, Callback signature function(err) {}. Do not start service discovery. Err if connection timed out, +++
    connect(deviceAddress, options, callback) {
        if (!_.isEmpty(this._gapOperationsMap)) {
            const errorObject = _makeError('Could not connect. Another connect is in progress.');
            this.emit('error', errorObject);
            if (callback) { callback(errorObject); }
        }

        var address = {};

        if (typeof deviceAddress === 'string') {
            address.address = deviceAddress;
            address.type = 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC';
        } else {
            address = deviceAddress;
        }

        this._changeState({scanning: false, connecting: true});

        this._adapter.gapConnect(address, options.scanParams, options.connParams, err => {
            if (err) {
                this._changeState({connecting: false});
                const errorMsg = (err.errcode === 'NRF_ERROR_CONN_COUNT') ?
                    _makeError(`Could not connect. Max number of connections reached.`, err)
                    : _makeError(`Could not connect to ${deviceAddress.address}`, err);

                this.emit('error', errorMsg);
                if (callback) { callback(errorMsg); }
            } else {
                this._gapOperationsMap.connecting = {deviceAddress: address, callback: callback};
            }
        });
    }

    /**
     * Cancel connection currently in progress.
     */
    cancelConnect(callback) {
        this._adapter.gapCancelConnect(err => {
            if (err) {
                // TODO: log more
                const newError = _makeError('Error occured when canceling connection', err);
                this.emit('error', newError);
                if (callback) { callback(newError); }
            } else {
                delete this._gapOperationsMap.connecting;
                this._changeState({connecting: false});
                if (callback) { callback(undefined); }
            }
        });
    }

    // Enable the client role and starts advertising

    _getAdvertisementParams(params) {
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

    // Callback function signature: function(err) {}
    startAdvertising(options, callback) {
        const advParams = this._getAdvertisementParams(options);

        this._adapter.gapStartAdvertising(advParams, err => {
            if (this._checkAndPropagateError(err, 'Failed to start advertising.', callback)) return;
            this._changeState({advertising: true});
            if (callback) { callback(); }
        });
    }

    /**
     * Set the advertising data for this adapter. Callback function(err).
     */
    setAdvertisingData(advData, scanRespData, callback) {
        const advDataStruct = Array.from(AdType.convertToBuffer(advData));
        const scanRespDataStruct = Array.from(AdType.convertToBuffer(scanRespData));

        this._adapter.gapSetAdvertisingData(
            advDataStruct,
            scanRespDataStruct,
            err => {
                if (this._checkAndPropagateError(err, 'Failed to set advertising data.', callback)) return;
                if (callback) { callback(); }
            }
        );
    }

    // Callback function signature: function(err) {}
    stopAdvertising(callback) {
        this._adapter.gapStopAdvertising(err => {
            if (this._checkAndPropagateError(err, 'Failed to stop advertising.', callback)) return;
            this._changeState({advertising: false});
            if (callback) { callback(); }
        });
    }

    // Central/peripheral

    disconnect(deviceInstanceId, callback) {
        const device = this.getDevice(deviceInstanceId);
        if (!device) {
            const errorObject = _makeError('Failed to disconnect', 'Failed to find device with id ' + deviceInstanceId);
            this.emit('error', errorObject);
            if (callback) { callback(errorObject); }
            return;

        }

        const hciStatusCode = this._bleDriver.BLE_HCI_REMOTE_USER_TERMINATED_CONNECTION;
        this._adapter.gapDisconnect(device.connectionHandle, hciStatusCode, err => {
            if (err) {
                const errorObject = _makeError('Failed to disconnect', err);
                this.emit('error', errorObject);
                if (callback) { callback(errorObject); }
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
        this._adapter.gapUpdateConnectionParameters(device.connectionHandle, connectionParamsStruct, err => {
            if (err) {
                const errorObject = _makeError('Failed to update connection parameters', err);
                this.emit('error', errorObject);
                if (callback) { callback(errorObject); }
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
        this._adapter.gapUpdateConnectionParameters(connectionHandle, null, err => {
            if (err) {
                this.emit('error', _makeError('Failed to reject connection parameters', err));
            }

            if (callback) { callback(err); }
        });
    }

    authenticate(deviceInstanceId, secParams, callback) {
        const device = this.getDevice(deviceInstanceId);

        if (!device) {
            const errorObject = _makeError('Failed to authenticate', 'Failed to find device with id ' + deviceInstanceId);
            this.emit('error', errorObject);
            if (callback) { callback(errorObject); }
            return;

        }

        if (device.role === 'central') {
            device.ownPeriphInitiatedPairingPending = true;
        }

        this._adapter.gapAuthenticate(device.connectionHandle, secParams, err => {
            let errorObject;
            if (err) {
                errorObject = _makeError('Failed to authenticate', err);
                this.emit('error', errorObject);
                if (device.role === 'central') {
                    device.ownPeriphInitiatedPairingPending = false;
                }
            }

            if (callback) { callback(errorObject); }
        });
    }

    replySecParams(deviceInstanceId, secStatus, secParams, secKeyset, callback) {
        const device = this.getDevice(deviceInstanceId);

        if (!device) {
            const errorObject = _makeError('Failed to reply security parameters', 'Failed to find device with id ' + deviceInstanceId);
            this.emit('error', errorObject);
            if (callback) { callback(errorObject); }
            return;
        }

        this._adapter.gapReplySecurityParameters(device.connectionHandle, secStatus, secParams, secKeyset, (err, secKeyset) => {
            if (this._checkAndPropagateError(err, 'Failed to reply security parameters.', callback)) { return; }
            if (callback) { callback(err, secKeyset); }
        });
    }

    replyAuthKey(deviceInstanceId, keyType, key, callback) {
        const device = this.getDevice(deviceInstanceId);

        if (!device) {
            const errorObject = _makeError('Failed to reply authenticate key', 'Failed to find device with id ' + deviceInstanceId);
            this.emit('error', errorObject);
            if (callback) { callback(errorObject); }
            return;
        }

        // If the key is a string we split it into an array before we call gapReplyAuthKey
        if (key && key.constructor === String) {
            key = Array.from(key);
        }

        this._adapter.gapReplyAuthKey(device.connectionHandle, keyType, key, err => {
            if (this._checkAndPropagateError(err, 'Failed to reply authenticate key.', callback)) { return; }
            if (callback) { callback(); }
        });
    }

    replyLescDhkey(deviceInstanceId, dhkey, callback) {
        const device = this.getDevice(deviceInstanceId);

        if (!device) {
            const errorObject = _makeError('Failed to reply lesc dh key', 'Failed to find device with id ' + deviceInstanceId);
            this.emit('error', errorObject);
            if (callback) { callback(errorObject); }
            return;
        }

        this._adapter.gapReplyLescDhKey(device.connectionHandle, dhkey, err => {
            if (this._checkAndPropagateError(err, 'Failed to reply lesc dh key.', callback)) { return; }
            if (callback) { callback(); }
        });
    }

    notifyKeypress(deviceInstanceId, notificationType, callback) {
        const device = this.getDevice(deviceInstanceId);

        if (!device) {
            const errorObject = _makeError('Failed to notify keypress', 'Failed to find device with id ' + deviceInstanceId);
            this.emit('error', errorObject);
            if (callback) { callback(errorObject); }
            return;
        }

        this._adapter.gapNotifyKeypress(device.connectionHandle, notificationType, err => {
            if (this._checkAndPropagateError(err, 'Failed to notify keypress.', callback)) { return; }
            if (callback) { callback(); }
        });
    }

    getLescOobData(deviceInstanceId, ownPublicKey, callback) {
        const device = this.getDevice(deviceInstanceId);

        if (!device) {
            const errorObject = _makeError('Failed to get lesc oob data', 'Failed to find device with id ' + deviceInstanceId);
            this.emit('error', errorObject);
            if (callback) { callback(errorObject); }
            return;
        }

        this._adapter.gapGetLescOobData(device.connectionHandle, ownPublicKey, (err, ownOobData) => {
            let errorObject;
            if (err) {
                errorObject = _makeError('Failed to get lesc oob data');
                this.emit('error', errorObject);
            }

            if (callback) { callback(errorObject, ownOobData); }
        });
    }

    setLescOobData(deviceInstanceId, ownOobData, peerOobData, callback) {
        const device = this.getDevice(deviceInstanceId);

        if (!device) {
            const errorObject = _makeError('Failed to set lesc oob data', 'Failed to find device with id ' + deviceInstanceId);
            this.emit('error', errorObject);
            if (callback) { callback(errorObject); }
            return;
        }

        this._adapter.gapSetLescOobData(device.connectionHandle, ownOobData, peerOobData, err => {
            this._checkAndPropagateError(err, 'Failed to set lesc oob data.', callback);
        });

        if (callback) { callback(); }
    }

    encrypt(deviceInstanceId, masterId, encInfo, callback) {
        const device = this.getDevice(deviceInstanceId);

        if (!device) {
            const errorObject = _makeError('Failed to encrypt', 'Failed to find device with id ' + deviceInstanceId);
            this.emit('error', errorObject);
            if (callback) { callback(errorObject); }
            return;
        }

        this._adapter.gapEncrypt(device.connectionHandle, masterId, encInfo, err => {
            let errorObject;
            if (err) {
                errorObject = _makeError('Failed to encrypt');
                this.emit('error', errorObject);
            }

            if (callback) { callback(errorObject); }
        });
    }

    secInfoReply(deviceInstanceId, encInfo, idInfo, signInfo, callback) {
        const device = this.getDevice(deviceInstanceId);

        if (!device) {
            const errorObject = _makeError('Failed to encrypt', 'Failed to find device with id ' + deviceInstanceId);
            this.emit('error', errorObject);
            if (callback) { callback(errorObject); }
            return;
        }

        this._adapter.gapReplySecurityInfo(device.connectionHandle, encInfo, idInfo, signInfo, err => {
            let errorObject;
            if (err) {
                errorObject = _makeError('Failed to encrypt');
                this.emit('error', errorObject);
            }

            if (callback) { callback(errorObject); }
        });
    }

    // GATTS
    // Array of services
    setServices(services, callback) {
        let decodeUUID = (uuid, data) => {
            return new Promise((resolve, reject) => {
                const length = uuid.length === 32 ? 16 : 2;

                this._adapter.decodeUUID(length, uuid, (err, _uuid) => {
                    if (err) {
                        // If the UUID is not found it is a 128-bit UUID
                        // so we have to add it to the SD and try again
                        if (err.errno === this._bleDriver.NRF_ERROR_NOT_FOUND && length === 16) {
                            this._adapter.addVendorspecificUUID(
                                {uuid128: uuid},
                                (err, type) => {
                                    if (err) {
                                        reject(_makeError(`Unable to add UUID ${uuid} to SoftDevice`, err));
                                    } else {
                                        this._adapter.decodeUUID(length, uuid, (err, _uuid) => {
                                            if (err) {
                                                reject(_makeError(`Unable to decode UUID ${uuid}`, err));
                                            } else {
                                                data.decoded_uuid = _uuid;
                                                resolve(data);
                                            }
                                        });
                                    }
                                }
                            );
                        } else {
                            reject(_makeError(`Unable to decode UUID ${uuid}`, err));
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
                var p = Promise.resolve(data);
                var decode = decodeUUID.bind(undefined, service.uuid);

                p.then(decode).then(data => {
                    this._adapter.gattsAddService(type, data.decoded_uuid, (err, serviceHandle) => {
                        if (err) {
                            reject(_makeError('Error occurred adding service.', err));
                        } else {
                            data.serviceHandle = serviceHandle;
                            service.startHandle = serviceHandle;
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
                this._converter.characteristicToDriver(characteristic, (err, characteristicForDriver) => {
                    if (err) {
                        reject(_makeError('Error converting characteristic to driver.', err));
                    } else {
                        this._adapter.gattsAddCharacteristic(
                            data.serviceHandle,
                            characteristicForDriver.metadata,
                            characteristicForDriver.attribute,
                            (err, handles) => {
                                if (err) {
                                    reject(_makeError('Error occurred adding characteristic.', err));
                                } else {
                                    characteristic.valueHandle = data.characteristicHandle = handles.value_handle;
                                    characteristic.declarationHandle = characteristic.valueHandle - 1; // valueHandle is always directly after declarationHandle
                                    this._characteristics[characteristic.instanceId] = characteristic; // TODO: what if we fail later on this ?
                                    resolve(data);

                                    if (!characteristic._factory_descriptors) {
                                        return;
                                    }

                                    const findDescriptor = uuid => {
                                        return characteristic._factory_descriptors.find(descriptor => {
                                            return descriptor.uuid === uuid;
                                        });
                                    };

                                    if (handles.user_desc_handle) {
                                        const userDescriptionDescriptor = findDescriptor('2901');
                                        this._descriptors[userDescriptionDescriptor.instanceId] = userDescriptionDescriptor;
                                        userDescriptionDescriptor.handle = handles.user_desc_handle;
                                    }

                                    if (handles.cccd_handle) {
                                        const cccdDescriptor = findDescriptor('2902');
                                        this._descriptors[cccdDescriptor.instanceId] = cccdDescriptor;
                                        cccdDescriptor.handle = handles.cccd_handle;
                                        cccdDescriptor.value = {};

                                        for (let deviceInstanceId in this._devices) {
                                            this._setDescriptorValue(cccdDescriptor, [0, 0], deviceInstanceId);
                                        }
                                    }

                                    if (handles.sccd_handle) {
                                        const sccdDescriptor = findDescriptor('2903');
                                        this._descriptors[sccdDescriptor.instanceId] = sccdDescriptor;
                                        sccdDescriptor.handle = handles.sccd_handle;
                                    }
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
                        reject(_makeError('Error converting descriptor.', err));
                    } else if (descriptorForDriver) {
                        this._adapter.gattsAddDescriptor(
                            data.characteristicHandle,
                            descriptorForDriver,
                            (err, handle) => {
                                if (err) {
                                    reject(_makeError(err, 'Error adding descriptor.'));
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

        let applyGapServiceCharacteristics = gapService => {
            for (let characteristic of gapService._factory_characteristics) {
                // TODO: Fix Device Name uuid magic number
                if (characteristic.uuid === '2A00') {
                    // TODO: At some point addon should accept string.
                    this._setDeviceNameFromArray(characteristic.value, characteristic.writePerm, err => {
                        if (!err) {
                            characteristic.declarationHandle = 2;
                            characteristic.valueHandle = 3;
                            this._characteristics[characteristic.instanceId] = characteristic;
                        }
                    });
                }

                // TODO: Fix Appearance uuid magic number
                if (characteristic.uuid === '2A01') {
                    this._setAppearanceFromArray(characteristic.value, err => {
                        if (!err) {
                            characteristic.declarationHandle = 4;
                            characteristic.valueHandle = 5;
                            this._characteristics[characteristic.instanceId] = characteristic;
                        }
                    });
                }

                // TODO: Fix Peripheral Preferred Connection Parameters uuid magic number
                if (characteristic.uuid === '2A04') {
                    this._setPPCPFromArray(characteristic.value, err => {
                        if (!err) {
                            characteristic.declarationHandle = 6;
                            characteristic.valueHandle = 7;
                            this._characteristics[characteristic.instanceId] = characteristic;
                        }
                    });
                }
            }
        };

        // Create array of function objects to call in sequence.
        var promises = [];

        for (let service of services) {
            var p;

            if (service.uuid === '1800') {
                service.startHandle = 1;
                service.endHandle = 7;
                applyGapServiceCharacteristics(service);
                this._services[service.instanceId] = service;
                continue;
            } else if (service.uuid === '1801') {
                service.startHandle = 8;
                service.endHandle = 8;
                this._services[service.instanceId] = service;
                continue;
            }

            p = addService.bind(undefined, service, this._getServiceType(service));
            promises.push(p);

            if (service._factory_characteristics) {
                for (let characteristic of service._factory_characteristics) {
                    p = addCharacteristic.bind(undefined, characteristic);
                    promises.push(p);

                    if (characteristic._factory_descriptors) {
                        for (let descriptor of characteristic._factory_descriptors) {
                            if (!this._converter.isSpecialUUID(descriptor.uuid)) {
                                p = addDescriptor.bind(undefined, descriptor);
                                promises.push(p);
                            }
                        }
                    }
                }
            }
        }

        // Execute the promises in sequence, start with an empty object that
        // is propagated to all promises.
        promiseSequencer(promises, {}).then(data => {
            // TODO: Ierate over all servicses, descriptors, characterstics from parameter services
            if (callback) { callback(); }
        }).catch(err => {
            this.emit('error', err);
            if (callback) { callback(err); }
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
            this.emit('error', _makeError('Failed to get services, a gatt operation already in progress', undefined));
            return;
        }

        // TODO: Should we remove old services and do new discovery?
        const alreadyFoundServices = _.filter(this._services, service => {
            return deviceInstanceId === service.deviceInstanceId;
        });

        if (!_.isEmpty(alreadyFoundServices)) {
            if (callback) { callback(undefined, alreadyFoundServices); }
            return;
        }

        this._gattOperationsMap[device.instanceId] = {callback: callback, pendingHandleReads: {}, parent: device};
        this._adapter.gattcDiscoverPrimaryServices(device.connectionHandle, 1, null, (err, services) => {
            if (err) {
                this.emit('error', _makeError('Failed to get services', err));
                if (callback) { callback(err); }
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
            throw new Error(_makeError('Failed to get characteristics.', 'Could not find service with id: ' + serviceId));
        }

        const device = this.getDevice(service.deviceInstanceId);

        if (this._gattOperationsMap[device.instanceId]) {
            this.emit('error', _makeError('Failed to get characteristics, a gatt operation already in progress', undefined));
            return;
        }

        const alreadyFoundCharacteristics = _.filter(this._characteristics, characteristic => {
            return serviceId === characteristic.serviceInstanceId;
        });

        if (!_.isEmpty(alreadyFoundCharacteristics)) {
            if (callback) { callback(undefined, alreadyFoundCharacteristics); }
            return;
        }

        const handleRange = {start_handle: service.startHandle, end_handle: service.endHandle};
        this._gattOperationsMap[device.instanceId] = {callback: callback, pendingHandleReads: {}, parent: service};

        this._adapter.gattcDiscoverCharacteristics(device.connectionHandle, handleRange, err => {
            if (err) {
                this.emit('error', _makeError('Failed to get Characteristics', err));
                if (callback) { callback(err); }
                return;
            }
        });
    }

    getDescriptor(descriptorId) {
        return this._descriptors[descriptorId];
    }

    _isDescriptorPerConnectionBased(descriptor) {
        return this._isCCCDDescriptor(descriptor.instanceId);
    }

    _setDescriptorValue(descriptor, value, deviceInstanceId) {
        if (this._isDescriptorPerConnectionBased(descriptor)) {
            descriptor.value[deviceInstanceId] = value;
        } else {
            descriptor.value = value;
        }
    }

    _getDescriptorValue(descriptor, deviceInstanceId) {
        if (this._isDescriptorPerConnectionBased(descriptor)) {
            return descriptor.value[deviceInstanceId];
        } else {
            return descriptor.value;
        }
    }

    _addDeviceToAllPerConnectionValues(deviceId) {
        for (let descriptorInstanceId in this._descriptors) {
            const descriptor = this._descriptors[descriptorInstanceId];
            if (this._instanceIdIsOnLocalDevice(descriptorInstanceId) &&
                this._isDescriptorPerConnectionBased(descriptor)) {
                this._setDescriptorValue(descriptor, [0, 0], deviceId);
                this.emit('descriptorValueChanged', descriptor);
            }
        }
    }

    _clearDeviceFromAllPerConnectionValues(deviceId) {
        for (let descriptorInstanceId in this._descriptors) {
            const descriptor = this._descriptors[descriptorInstanceId];
            if (this._instanceIdIsOnLocalDevice(descriptorInstanceId) &&
                this._isDescriptorPerConnectionBased(descriptor)) {
                delete descriptor.value[deviceId];
                this.emit('descriptorValueChanged', descriptor);
            }
        }
    }

    _clearDeviceFromDiscoveredServices(deviceId) {
        this._services = this._filterObject(this._services, value => value.indexOf(deviceId) < 0);
        this._characteristics = this._filterObject(this._characteristics, value => value.indexOf(deviceId) < 0);
        this._descriptors = this._filterObject(this._descriptors, value => value.indexOf(deviceId) < 0);
    }

    _filterObject(collection, predicate) {
        const newCollection = {};

        for (let key in collection) {
            if (predicate(key)) {
                newCollection[key] = collection[key];
            }
        }

        return newCollection;
    }

    // Callback signature function(err, descriptors) {}
    getDescriptors(characteristicId, callback) {
        // TODO: Implement something for when device is local
        const characteristic = this.getCharacteristic(characteristicId);
        const service = this.getService(characteristic.serviceInstanceId);
        const device = this.getDevice(service.deviceInstanceId);

        if (this._gattOperationsMap[device.instanceId]) {
            this.emit('error', _makeError('Failed to get descriptors, a gatt operation already in progress', undefined));
            return;
        }

        const alreadyFoundDescriptor = _.filter(this._descriptors, descriptor => {
            return characteristicId === descriptor.characteristicInstanceId;
        });

        if (!_.isEmpty(alreadyFoundDescriptor)) {
            if (callback) { callback(undefined, alreadyFoundDescriptor); }
            return;
        }

        const handleRange = {start_handle: characteristic.valueHandle + 1, end_handle: service.endHandle};
        this._gattOperationsMap[device.instanceId] = {callback: callback, pendingHandleReads: {}, parent: characteristic};
        this._adapter.gattcDiscoverDescriptors(device.connectionHandle, handleRange, err => {
            if (err) {
                this.emit('error', _makeError('Failed to get Descriptors', err));
                if (callback) { callback(err); }
                return;
            }
        });
    }

    // Callback signature function(err, readBytes) {}
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

        this._adapter.gattcRead(device.connectionHandle, characteristic.valueHandle, 0, err => {
            if (err) {
                this.emit('error', _makeError('Read characteristic value failed', err));
            }
        });
    }

    // Callback signature function(err) {}  ack: require acknowledge from device, irrelevant in GATTS role. options: {ack, long, offset}
    writeCharacteristicValue(characteristicId, value, ack, completeCallback, deviceNotifiedOrIndicated) {
        const characteristic = this.getCharacteristic(characteristicId);
        if (!characteristic) {
            throw new Error('Characteristic value write failed: Could not get characteristic with id ' + characteristicId);
        }

        if (this._instanceIdIsOnLocalDevice(characteristicId)) {
            this._writeLocalValue(characteristic, value, 0, completeCallback, deviceNotifiedOrIndicated);
            return;
        }

        const device = this._getDeviceByCharacteristicId(characteristicId);
        if (!device) {
            throw new Error('Characteristic value write failed: Could not get device');
        }

        if (this._gattOperationsMap[device.instanceId]) {
            throw new Error('Characteristic value write failed: A gatt operation already in progress with device id ' + device.instanceId);
        }

        this._gattOperationsMap[device.instanceId] = {callback: completeCallback, bytesWritten: 0, value: value.slice(), attribute: characteristic};

        if (value.length > this._maxShortWritePayloadSize) {
            if (!ack) {
                throw new Error('Long writes do not support BLE_GATT_OP_WRITE_CMD');
            }

            this._gattOperationsMap[device.instanceId].bytesWritten = this._maxLongWritePayloadSize;
            this._longWrite(device, characteristic, value, completeCallback);
        } else {
            this._gattOperationsMap[device.instanceId].bytesWritten = value.length;
            this._shortWrite(device, characteristic, value, ack, completeCallback);
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

    _isCCCDDescriptor(descriptorId) {
        const descriptor = this._descriptors[descriptorId];
        return descriptor &&
               ((descriptor.uuid === '0000290200001000800000805F9B34FB') ||
               (descriptor.uuid === '2902'));
    }

    _getCCCDOfCharacteristic(characteristicId) {
        return _.find(this._descriptors, descriptor => {
            return (descriptor.characteristicInstanceId === characteristicId) &&
                   (this._isCCCDDescriptor(descriptor.instanceId));
        });
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

        this._adapter.gattcRead(device.connectionHandle, descriptor.handle, 0, err => {
            if (err) {
                this.emit('error', _makeError('Read descriptor value failed', err));
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
            value: value,
        };

        this._adapter.gattcWrite(device.connectionHandle, writeParameters, err => {
            if (err) {
                delete this._gattOperationsMap[device.instanceId];
                this.emit('error', 'Failed to write to attribute with handle: ' + attribute.handle);
                if (callback) { callback(err); }
                return;
            }

            if (!ack) {
                delete this._gattOperationsMap[device.instanceId];
                attribute.value = value;
                if (callback) { callback(undefined, attribute); }
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
            value: value.slice(0, this._maxLongWritePayloadSize),
        };

        this._adapter.gattcWrite(device.connectionHandle, writeParameters, err => {
            if (err) {
                console.log(err);
                this._longWriteCancel(device, attribute);
                this.emit('error', _makeError('Failed to write value to device/handle ' + device.instanceId + '/' + attribute.handle, err));
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
            value: [],
        };

        this._adapter.gattcWrite(device.connectionHandle, writeParameters, err => {
            delete this._gattOperationsMap[device.instanceId];

            if (err) {
                this.emit('error', _makeError('Failed to cancel failed long write', err));
                gattOperation.callback('Failed to write and failed to cancel write');
            } else {
                gattOperation.callback('Failed to write value to device/handle ' + device.instanceId + '/' + attribute.handle);
            }
        });
    }

    _sendingNotificationsAndIndicationsComplete() {
        return this._pendingNotificationsAndIndications.sentAllNotificationsAndIndications &&
               this._pendingNotificationsAndIndications.remainingNotificationCallbacks === 0 &&
               this._pendingNotificationsAndIndications.remainingIndicationConfirmations === 0;
    }

    _writeLocalValue(attribute, value, offset, completeCallback, deviceNotifiedOrIndicated) {
        const writeParameters = {
            len: value.length,
            offset: offset,
            value: value,
        };

        if (!this._instanceIdIsOnLocalDevice(attribute.instanceId)) {
            this.emit('error', _makeError('Attribute was not a local attribute'));
            return;
        }

        // TODO: Do we know that the attributes are the correct attributes?
        if (attribute.uuid === '2A00') {
            // TODO: At some point addon should accept string.
            // TODO: Fix write perm to be same as set at server setup.
            this._setDeviceNameFromArray(value, ['open'], err => {
                if (err) {
                    completeCallback(err);
                }

                attribute.value = value;
                completeCallback(undefined, attribute);
            });
            return;
        }

        // TODO: Fix Appearance uuid magic number
        if (attribute.uuid === '2A01') {
            this._setAppearanceFromArray(value, err => {
                if (err) {
                    completeCallback(err);
                }

                attribute.value = value;
                completeCallback(undefined, attribute);
            });
            return;
        }

        // TODO: Fix Peripheral Preferred Connection Parameters uuid magic number
        if (attribute.uuid === '2A04') {
            this._setPPCPFromArray(value, err => {
                if (err) {
                    completeCallback(err);
                }

                attribute.value = value;
                completeCallback(undefined, attribute);
            });
            return;
        }

        // TODO: Figure out if we should use hvx?
        const cccdDescriptor = this._getCCCDOfCharacteristic(attribute.instanceId);
        let sentHvx = false;

        if (cccdDescriptor) {
            // TODO: This is probably way to simple, do we need a map of devices indication is sent to?
            this._pendingNotificationsAndIndications = {
                completeCallback: completeCallback,
                deviceNotifiedOrIndicated: deviceNotifiedOrIndicated,
                sentAllNotificationsAndIndications: false,
                remainingNotificationCallbacks: 0,
                remainingIndicationConfirmations: 0,
            };

            for (let deviceInstanceId in this._devices) {
                const cccdValue = cccdDescriptor.value[deviceInstanceId][0];
                const sendIndication = cccdValue & 2;
                const sendNotification = !sendIndication && (cccdValue & 1);

                if (sendNotification || sendIndication) {
                    const device = this._devices[deviceInstanceId];
                    const hvxParams = {
                        handle: attribute.valueHandle,
                        type: sendIndication || sendNotification,
                        offset: offset,
                        len: value.length,
                        data: value,
                    };
                    sentHvx = true;

                    if (sendNotification) {
                        this._pendingNotificationsAndIndications.remainingNotificationCallbacks++;
                    } else if (sendIndication) {
                        this._pendingNotificationsAndIndications.remainingIndicationConfirmations++;
                    }

                    this._adapter.gattsHVX(device.connectionHandle, hvxParams, err => {
                        if (err) {
                            if (sendNotification) {
                                this._pendingNotificationsAndIndications.remainingNotificationCallbacks--;
                            } else if (sendIndication) {
                                this._pendingNotificationsAndIndications.remainingIndicationConfirmations--;
                            }

                            this.emit('error', _makeError('Failed to send notification', err));

                            if (this._sendingNotificationsAndIndicationsComplete()) {
                                completeCallback(_makeError('Failed to send notification or indication', err));
                                this._pendingNotificationsAndIndications = {};
                            }

                            return;
                        } else {
                            this._setAttributeValueWithOffset(attribute, value, offset);

                            if (sendNotification) {
                                if (deviceNotifiedOrIndicated) {
                                    deviceNotifiedOrIndicated(device, attribute);
                                }

                                this.emit('deviceNotifiedOrIndicated', device, attribute);

                                this._pendingNotificationsAndIndications.remainingNotificationCallbacks--;
                                if (this._sendingNotificationsAndIndicationsComplete()) {
                                    completeCallback(undefined);
                                    this._pendingNotificationsAndIndications = {};
                                }
                            } else if (sendIndication) {
                                return;
                            }
                        }
                    });
                }
            }

            this._pendingNotificationsAndIndications.sentAllNotificationsAndIndications = true;
        }

        if (sentHvx) {
            if (this._sendingNotificationsAndIndicationsComplete()) {
                completeCallback(undefined);
                this._pendingNotificationsAndIndications = {};
            }

            return;
        }

        this._adapter.gattsSetValue(this._bleDriver.BLE_CONN_HANDLE_INVALID, attribute.handle, writeParameters, (err, writeResult) => {
            if (err) {
                this.emit('error', _makeError('Failed to write local value', err));
                completeCallback(err, undefined);
                return;
            }

            this._setAttributeValueWithOffset(attribute, value, offset);
            completeCallback(undefined, attribute);
        });
    }

    _readLocalValue(attribute, callback) {
        const readParameters = {
            len: 512,
            offset: 0,
            value: [],
        };

        this._adapter.gattsGetValue(this._bleDriver.BLE_CONN_HANDLE_INVALID, attribute, readParameters, (err, readResults) => {
            if (err) {
                this.emit('error', _makeError('Failed to write local value', err));
                if (callback) { callback(err, undefined); }
                return;
            }

            attribute.value = readResults.value;
            if (callback) { callback(undefined, attribute); }
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

        const cccdDescriptor = this._getCCCDOfCharacteristic(characteristicId);
        if (!cccdDescriptor) {
            throw new Error('Start characteristic notifications failed: Could not find CCCD descriptor with parent characteristic id: ' + characteristicId);
        }

        this.writeDescriptorValue(cccdDescriptor.instanceId, [enableNotificationBitfield, 0], true, err => {
            if (err) {
                this.emit('error', 'Failed to start characteristics notifications');
            }

            if (callback) { callback(err); }
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

        const cccdDescriptor = this._getCCCDOfCharacteristic(characteristicId);
        if (!cccdDescriptor) {
            throw new Error('Stop characteristic notifications failed: Could not find CCCD descriptor with parent characteristic id: ' + characteristicId);
        }

        this.writeDescriptorValue(cccdDescriptor.instanceId, [disableNotificationBitfield, 0], true, err => {
            if (err) {
                this.emit('error', 'Failed to stop characteristics notifications');
            }

            if (callback) { callback(err); }
        });
    }
}

module.exports = Adapter;
