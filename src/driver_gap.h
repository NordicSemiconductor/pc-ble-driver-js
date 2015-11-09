#ifndef DRIVER_GAP_H
#define DRIVER_GAP_H

#include "ble.h"
#include "ble_hci.h"
#include "common.h"

#include <string>

static name_map_t gap_event_name_map = {
    NAME_MAP_ENTRY(BLE_GAP_EVT_ADV_REPORT),
    NAME_MAP_ENTRY(BLE_GAP_EVT_SCAN_REQ_REPORT),
    NAME_MAP_ENTRY(BLE_GAP_EVT_CONNECTED),
    NAME_MAP_ENTRY(BLE_GAP_EVT_DISCONNECTED),
    NAME_MAP_ENTRY(BLE_GAP_EVT_TIMEOUT),
    NAME_MAP_ENTRY(BLE_GAP_EVT_RSSI_CHANGED),
    NAME_MAP_ENTRY(BLE_GAP_EVT_CONN_PARAM_UPDATE),
    NAME_MAP_ENTRY(BLE_GAP_EVT_CONN_PARAM_UPDATE_REQUEST),
    NAME_MAP_ENTRY(BLE_GAP_EVT_SEC_PARAMS_REQUEST),
    NAME_MAP_ENTRY(BLE_GAP_EVT_AUTH_STATUS),
    NAME_MAP_ENTRY(BLE_GAP_EVT_CONN_SEC_UPDATE),
    NAME_MAP_ENTRY(BLE_GAP_EVT_SEC_INFO_REQUEST),
    NAME_MAP_ENTRY(BLE_GAP_EVT_SEC_REQUEST)
};

// Gap events -- START --

template<typename EventType>
class BleDriverGapEvent : public BleDriverEvent<EventType>
{
private:
    BleDriverGapEvent() {}

public:
    BleDriverGapEvent(uint16_t evt_id, const std::string timestamp, uint16_t conn_handle, EventType *evt)
        : BleDriverEvent<EventType>(evt_id, timestamp, conn_handle, evt)
    {
    }

    virtual void ToJs(v8::Local<v8::Object> obj)
    {
        BleDriverEvent<EventType>::ToJs(obj);
    }

    virtual v8::Local<v8::Object> ToJs() = 0;
    virtual EventType *ToNative() { return new EventType(); }

    char *getEventName() { return gap_event_name_map[this->evt_id]; }
};

class GapAdvReport : public BleDriverGapEvent<ble_gap_evt_adv_report_t>
{
public:
    GapAdvReport(const std::string timestamp, uint16_t conn_handle, ble_gap_evt_adv_report_t *evt)
        : BleDriverGapEvent<ble_gap_evt_adv_report_t>(BLE_GAP_EVT_ADV_REPORT, timestamp, conn_handle, evt) {}

    v8::Local<v8::Object> ToJs();
};

class GapScanReqReport : public BleDriverGapEvent<ble_gap_evt_scan_req_report_t>
{
public:
    GapScanReqReport(const std::string timestamp, uint16_t conn_handle, ble_gap_evt_scan_req_report_t *evt)
        : BleDriverGapEvent<ble_gap_evt_scan_req_report_t>(BLE_GAP_EVT_SCAN_REQ_REPORT, timestamp, conn_handle, evt) {}

    v8::Local<v8::Object> ToJs();
};

class GapConnected : public BleDriverGapEvent<ble_gap_evt_connected_t>
{
public:
    GapConnected(const std::string timestamp, uint16_t conn_handle, ble_gap_evt_connected_t *evt)
        : BleDriverGapEvent<ble_gap_evt_connected_t>(BLE_GAP_EVT_CONNECTED, timestamp, conn_handle, evt) {}

    v8::Local<v8::Object> ToJs();
};

class GapDisconnected : public BleDriverGapEvent<ble_gap_evt_disconnected_t>
{public:
    GapDisconnected(const std::string timestamp, uint16_t conn_handle, ble_gap_evt_disconnected_t *evt)
        : BleDriverGapEvent<ble_gap_evt_disconnected_t>(BLE_GAP_EVT_DISCONNECTED, timestamp, conn_handle, evt) {}

