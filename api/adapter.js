
import AdapterState from './adapterState';

// TODO: fix pc-ble-driver-js import
import bleDriver from './pc-ble-driver-js';

// No caching of devices
// Do cache service database

class Adapter extends events.EventEmitter {
    constructor(instanceId, port) {
        this._instanceId = instanceId;
        this._adapterState = new AdapterState(instanceId, port);
        this._devices = {};
    }

    // Get the instance id
    get instanceId() {
        return this._instanceId;
    }

    // options = { baudRate: x, parity: x, flowControl: x }
    // Callback signature function(err) {}
    open(options, callback) {
        this._adapterState.baudRate = options.baudRate;
        this._adapterState.parity = options.parity;
        this._adapterState.flowControl = options.flowControl;

        // TODO: call this.getAdapterState?
        this.emit('adapterStateChanged', this._adapterState);

        options.eventInterval = 100;
        options.logCallback = this._logCallback;
        options.eventCallback = this._eventCallback;

        bleDriver.open(this._adapterState.port, options, err => {
            if(err) {
                this._adapterState.available = false;
                console.log('Error occurred opening serial port: %d', err);
            } else {
                this._adapterState.available = true;
            }

            // TODO: call this.getAdapterState?
            this.emit('adapterStateChanged', this._adapterState);
            callback(err);
            return;
        });
    }

    // Callback signature function(err) {}
    close(callback) {
        bleDriver.close();

        this._adapterState.available = false;
        // TODO: call this.getAdapterState?
        this.emit('adapterStateChanged', this._adapterState);

        // TODO: how to call the callback? timer?
    }

    // TODO: log callback function declared here or in open call?;
    _logCallback(severity, message) {
        if (severity > 0) {
            console.log('log: ' + severity + ', ' + message);
        }
    }

    // TODO: event callback function declared here or in open call?;
    _eventCallback(eventArray) {
        console.log("eventArray length: " + eventArray.length);

        eventArray.forEach(event => {
            switch(event.id){
                case bleDriver.BLE_GAP_EVT_CONNECTED:
                    console.log(`Connected to ${event.peer_addr.addr}.`);
                    if (this._connectCallback) {
                        this._connectCallback();
                    }
                    break;
                default:
                    console.log(`Unsupported event received from SoftDevice: ${event.id} - ${event.name}`);
            }
        });
    }

    // Callback signature function(err, state) {}
    getAdapterState(callback) {
        // TODO: call getters that ask device for updated information?
        return this._adapterState;
    }

    // Set GAP related information
    setName(name, callback) {
        // TODO: should we change to setter function in adapterState?
        // Then how could we know if it was success and emit event?
        bleDriver.gap_set_device_name({sm: 0, lv: 0}, name, err => {
            if (err) {
                console.log('Failed to set name to adapter');
            } else if (this._adapterState.name !== name) {
                this._adapterState.name = name;

                // TODO: call this.getAdapterState?
                this.emit('adapterStateChanged', this._adapterState);
            }
        });
    }

    _getAddressStruct(address, type) {
        return {address: address, type: type};
    }

