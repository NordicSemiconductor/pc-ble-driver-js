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

class Device {
    constructor(address, role) {
        this._instanceId = null;
        this._address = {};

        if (typeof address === 'string') {
            this._address = address;
            this._addressType = 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC';
        } else {
            this._address = address.address;
            this._addressType = address.type;
        }

        this.adData = {};

        this.name = null;
        this._role = role;
        this.services = [];
        this.flags = [];
        this.scanResponse = null;

        this.connected = false;
        this.rssi = null;
        this.txPower = null;
        this._connectionHandle = null;

        this.minConnectionInterval = null;
        this.maxConnectionInterval = null;
        this.slaveLatency = null;
        this.connectionSupervisionTimeout = null;

        this.paired = false;
        this.ownPeriphInitiatedPairingPending = false; // Local adapter peripheral initiated a pairing procedure
    }

    // null if not connected
    get instanceId() {
        return this._instanceId;
    }

    // Get the BLE address. 'local.server': local/adapter, non-'local.server': other device
    get address() {
        return this._address;
    }

    // Get the BLE address type. 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC' is default type.
    get addressType() {
        return this._addressType;
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
        this.adData = event.data;
        this.time = new Date(event.time);
        this.scanResponse = event.scan_rsp;
        this.rssi = event.rssi;
        this.advType = event.adv_type;
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
        }

        if (!this.name) {
            this.name = '';
        }
    }

    _processFlagsFromAdvertisingData(advertisingData) {
        if (advertisingData && advertisingData.BLE_GAP_AD_TYPE_FLAGS) {
            this.flags = advertisingData.BLE_GAP_AD_TYPE_FLAGS.map(flag => {
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
        */

        if (advertisingData.BLE_GAP_AD_TYPE_128BIT_SERVICE_UUID_MORE_AVAILABLE) {
            uuids = uuids.concat(advertisingData.BLE_GAP_AD_TYPE_128BIT_SERVICE_UUID_MORE_AVAILABLE);
        }

        if (advertisingData.BLE_GAP_AD_TYPE_128BIT_SERVICE_UUID_COMPLETE) {
            uuids = uuids.concat(advertisingData.BLE_GAP_AD_TYPE_128BIT_SERVICE_UUID_COMPLETE);
        }

        this.services = uuids;
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

module.exports = Device;