    v8::Local<v8::Object> ToJs();
};


class GapTimeout : public BleDriverGapEvent<ble_gap_evt_timeout_t>
{
public:
    GapTimeout(const std::string timestamp, uint16_t conn_handle, ble_gap_evt_timeout_t *evt)
        : BleDriverGapEvent<ble_gap_evt_timeout_t>(BLE_GAP_EVT_TIMEOUT, timestamp, conn_handle, evt) {}

    v8::Local<v8::Object> ToJs();
};


class GapRssiChanged : public BleDriverGapEvent<ble_gap_evt_rssi_changed_t>
{
public:
    GapRssiChanged(const std::string timestamp, uint16_t conn_handle, ble_gap_evt_rssi_changed_t *evt)
        : BleDriverGapEvent<ble_gap_evt_rssi_changed_t>(BLE_GAP_EVT_RSSI_CHANGED, timestamp, conn_handle, evt) {}

    v8::Local<v8::Object> ToJs();
};

class GapConnParamUpdate : public BleDriverGapEvent<ble_gap_evt_conn_param_update_t>
{
public:
    GapConnParamUpdate(const std::string timestamp, uint16_t conn_handle, ble_gap_evt_conn_param_update_t *evt)
        : BleDriverGapEvent<ble_gap_evt_conn_param_update_t>(BLE_GAP_EVT_CONN_PARAM_UPDATE, timestamp, conn_handle, evt) {}

    v8::Local<v8::Object> ToJs();
};

class GapConnParamUpdateRequest : public BleDriverGapEvent<ble_gap_evt_conn_param_update_request_t>
{
public:
    GapConnParamUpdateRequest(const std::string timestamp, uint16_t conn_handle, ble_gap_evt_conn_param_update_request_t *evt)
        : BleDriverGapEvent<ble_gap_evt_conn_param_update_request_t>(BLE_GAP_EVT_CONN_PARAM_UPDATE_REQUEST, timestamp, conn_handle, evt) {}

    v8::Local<v8::Object> ToJs();
};

class GapSecParamsRequest : public BleDriverGapEvent<ble_gap_evt_sec_params_request_t>
{
public:
    GapSecParamsRequest(const std::string timestamp, uint16_t conn_handle, ble_gap_evt_sec_params_request_t *evt)
        : BleDriverGapEvent<ble_gap_evt_sec_params_request_t>(BLE_GAP_EVT_SEC_PARAMS_REQUEST, timestamp, conn_handle, evt) {}

    v8::Local<v8::Object> ToJs();
};

class GapAuthStatus : public BleDriverGapEvent<ble_gap_evt_auth_status_t>
{
public:
    GapAuthStatus(const std::string timestamp, uint16_t conn_handle, ble_gap_evt_auth_status_t *evt) 
        : BleDriverGapEvent<ble_gap_evt_auth_status_t>(BLE_GAP_EVT_AUTH_STATUS, timestamp, conn_handle, evt) {}

    v8::Local<v8::Object> ToJs();
};

class GapConnSecUpdate : public BleDriverGapEvent<ble_gap_evt_conn_sec_update_t>
{
public:
    GapConnSecUpdate(const std::string timestamp, uint16_t conn_handle, ble_gap_evt_conn_sec_update_t *evt)
        : BleDriverGapEvent<ble_gap_evt_conn_sec_update_t>(BLE_GAP_EVT_CONN_SEC_UPDATE, timestamp, conn_handle, evt) {}

    v8::Local<v8::Object> ToJs();
};

class GapSecInfoRequest : public BleDriverGapEvent<ble_gap_evt_sec_info_request_t>
{
public:
    GapSecInfoRequest(const std::string timestamp, uint16_t conn_handle, ble_gap_evt_sec_info_request_t *evt)
        : BleDriverGapEvent<ble_gap_evt_sec_info_request_t>(BLE_GAP_EVT_SEC_INFO_REQUEST, timestamp, conn_handle, evt) {}

