'use strict';

const sinon = require('sinon');

const BLE_GAP_EVT_CONNECTED = 0x10;
const BLE_GAP_EVT_DISCONNECTED = 0x11;
const BLE_GAP_EVT_CONN_PARAM_UPDATE = 0x12;
const BLE_GAP_EVT_CONN_PARAM_UPDATE_REQUEST = 0x1d;

const BLE_UUID_TYPE_UNKNOWN = 0;

const BLE_GAP_EVT_ADV_REPORT = 27;

const BLE_GATTC_EVT_PRIM_SRVC_DISC_RSP = 48;
const BLE_GATTC_EVT_CHAR_DISC_RSP = 50;
const BLE_GATTC_EVT_DESC_DISC_RSP = 51;
const BLE_GATTC_EVT_READ_RSP = 53;
const BLE_GATTC_EVT_HVX = 56;

const BLE_GATT_HVX_NOTIFICATION = 1;
const BLE_GATT_HVX_INDICATION = 2;

module.exports.createBleDriver = function(callbackForReceivingBleDriverEventCallback) {
    let bleDriver =
    {
        get_adapters: sinon.stub(),
        gap_connect: sinon.stub(),
        gap_disconnect: sinon.stub(),
        gap_update_connection_parameters: sinon.stub(),
        get_version: sinon.stub(),
        gap_get_device_name: sinon.stub(),
        gap_get_address: sinon.stub(),
        gap_cancel_connect: sinon.stub(),
        gap_set_advertising_data: sinon.stub(),
        gap_start_advertising: sinon.stub(),
        gap_stop_advertising: sinon.stub(),
        gattc_primary_services_discover: sinon.stub(),
        gattc_characteristic_discover: sinon.stub(),
        gattc_descriptor_discover: sinon.stub(),
        gattc_read: sinon.stub(),
        gattc_confirm_handle_value: sinon.stub(),
        open: (options, err) => {
        },

        close: sinon.stub(),
        gap_start_scan: sinon.stub(),
        gap_stop_scan: sinon.stub(),

        BLE_UUID_TYPE_UNKNOWN,
        BLE_GAP_EVT_CONNECTED,
        BLE_GAP_EVT_DISCONNECTED,
        BLE_GAP_EVT_CONN_PARAM_UPDATE,
        BLE_GAP_EVT_CONN_PARAM_UPDATE_REQUEST,
        BLE_GAP_EVT_ADV_REPORT,
        BLE_GATTC_EVT_PRIM_SRVC_DISC_RSP,
        BLE_GATTC_EVT_CHAR_DISC_RSP,
        BLE_GATTC_EVT_DESC_DISC_RSP,
        BLE_GATTC_EVT_READ_RSP,
        BLE_GATTC_EVT_HVX,
        BLE_GATT_HVX_NOTIFICATION,
        BLE_GATT_HVX_INDICATION,
    };

    // Enable users to trigger events
    sinon.stub(bleDriver, 'open', (port, options, callback) => {
        let bleDriverEventCallback = options.eventCallback;
        callback();
        if (callbackForReceivingBleDriverEventCallback) {
            callbackForReceivingBleDriverEventCallback(bleDriverEventCallback);
        }
    });

    bleDriver.get_adapters.yields(undefined, [{ serialNumber: 'test', comName: '6' }]);
    bleDriver.gap_get_address.yields('DE:AD:BE:EF:FF:FF', undefined);

    bleDriver.gap_connect.yields(undefined);
    bleDriver.gap_disconnect.yields(undefined);
    bleDriver.gap_cancel_connect.yields(undefined);
    bleDriver.get_version.yields('0.0.9', undefined);
    bleDriver.gap_get_device_name.yields('holy handgrenade', undefined);
    bleDriver.gap_get_address.yields('Bridge of death', undefined);

    bleDriver.gap_start_scan.yields(undefined);
    bleDriver.gap_stop_scan.yields(undefined);

    return bleDriver;
};

module.exports.createConnectEvent = function() {
    return {
        id: BLE_GAP_EVT_CONNECTED,
        conn_handle: 123,
        peer_addr: {address: 'FF:AA:DD'},
        role: 'BLE_GAP_ROLE_CENTRAL',
        conn_params: {
            min_conn_interval: 10,
            max_conn_interval: 100,
            slave_latency: 100,
            conn_sup_timeout: 455,
        },
    };
};

module.exports.createConnectionParametersUpdateEvent = function() {
    return {
        id: BLE_GAP_EVT_CONN_PARAM_UPDATE,
        conn_handle: 123,
        conn_params: {
            min_conn_interval: 10,
            max_conn_interval: 100,
            slave_latency: 100,
            conn_sup_timeout: 455,
        },
    };
};

module.exports.createHvxEvent = function(useIndication) {
    return {
        id: BLE_GATTC_EVT_HVX,
        conn_handle: 123,
        handle: 3,
        type: useIndication ? BLE_GATT_HVX_INDICATION : BLE_GATT_HVX_NOTIFICATION,
        len: 2,
        data: [5, 6],
    };
};
