'use strict';

// TODO: does it need an adapterInstanceId?
const uuidDefinitions = require('./util/uuid_definitions');

class Device {
    constructor(address, role) {
        this._instanceId = null;
        this._address = {};

        if (typeof deviceAddress === 'string') {
            this._address.address = address;
            this._address.type = 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC';
        } else {
            this._address = address;
        }

        this._address = address;
        this.name = null;
        this._role = role;
        this.uuids = [];
        this.services = [];
        this.flags = [];

        this.connected = false;
        this.rssi = null;
        this.txPower = null;
        this._connectionHandle = null;

        this.minConnectionInterval = null;
        this.maxConnectionInterval = null;
        this.slaveLatency = null;
        this.connectionSupervisionTimeout = null;

        this.paired = false;
    }

    // null if not connected
    get instanceId() {
        return this._instanceId;
    }

    // Get the BLE address. 'local': local/adapter, non-'local': other device
    get address() {
        return this._address;
    }

    // 'peripheral', 'central'
    get role() {
        return this._role;
    }

    get connectionHandle() {
        return this._connectionHandle;
    }

    set connectionHandle(connectionHandle) {
        // TODO: possible to set connectionHandle to undefined? will instanceID be correct?
        this._connectionHandle = connectionHandle;

        //TODO: Should instanceId involve role or is that handled by connectionHandle?
        this._instanceId = this._address + '.' + connectionHandle;
    }

    processEventData(event) {
        this.time = new Date(event.time);
        this.rssi = event.rssi;
        this.txPower = event.data ? event.data.BLE_GAP_AD_TYPE_TX_POWER_LEVEL : undefined;
        this._findAndSetNameFromAdvertisingData(event.data);
        this._processAndSetServiceUuidsFromAdvertisingData(event.data);
        this._processFlagsFromAdvertisingData(event.data);
        this._setRssiLevel();
    }

    _findAndSetNameFromAdvertisingData(advertisingData) {
        if (advertisingData) {
            if (advertisingData.BLE_GAP_AD_TYPE_LONG_LOCAL_NAME) {
                this.name = advertisingData.BLE_GAP_AD_TYPE_LONG_LOCAL_NAME;
            } else if (advertisingData.BLE_GAP_AD_TYPE_SHORT_LOCAL_NAME) {
                this.name = advertisingData.BLE_GAP_AD_TYPE_SHORT_LOCAL_NAME;
            } else if (advertisingData.BLE_GAP_AD_TYPE_COMPLETE_LOCAL_NAME) {
                this.name = advertisingData.BLE_GAP_AD_TYPE_COMPLETE_LOCAL_NAME;
            }
        } else {
            this.name = '';
        }
    }

    _processFlagsFromAdvertisingData(advertisingData) {
        if (advertisingData && advertisingData.BLE_GAP_AD_TYPE_FLAGS) {
            this.flags = advertisingData.BLE_GAP_AD_TYPE_FLAGS.map((flag) => {
                return camelCaseFlag(flag);
            });
        }
    }

    _processAndSetServiceUuidsFromAdvertisingData(advertisingData) {
        if (!advertisingData) {
            return;
        }

        let uuids = [];

        if (advertisingData.BLE_GAP_AD_TYPE_16BIT_SERVICE_UUID_MORE_AVAILABLE) {
            uuids = uuids.concat(advertisingData.BLE_GAP_AD_TYPE_16BIT_SERVICE_UUID_MORE_AVAILABLE);
        }

        if (advertisingData.BLE_GAP_AD_TYPE_16BIT_SERVICE_UUID_COMPLETE) {
            uuids = uuids.concat(advertisingData.BLE_GAP_AD_TYPE_16BIT_SERVICE_UUID_COMPLETE);
        }
        /*
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
        }*/

        this.uuids = uuids;
        this.services = uuids.map((uuid) => {
            return uuidToService(uuid);
        });
    }

    _setRssiLevel() {
        const MIN_RSSI = -100;
        const MAX_RSSI = -45;

        function mapRange(n, fromMin, fromMax, toMin, toMax) {
            //scale number n from the range [fromMin, fromMax] to [toMin, toMax]
            n = toMin + ((toMax - toMin) / (fromMax - fromMin)) * (n - fromMin);
            n = Math.round(n);
            return Math.max(toMin, Math.min(toMax, n));
        }

        this.rssi_level = mapRange(this.rssi, MIN_RSSI, MAX_RSSI, 4, 20);
    }
}

module.exports = Device;

function camelCaseFlag(flag) {
    const advFlagsPrefix = 'BLE_GAP_ADV_FLAG';

    if (flag.indexOf(advFlagsPrefix) === 0) {
        // Remove not needed prefix and lowercase the string
        var flagCamelCase = flag.replace(
            /^BLE_GAP_ADV_FLAG[S]?_(.*)/g,
            function($1, $2) {
                return $2.toLowerCase()
                .replace(/(\_[a-z])/g,
                    function($1) {
                        var camelCase = $1.toUpperCase().replace('_', '');
                        return camelCase[0].toUpperCase() + camelCase.slice(1);
                    });
            });

        return flagCamelCase[0].toUpperCase() + flagCamelCase.slice(1);
    } else {
        return 'NOT_ABLE_TO_CAMELCASE_THIS_FLAG: ' + flag;
    }
}

// TODO: look into using a database for storing the services UUID's. Also look into importing them from the Bluetooth pages.
// TODO: Also look into reusing code from the Android MCP project:
// TODO: http://projecttools.nordicsemi.no/stash/projects/APPS-ANDROID/repos/nrf-master-control-panel/browse/app/src/main/java/no/nordicsemi/android/mcp/database/init
// TODO: http://projecttools.nordicsemi.no/stash/projects/APPS-ANDROID/repos/nrf-master-control-panel/browse/app/src/main/java/no/nordicsemi/android/mcp/database/DatabaseHelper.java
function uuidToService(uuid) {
    var uuidName;
    if (uuid.match('0000....-0000-1000-8000-00805F9B34FB')) {
        uuidName = uuidDefinitions['0x' + uuid.slice(4, 8)];

        if (uuidName === undefined) {
            uuidName = uuid.slice(4, 8);
        }
    } else {
        uuidName = uuid.slice(4, 8) + '*';
    }

    return uuidName;
}