    v8::Local<v8::Object> ToJs();
};

class GapSecRequest : public BleDriverGapEvent<ble_gap_evt_sec_request_t>
{
public:
    GapSecRequest(const std::string timestamp, uint16_t conn_handle, ble_gap_evt_sec_request_t *evt)
        : BleDriverGapEvent<ble_gap_evt_sec_request_t>(BLE_GAP_EVT_SEC_REQUEST, timestamp, conn_handle, evt) {}

    v8::Local<v8::Object> ToJs();
};

// Gap events -- END --

// Gap structs --START --

class GapAddr : public BleToJs<ble_gap_addr_t>
{
public:
    GapAddr(ble_gap_addr_t *gap_addr) : BleToJs<ble_gap_addr_t>(gap_addr) {}
    GapAddr(v8::Local<v8::Object> js) : BleToJs<ble_gap_addr_t>(js) {}
    v8::Local<v8::Object> ToJs();
    ble_gap_addr_t *ToNative();
};

class GapConnParams : public BleToJs<ble_gap_conn_params_t>
{
public:
    GapConnParams(ble_gap_conn_params_t *conn_params) : BleToJs<ble_gap_conn_params_t>(conn_params) {}
    GapConnParams(v8::Local<v8::Object> js) : BleToJs<ble_gap_conn_params_t>(js) {}
    v8::Local<v8::Object> ToJs();
    ble_gap_conn_params_t *ToNative();
};

class GapConnSecMode : public BleToJs<ble_gap_conn_sec_mode_t>
{
public:
    GapConnSecMode(ble_gap_conn_sec_mode_t *conn_sec_mode) : BleToJs<ble_gap_conn_sec_mode_t>(conn_sec_mode) {}
    GapConnSecMode(v8::Local<v8::Object> js) : BleToJs<ble_gap_conn_sec_mode_t>(js) {}
    v8::Local<v8::Object> ToJs();
    ble_gap_conn_sec_mode_t *ToNative();
};

class GapScanParams : public BleToJs<ble_gap_scan_params_t>
{
public:
    GapScanParams(ble_gap_scan_params_t *scanParams) : BleToJs<ble_gap_scan_params_t>(scanParams) {}
    GapScanParams(v8::Local<v8::Object> js) : BleToJs<ble_gap_scan_params_t>(js) {}
    v8::Local<v8::Object> ToJs();
    ble_gap_scan_params_t *ToNative();
};

class GapAdvChannelMask : public BleToJs<ble_gap_adv_ch_mask_t>
{
public:
    GapAdvChannelMask(ble_gap_adv_ch_mask_t *channel_mask) : BleToJs<ble_gap_adv_ch_mask_t>(channel_mask) {}
    GapAdvChannelMask(v8::Local<v8::Object> js) : BleToJs<ble_gap_adv_ch_mask_t>(js) {}
    v8::Local<v8::Object> ToJs();
    ble_gap_adv_ch_mask_t *ToNative();
};

class GapAdvParams : public BleToJs<ble_gap_adv_params_t>
{
public:
    GapAdvParams(ble_gap_adv_params_t *conn_params) : BleToJs<ble_gap_adv_params_t>(conn_params) {}
    GapAdvParams(v8::Local<v8::Object> js) : BleToJs<ble_gap_adv_params_t>(js) {}
    v8::Local<v8::Object> ToJs();
    ble_gap_adv_params_t *ToNative();
};

class GapSecParams : public BleToJs<ble_gap_sec_params_t>
{
public:
    GapSecParams(ble_gap_sec_params_t *sec_params) : BleToJs<ble_gap_sec_params_t>(sec_params) {}
    GapSecParams(v8::Local<v8::Object> js) : BleToJs<ble_gap_sec_params_t>(js) {}
    v8::Local<v8::Object> ToJs();
    ble_gap_sec_params_t *ToNative();
};