    setAddress(address, type, callback) {
        const cycleMode = bleDriver.BLE_GAP_ADDR_CYCLE_MODE_NONE;
        // TODO: if privacy is active use bleDriver.BLE_GAP_ADDR_CYCLE_MODE_AUTO?

        addressStruct = this._getAddressStruct(address, type);

        bleDriver.gap_set_address(cycleMode, addressStruct, err => {
            if (err) {
                console.log('Failed to set address');
            } else if (this._adapterState.address !== address) {
                // TODO: adapterState address include type?
                this._adapterState.address = address;

                // TODO: call this.getAdapterState?
                this.emit('adapterStateChanged', this._adapterState);
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
    on(eventName, callback) {

    }

    // Get connected device/devices

    // Callback signature function(devices : Device[]) {}
    getDevices(callback) {

    }

    // Callback signature function(device)
    getDevice(deviceAddress, callback) {

    }

    // Only for central

    // options: { active: x, interval: x, window: x timeout: x TODO: other params}. Callback signature function(err).
    startScan(options, callback) {
        bleDriver.start_scan(options, err => {
            if (err) {
                console.log('Error occured when starting scan');
            } else {
                this._adapterState.scanning = true;
                this.emit('adapterStateChanged', this._adapterState);
            }

            callback(err);
        });
    }

    // Callback signature function(err)
    stopScan(callback) {
        // TODO: check if adapterState is in scanning mode?

        bleDriver.stop_scan(err => {
            if (err) {
                // TODO: probably is state already set to false, but should we make sure? if yes, emit adapterStateChanged?
                console.log('Error occured when stopping scanning');
            } else {
                this._adapterState.scanning = false;
                this.emit('adapterStateChanged', this._adapterState);
            }
        });
    }

    // options: scanParams, connParams, Callback signature function(err) {}. Do not start service discovery. Err if connection timed out, +++
    connect(deviceAddress, options, callback) {
        bleDriver.gap_connect(deviceAddress, options.scanParams, options.connParams, err => {
            if (err) {
                console.log(`Could not connect to ${deviceAddress}`);
                callback(err);
            } else {
                // TODO: do we want a connecting state? Use it to see if we can overwrite this._connectCallback?
                this._connectCallback = callback;
            }
        });

        // TODO: howto connect callback to connected and timeout event?

        if (this._adapterState.scanning) {
            this._adapterState.scanning = false;
            this.emit('adapterStateChanged', this._adapterState);
        }
    }

    // Callback signature function() {}
    cancelConnect(callback) {
        // TODO: Check if we are connecting if we have a connecting state.

        bleDriver.gap_cancel_connect(err => {
            if (err) {
                callback(err);
            }

            // TODO: set connecting state to false if we have it.
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
        const whitelistStruct = undefined;
        const channelMaskStruct = undefined;

        return {type: type, peer_addr: addressStruct, fp: filterPolicy, whitelist: whitelistStruct,
                interval: interval, timeout:timeout, channelMask: channelMaskStruct};
    }

    // name given from setName. Callback function signature: function(err) {}
    // TODO: Need sendName, neither advertising nor scanData have to contain a name.
    startAdvertising(sendName, advertisingData, scanResponseData, options, callback) {
        const type = bleDriver.BLE_GAP_ADV_TYPE_ADV_IND;
        const addressStruct = this._getAddressStruct(address, addressType);
        const filterPolicy = bleDriver.BLE_GAP_ADV_FP_ANY;
        const interval = options.interval;

        //TODO: need to parse advertising and scanData and convert to byte array?
        bleDriver.gap_set_adv_data(advertisingData, scanResponseData);

        const advertismentParamsStruct = this._getAdvertismentParams(type, addressStruct, filterPolicy, interval, timeout);

        bleDriver.gap_start_advertising(advertismentParamsStruct, err => {
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
        // TODO: check if adapterState is in advertising mode?

        bleDriver.gap_stop_advertising(err => {
            if (err) {
                // TODO: probably is state already set to false, but should we make sure? if ys, emit adapterStateChanged?
                console.log('Error occured when stopping advertising');
            } else {
                this._adapterState.advertising = false;
                this.emit('adapterStateChanged', this._adapterState);
            }
        });
    }

    // Central/peripheral

    disconnect(deviceInstanceId, callback) {
        const device = this.getDevice(deviceInstanceId);
        const hciStatusCode = bleDriver.BLE_HCI_REMOTE_USER_TERMINATED_CONNECTION;
        bleDriver.disconnect(device.connectionHandle, hciStatusCode, err => {
            if (err) {
                console.log('Failed to disconnect');
            }

            // TODO: remove from device list? We no longer know this device, has it started to advertise again or is it silence?
            device.connected = false;
            this.emit('deviceDisconnected', device);

            callback(err);
        });
    }

    // options: connParams, callback signature function(err) {} returns true/false
    updateConnParams(deviceInstanceId, options, callback) {

    }

    // Central role

    // callback signature function(err) {}
    rejectConnParams(deviceInstanceId, callback) {}

    // Bonding (when in central role)

    setCapabilities(keyboard, screen) {

    }

    setLongTermKey(deviceAddress, ltk) {

    }

    // TODO: clarify when needed
    setEDIV(ediv, rnd) {

    }

    // Callback signature function(err) {}
    pair(deviceAddress, mitm: true/false, passkey: 'asdf', callback) {

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

    }

    // Callback signature function(err, services) {}. If deviceInstanceId is local, local database (GATTS)
    getServices(deviceInstanceId, callback) {

    }


// Callback signature function(err, characteristic) {}
    getCharacteristic(characteristicId, callback) {

    }

    // Callback signature function(err, characteristics) {}
    getCharacteristics(serviceId, callback) {

    }


// Callback signature function(err, descriptor) {}
    getDescriptor(descriptorId, callback) {

    }

    // Callback signature function(err, descriptors) {}
    getDescriptors(characteristicId, callback) {

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
