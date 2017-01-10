/* Copyright (c) 2016, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 *   1. Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 *
 *   2. Redistributions in binary form, except as embedded into a Nordic
 *   Semiconductor ASA integrated circuit in a product or a software update for
 *   such product, must reproduce the above copyright notice, this list of
 *   conditions and the following disclaimer in the documentation and/or other
 *   materials provided with the distribution.
 *
 *   3. Neither the name of Nordic Semiconductor ASA nor the names of its
 *   contributors may be used to endorse or promote products derived from this
 *   software without specific prior written permission.
 *
 *   4. This software, with or without modification, must only be used with a
 *   Nordic Semiconductor ASA integrated circuit.
 *
 *   5. Any software provided in binary form under this license must not be
 *   reverse engineered, decompiled, modified and/or disassembled.
 *
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
 * GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT
 * OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
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
            this.flags = advertisingData.BLE_GAP_AD_TYPE_FLAGS.map(flag => camelCaseFlag(flag));
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
            function ($1, $2) {
                return $2.toLowerCase()
                .replace(/(\_[a-z])/g,
                    function ($1) {
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