class GapSecKdist : public BleToJs<ble_gap_sec_kdist_t>
{
public:
    GapSecKdist(ble_gap_sec_kdist_t *kdist) : BleToJs<ble_gap_sec_kdist_t>(kdist) {}
    GapSecKdist(v8::Local<v8::Object> js) : BleToJs<ble_gap_sec_kdist_t>(js) {}
    v8::Local<v8::Object> ToJs();
    ble_gap_sec_kdist_t *ToNative();
};

class GapSecKeyset : public BleToJs<ble_gap_sec_keyset_t>
{
public:
    GapSecKeyset(ble_gap_sec_keyset_t *keyset) : BleToJs<ble_gap_sec_keyset_t>(keyset) {}
    GapSecKeyset(v8::Local<v8::Object> js) : BleToJs<ble_gap_sec_keyset_t>(js) {}
    v8::Local<v8::Object> ToJs();
    ble_gap_sec_keyset_t *ToNative();
};

class GapSecKeys : public BleToJs<ble_gap_sec_keys_t>
{
public:
    GapSecKeys(ble_gap_sec_keys_t *keys) : BleToJs<ble_gap_sec_keys_t>(keys) {}
    GapSecKeys(v8::Local<v8::Object> js) : BleToJs<ble_gap_sec_keys_t>(js) {}
    v8::Local<v8::Object> ToJs();
    ble_gap_sec_keys_t *ToNative();
};

class GapIdKey : public BleToJs<ble_gap_id_key_t>
{
public:
    GapIdKey(ble_gap_id_key_t *id_key) : BleToJs<ble_gap_id_key_t>(id_key) {}
    GapIdKey(v8::Local<v8::Object> js) : BleToJs<ble_gap_id_key_t>(js) {}
    v8::Local<v8::Object> ToJs();
    ble_gap_id_key_t *ToNative();
};

class GapEncKey : public BleToJs<ble_gap_enc_key_t>
{
public:
    GapEncKey(ble_gap_enc_key_t *enc_key) : BleToJs<ble_gap_enc_key_t>(enc_key) {}
    GapEncKey(v8::Local<v8::Object> js) : BleToJs<ble_gap_enc_key_t>(js) {}
    v8::Local<v8::Object> ToJs();
    ble_gap_enc_key_t *ToNative();
};

class GapSignInfo : public BleToJs<ble_gap_sign_info_t>
{
public:
    GapSignInfo(ble_gap_sign_info_t *sign_info) : BleToJs<ble_gap_sign_info_t>(sign_info) {}
    GapSignInfo(v8::Local<v8::Object> js) : BleToJs<ble_gap_sign_info_t>(js) {}
    v8::Local<v8::Object> ToJs();
    ble_gap_sign_info_t  *ToNative();
};

class GapIrk : public BleToJs<ble_gap_irk_t>
{
public:
    GapIrk(ble_gap_irk_t *irk) : BleToJs<ble_gap_irk_t>(irk) {}
    GapIrk(v8::Local<v8::Object> js) : BleToJs<ble_gap_irk_t>(js) {}
    v8::Local<v8::Object> ToJs();
    ble_gap_irk_t *ToNative();
};

class GapEncInfo : public BleToJs<ble_gap_enc_info_t>
{
public:
    GapEncInfo(ble_gap_enc_info_t *enc_info) : BleToJs<ble_gap_enc_info_t>(enc_info) {}
    GapEncInfo(v8::Local<v8::Object> js) : BleToJs<ble_gap_enc_info_t>(js) {}
    v8::Local<v8::Object> ToJs();
    ble_gap_enc_info_t *ToNative();
};

class GapMasterId : public BleToJs<ble_gap_master_id_t>
{
public:
    GapMasterId(ble_gap_master_id_t *master_id) : BleToJs<ble_gap_master_id_t>(master_id) {}
    GapMasterId(v8::Local<v8::Object> js) : BleToJs<ble_gap_master_id_t>(js) {}
    v8::Local<v8::Object> ToJs();
    ble_gap_master_id_t *ToNative();
};

class GapSecLevels : public BleToJs<ble_gap_sec_levels_t>
{
public:
    GapSecLevels(ble_gap_sec_levels_t *sec_levels) : BleToJs<ble_gap_sec_levels_t>(sec_levels) {}
    GapSecLevels(v8::Local<v8::Object> js) : BleToJs<ble_gap_sec_levels_t>(js) {}
    v8::Local<v8::Object> ToJs();
    ble_gap_sec_levels_t *ToNative();
};

class GapConnSec : public BleToJs<ble_gap_conn_sec_t>
{
public:
    GapConnSec(ble_gap_conn_sec_t *conn_sec) : BleToJs<ble_gap_conn_sec_t>(conn_sec) {}
    GapConnSec(v8::Local<v8::Object> js) : BleToJs<ble_gap_conn_sec_t>(js) {}
    v8::Local<v8::Object> ToJs();
    ble_gap_conn_sec_t *ToNative();
};


// Gap structs -- END --


///// Start GAP Batons ////////////////////////////////////////////////////////////////////////////////

struct GapAddressSetBaton : Baton {
public:
    BATON_CONSTRUCTOR(GapAddressSetBaton);
    ble_gap_addr_t *address;
    uint8_t addr_cycle_mode;
};

struct GapAddressGetBaton : Baton {
public:
    BATON_CONSTRUCTOR(GapAddressGetBaton);
    ble_gap_addr_t *address;
};

struct StartScanBaton : public Baton {
public:
    BATON_CONSTRUCTOR(StartScanBaton);
    ble_gap_scan_params_t *scan_params;
};

struct StopScanBaton : public Baton {
public:
    BATON_CONSTRUCTOR(StopScanBaton);
};

struct TXPowerBaton : public Baton {
public:
    BATON_CONSTRUCTOR(TXPowerBaton);
    int8_t tx_power;
};

struct GapSetDeviceNameBaton : public Baton {
public:
    BATON_CONSTRUCTOR(GapSetDeviceNameBaton);
    ble_gap_conn_sec_mode_t *conn_sec_mode;
    uint8_t *dev_name;
    uint16_t length;
};

struct GapGetDeviceNameBaton : public Baton {
public:
    BATON_CONSTRUCTOR(GapGetDeviceNameBaton);
    uint8_t *dev_name;
    uint16_t length;
};

struct GapConnectBaton : public Baton {
public:
    BATON_CONSTRUCTOR(GapConnectBaton);
    ble_gap_addr_t *address;
    ble_gap_scan_params_t *scan_params;
    ble_gap_conn_params_t *conn_params;
};

struct GapConnectCancelBaton : public Baton {
public:
    BATON_CONSTRUCTOR(GapConnectCancelBaton);
};

struct GapDisconnectBaton : public Baton {
public:
    BATON_CONSTRUCTOR(GapDisconnectBaton);
    uint16_t conn_handle;
    uint8_t hci_status_code;
};

struct GapUpdateConnectionParametersBaton : public Baton {
public:
    BATON_CONSTRUCTOR(GapUpdateConnectionParametersBaton);
    BATON_DESTRUCTOR(GapUpdateConnectionParametersBaton) { delete connectionParameters; }
    uint16_t conn_handle;
    ble_gap_conn_params_t *connectionParameters;
};

struct GapStartRSSIBaton : public Baton {
public:
    BATON_CONSTRUCTOR(GapStartRSSIBaton);
    uint16_t conn_handle;
    uint8_t treshold_dbm;
    uint8_t skip_count;
};

struct GapStopRSSIBaton : public Baton {
public:
    BATON_CONSTRUCTOR(GapStopRSSIBaton);
    uint16_t conn_handle;
};

struct GapGetRSSIBaton : public Baton {
public:
    BATON_CONSTRUCTOR(GapGetRSSIBaton);
    uint16_t conn_handle;
    int8_t rssi;
};

struct GapStartAdvertisingBaton : public Baton {
public:
    BATON_CONSTRUCTOR(GapStartAdvertisingBaton);
    ble_gap_adv_params_t *p_adv_params;
};

struct GapStopAdvertisingBaton : public Baton {
public:
    BATON_CONSTRUCTOR(GapStopAdvertisingBaton);
};

struct GapSecParamsReplyBaton : public Baton {
public:
    BATON_CONSTRUCTOR(GapSecParamsReplyBaton);
    uint16_t conn_handle;
    uint8_t sec_status;
    ble_gap_sec_params_t *sec_params;
    ble_gap_sec_keyset_t *sec_keyset;
};

struct GapConnSecGetBaton : public Baton {
public:
    BATON_CONSTRUCTOR(GapConnSecGetBaton);
    uint16_t conn_handle;
    ble_gap_conn_sec_t *conn_sec;
};

struct GapEncryptBaton : public Baton {
public:
    BATON_CONSTRUCTOR(GapEncryptBaton);
    uint16_t conn_handle;
    ble_gap_master_id_t *master_id;
    ble_gap_enc_info_t *enc_info;
};

struct GapSecInfoReplyBaton : public Baton {
public:
    BATON_CONSTRUCTOR(GapSecInfoReplyBaton);
    uint16_t conn_handle;
    ble_gap_enc_info_t *enc_info;
    ble_gap_irk_t *id_info;
    ble_gap_sign_info_t *sign_info;
};

struct GapAuthenticateBaton : public Baton {
public:
    BATON_CONSTRUCTOR(GapAuthenticateBaton);
    uint16_t conn_handle;
    ble_gap_sec_params_t *p_sec_params;
};

struct GapSetAdvertisingDataBaton : public Baton {
public:
    BATON_CONSTRUCTOR(GapSetAdvertisingDataBaton);
    uint8_t *data;
    uint8_t dlen;
    uint8_t *sr_data;
    uint8_t srdlen;
};

struct GapSetPPCPBaton : public Baton {
public:
    BATON_CONSTRUCTOR(GapSetPPCPBaton);
    ble_gap_conn_params_t *p_conn_params;
};

struct GapGetPPCPBaton : public Baton {
public:
    BATON_CONSTRUCTOR(GapGetPPCPBaton);
    ble_gap_conn_params_t *p_conn_params;
};

struct GapSetAppearanceBaton : public Baton {
public:
    BATON_CONSTRUCTOR(GapSetAppearanceBaton);
    uint16_t appearance;
};

struct GapGetAppearanceBaton : public Baton {
public:
    BATON_CONSTRUCTOR(GapGetAppearanceBaton);
    uint16_t appearance;
};

///// End GAP Batons //////////////////////////////////////////////////////////////////////////////////

METHOD_DEFINITIONS(GapSetAddress);
METHOD_DEFINITIONS(GapGetAddress);
METHOD_DEFINITIONS(GapUpdateConnectionParameters);
METHOD_DEFINITIONS(GapDisconnect);
METHOD_DEFINITIONS(GapSetTXPower);
METHOD_DEFINITIONS(GapSetDeviceName);
METHOD_DEFINITIONS(GapGetDeviceName);
METHOD_DEFINITIONS(GapStartRSSI);
METHOD_DEFINITIONS(GapStopRSSI);
METHOD_DEFINITIONS(StartScan);
METHOD_DEFINITIONS(StopScan);
METHOD_DEFINITIONS(GapConnect);
METHOD_DEFINITIONS(GapCancelConnect);
METHOD_DEFINITIONS(GapGetRSSI);
METHOD_DEFINITIONS(GapStartAdvertising);
METHOD_DEFINITIONS(GapStopAdvertising);
METHOD_DEFINITIONS(GapSecParamsReply);
METHOD_DEFINITIONS(GapConnSecGet);
METHOD_DEFINITIONS(GapEncrypt);
METHOD_DEFINITIONS(GapSecInfoReply);
METHOD_DEFINITIONS(GapAuthenticate);
METHOD_DEFINITIONS(GapSetAdvertisingData);
METHOD_DEFINITIONS(GapSetPPCP);
METHOD_DEFINITIONS(GapGetPPCP);
METHOD_DEFINITIONS(GapSetAppearance);
METHOD_DEFINITIONS(GapGetAppearance);

extern "C" {
    void init_gap(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target);
}

#endif // DRIVER_GAP_H
