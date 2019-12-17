/* Copyright (c) 2010 - 2017, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Use in source and binary forms, redistribution in binary form only, with
 * or without modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions in binary form, except as embedded into a Nordic
 *    Semiconductor ASA integrated circuit in a product or a software update for
 *    such product, must reproduce the above copyright notice, this list of
 *    conditions and the following disclaimer in the documentation and/or other
 *    materials provided with the distribution.
 *
 * 2. Neither the name of Nordic Semiconductor ASA nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 *
 * 3. This software, with or without modification, must only be used with a Nordic
 *    Semiconductor ASA integrated circuit.
 *
 * 4. Any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

#ifndef BLE_DRIVER_JS_DRIVER_H
#define BLE_DRIVER_JS_DRIVER_H

#include <string>
#include <memory>

#include <sd_rpc.h>
#include "common.h"

#include "adapter.h"

extern adapter_t *connectedAdapters[];
extern int adapterCount;

static name_map_t common_event_name_map = {
#if NRF_SD_BLE_API_VERSION <= 3
    NAME_MAP_ENTRY(BLE_EVT_TX_COMPLETE),
#else
    NAME_MAP_ENTRY(BLE_GATTC_EVT_WRITE_CMD_TX_COMPLETE),
    NAME_MAP_ENTRY(BLE_GATTS_EVT_HVN_TX_COMPLETE),
#endif
    NAME_MAP_ENTRY(BLE_EVT_USER_MEM_REQUEST),
    NAME_MAP_ENTRY(BLE_EVT_USER_MEM_RELEASE),
};

NAN_INLINE sd_rpc_parity_t ToParityEnum(const v8::Handle<v8::String>& str);
NAN_INLINE sd_rpc_flow_control_t ToFlowControlEnum(const v8::Handle<v8::String>& str);
NAN_INLINE sd_rpc_log_severity_t ToLogSeverityEnum(const v8::Handle<v8::String>& str);

#pragma region Struct conversions

#if NRF_SD_BLE_API_VERSION == 2
class BandwidthCountParameters : public BleToJs<ble_conn_bw_count_t>
{
public:
    explicit BandwidthCountParameters(ble_conn_bw_count_t *countParamters) : BleToJs<ble_conn_bw_count_t>(countParamters) {}
    explicit BandwidthCountParameters(v8::Local<v8::Object> js) : BleToJs<ble_conn_bw_count_t>(js) {}
    virtual ~BandwidthCountParameters() {}

    v8::Local<v8::Object> ToJs() override;
    ble_conn_bw_count_t *ToNative() override;
};

class BandwidthGlobalMemoryPool : public BleToJs<ble_conn_bw_counts_t>
{
public:
    explicit BandwidthGlobalMemoryPool(ble_conn_bw_counts_t *enable_params) : BleToJs<ble_conn_bw_counts_t>(enable_params) {}
    explicit BandwidthGlobalMemoryPool(v8::Local<v8::Object> js) : BleToJs<ble_conn_bw_counts_t>(js) {}
    virtual ~BandwidthGlobalMemoryPool() {}

    v8::Local<v8::Object> ToJs() override;
    ble_conn_bw_counts_t *ToNative() override;
};

class CommonEnableParameters : public BleToJs<ble_common_enable_params_t>
{
public:
    explicit CommonEnableParameters(ble_common_enable_params_t *enable_params) : BleToJs<ble_common_enable_params_t>(enable_params) {}
    explicit CommonEnableParameters(v8::Local<v8::Object> js) : BleToJs<ble_common_enable_params_t>(js) {}
    virtual ~CommonEnableParameters() {}

    v8::Local<v8::Object> ToJs() override;
    ble_common_enable_params_t *ToNative() override;
};

#endif

class EnableParameters : public BleToJs<enable_ble_params_t>
{
public:
    explicit EnableParameters(enable_ble_params_t *enable_params) : BleToJs<enable_ble_params_t>(enable_params) {}
    explicit EnableParameters(v8::Local<v8::Object> js) : BleToJs<enable_ble_params_t>(js) {}
    virtual ~EnableParameters() {}

    v8::Local<v8::Object> ToJs() override;
    enable_ble_params_t *ToNative() override;
};

class Version : public BleToJs<ble_version_t>
{
public:
    explicit Version(ble_version_t *version) : BleToJs<ble_version_t>(version) {}
    explicit Version(v8::Local<v8::Object> js) : BleToJs<ble_version_t>(js) {}
    virtual ~Version() {}

    v8::Local<v8::Object> ToJs() override;
    ble_version_t *ToNative() override;
};

class UserMemBlock : public BleToJs<ble_user_mem_block_t>
{
public:
    explicit UserMemBlock(ble_user_mem_block_t *user_mem_block) : BleToJs<ble_user_mem_block_t>(user_mem_block) {}
    explicit UserMemBlock(v8::Local<v8::Object> js) : BleToJs<ble_user_mem_block_t>(js) {}
    virtual ~UserMemBlock() {}

    v8::Local<v8::Object> ToJs() override;
    ble_user_mem_block_t *ToNative() override;
};

class BleUUID : public BleToJs<ble_uuid_t>
{
public:
    explicit BleUUID(ble_uuid_t *uuid) : BleToJs<ble_uuid_t>(uuid) {}
    explicit BleUUID(v8::Local<v8::Object> js) : BleToJs<ble_uuid_t>(js) {}
    virtual ~BleUUID() {}

    v8::Local<v8::Object> ToJs() override;
    ble_uuid_t *ToNative() override;
};

class BleUUID128 : public BleToJs<ble_uuid128_t>
{
public:
    explicit BleUUID128(ble_uuid128_t *uuid) : BleToJs<ble_uuid128_t>(uuid) {}
    explicit BleUUID128(v8::Local<v8::Object> js) : BleToJs<ble_uuid128_t>(js) {}
    virtual ~BleUUID128() {}

    v8::Local<v8::Object> ToJs() override;
    ble_uuid128_t *ToNative() override;
};

class BleOpt : public BleToJs<ble_opt_t>
{
public:
    explicit BleOpt(ble_opt_t *ble_opt) : BleToJs<ble_opt_t>(ble_opt) {}
    explicit BleOpt(v8::Local<v8::Object> js) : BleToJs<ble_opt_t>(js) {}
    virtual ~BleOpt() {}

    //v8::Local<v8::Object> ToJs() override;
    ble_opt_t *ToNative() override;
};

#if NRF_SD_BLE_API_VERSION >= 5
class BleCfg : public BleToJs<ble_cfg_t>
{
public:
    explicit BleCfg(ble_cfg_t *ble_cfg) : BleToJs<ble_cfg_t>(ble_cfg) {}
    explicit BleCfg(v8::Local <v8::Object> js) : BleToJs<ble_cfg_t>(js) {}
    virtual ~BleCfg() {}

    ble_cfg_t *ToNative() override;
    ble_cfg_t *ToConnCfg();
    ble_cfg_t *ToCommonCfg();
    ble_cfg_t *ToGapCfg();
    ble_cfg_t *ToGattsCfgServiceChanged();
    ble_cfg_t *ToGattsCfgAttrTabSize();
};

#pragma region common_cfg
class BleCommonCfg : public BleToJs<ble_common_cfg_t>
{
public:
    explicit BleCommonCfg(ble_common_cfg_t *ble_common_cfg) : BleToJs<ble_common_cfg_t>(ble_common_cfg) {}
    explicit BleCommonCfg(v8::Local <v8::Object> js) : BleToJs<ble_common_cfg_t>(js) {}
    virtual ~BleCommonCfg() {}

    ble_common_cfg_t *ToNative() override;
};

class BleGapConnCfg : public BleToJs<ble_gap_conn_cfg_t>
{
public:
    explicit BleGapConnCfg(ble_gap_conn_cfg_t *ble_gap_conn_cfg) : BleToJs<ble_gap_conn_cfg_t>(ble_gap_conn_cfg) {}
    explicit BleGapConnCfg(v8::Local <v8::Object> js) : BleToJs<ble_gap_conn_cfg_t>(js) {}
    virtual ~BleGapConnCfg() {}

    ble_gap_conn_cfg_t *ToNative() override;
};

class BleCommonCfgVsUuid : public BleToJs<ble_common_cfg_vs_uuid_t>
{
public:
    explicit BleCommonCfgVsUuid(ble_common_cfg_vs_uuid_t *ble_common_cfg_vs_uuid) : BleToJs<ble_common_cfg_vs_uuid_t>(ble_common_cfg_vs_uuid) {}
    explicit BleCommonCfgVsUuid(v8::Local <v8::Object> js) : BleToJs<ble_common_cfg_vs_uuid_t>(js) {}
    virtual ~BleCommonCfgVsUuid() {}

    ble_common_cfg_vs_uuid_t *ToNative() override;
};
#pragma endregion common_cfg

#pragma region conn_cfg
class BleConnCfg : public BleToJs<ble_conn_cfg_t>
{
public:
    explicit BleConnCfg(ble_conn_cfg_t *ble_conn_cfg) : BleToJs<ble_conn_cfg_t>(ble_conn_cfg) {}
    explicit BleConnCfg(v8::Local <v8::Object> js) : BleToJs<ble_conn_cfg_t>(js) {}
    virtual ~BleConnCfg() {}

    ble_conn_cfg_t *ToNative() override;
};

class BleGattcConnCfg : public BleToJs<ble_gattc_conn_cfg_t>
{
public:
    explicit BleGattcConnCfg(ble_gattc_conn_cfg_t *ble_gattc_conn_cfg) : BleToJs<ble_gattc_conn_cfg_t>(ble_gattc_conn_cfg) {}
    explicit BleGattcConnCfg(v8::Local <v8::Object> js) : BleToJs<ble_gattc_conn_cfg_t>(js) {}
    virtual ~BleGattcConnCfg() {}

    ble_gattc_conn_cfg_t *ToNative() override;
};

class BleGattsConnCfg : public BleToJs<ble_gatts_conn_cfg_t>
{
public:
    explicit BleGattsConnCfg(ble_gatts_conn_cfg_t *ble_gatts_conn_cfg) : BleToJs<ble_gatts_conn_cfg_t>(ble_gatts_conn_cfg) {}
    explicit BleGattsConnCfg(v8::Local <v8::Object> js) : BleToJs<ble_gatts_conn_cfg_t>(js) {}
    virtual ~BleGattsConnCfg() {}

    ble_gatts_conn_cfg_t *ToNative() override;
};

class BleGattConnCfg : public BleToJs<ble_gatt_conn_cfg_t>
{
public:
    explicit BleGattConnCfg(ble_gatt_conn_cfg_t *ble_gatt_conn_cfg) : BleToJs<ble_gatt_conn_cfg_t>(ble_gatt_conn_cfg) {}
    explicit BleGattConnCfg(v8::Local <v8::Object> js) : BleToJs<ble_gatt_conn_cfg_t>(js) {}
    virtual ~BleGattConnCfg() {}

    ble_gatt_conn_cfg_t *ToNative() override;
};

class BleL2capConnCfg : public BleToJs<ble_l2cap_conn_cfg_t>
{
public:
    explicit BleL2capConnCfg(ble_l2cap_conn_cfg_t *ble_l2cap_conn_cfg) : BleToJs<ble_l2cap_conn_cfg_t>(ble_l2cap_conn_cfg) {}
    explicit BleL2capConnCfg(v8::Local <v8::Object> js) : BleToJs<ble_l2cap_conn_cfg_t>(js) {}
    virtual ~BleL2capConnCfg() {}

    ble_l2cap_conn_cfg_t *ToNative() override;
};

#pragma endregion conn_cfg

#pragma region gap_cfg
class BleGapCfg : public BleToJs<ble_gap_cfg_t>
{
public:
    explicit BleGapCfg(ble_gap_cfg_t *ble_gap_cfg) : BleToJs<ble_gap_cfg_t>(ble_gap_cfg) {}
    explicit BleGapCfg(v8::Local <v8::Object> js) : BleToJs<ble_gap_cfg_t>(js) {}
    virtual ~BleGapCfg() {}

    ble_gap_cfg_t *ToNative() override;
};

class BleGapCfgRoleCount : public BleToJs<ble_gap_cfg_role_count_t>
{
public:
    explicit BleGapCfgRoleCount(ble_gap_cfg_role_count_t *ble_gap_cfg_role_count) : BleToJs<ble_gap_cfg_role_count_t>(ble_gap_cfg_role_count) {}
    explicit BleGapCfgRoleCount(v8::Local <v8::Object> js) : BleToJs<ble_gap_cfg_role_count_t>(js) {}
    virtual ~BleGapCfgRoleCount() {}

    ble_gap_cfg_role_count_t *ToNative() override;
};

class BleGapCfgDeviceName : public BleToJs<ble_gap_cfg_device_name_t>
{
public:
    explicit BleGapCfgDeviceName(ble_gap_cfg_device_name_t *ble_gap_cfg_device_name) : BleToJs<ble_gap_cfg_device_name_t>(ble_gap_cfg_device_name) {}
    explicit BleGapCfgDeviceName(v8::Local <v8::Object> js) : BleToJs<ble_gap_cfg_device_name_t>(js) {}
    virtual ~BleGapCfgDeviceName() {}

    ble_gap_cfg_device_name_t *ToNative() override;
};

class BleGapConnSecMode : public BleToJs<ble_gap_conn_sec_mode_t>
{
public:
    explicit BleGapConnSecMode(ble_gap_conn_sec_mode_t *ble_gap_conn_sec_mode) : BleToJs<ble_gap_conn_sec_mode_t>(ble_gap_conn_sec_mode) {}
    explicit BleGapConnSecMode(v8::Local <v8::Object> js) : BleToJs<ble_gap_conn_sec_mode_t>(js) {}
    virtual ~BleGapConnSecMode() {}

    ble_gap_conn_sec_mode_t *ToNative() override;
};

class BleGattsCfg : public BleToJs<ble_gatts_cfg_t> {
public:
    explicit BleGattsCfg(ble_gatts_cfg_t *ble_gatts_cfg) : BleToJs<ble_gatts_cfg_t>(ble_gatts_cfg) {}
    explicit BleGattsCfg(v8::Local <v8::Object> js) : BleToJs<ble_gatts_cfg_t>(js) {}
    virtual ~BleGattsCfg() {}

    ble_gatts_cfg_t *ToNative() override;
};

class BleGattsCfgServiceChanged : public BleToJs<ble_gatts_cfg_service_changed_t> {
public:
    explicit BleGattsCfgServiceChanged(ble_gatts_cfg_service_changed_t *ble_gatts_cfg_service_changed) : BleToJs<ble_gatts_cfg_service_changed_t>(ble_gatts_cfg_service_changed) {}
    explicit BleGattsCfgServiceChanged(v8::Local <v8::Object> js) : BleToJs<ble_gatts_cfg_service_changed_t>(js) {}
    virtual ~BleGattsCfgServiceChanged() {}

    ble_gatts_cfg_service_changed_t *ToNative() override;
};

class BleGattsCfgAttrTabSize : public BleToJs<ble_gatts_cfg_attr_tab_size_t> {
public:
    explicit BleGattsCfgAttrTabSize(ble_gatts_cfg_attr_tab_size_t *ble_gatts_cfg_attr_tab_size) : BleToJs<ble_gatts_cfg_attr_tab_size_t>(ble_gatts_cfg_attr_tab_size) {}
    explicit BleGattsCfgAttrTabSize(v8::Local <v8::Object> js) : BleToJs<ble_gatts_cfg_attr_tab_size_t>(js) {}
    virtual ~BleGattsCfgAttrTabSize() {}

    ble_gatts_cfg_attr_tab_size_t *ToNative() override;
};

#pragma endregion gap_cfg

#endif // NRF_SD_BLE_API_VERSION >= 5

#pragma endregion Struct conversions

#pragma region BleDriverCommonEvent

template<typename EventType>
class BleDriverCommonEvent : public BleDriverEvent<EventType>
{
private:
    BleDriverCommonEvent() {}

public:
    BleDriverCommonEvent(uint16_t evt_id, std::string timestamp, uint16_t conn_handle, EventType *evt)
        : BleDriverEvent<EventType>(evt_id, timestamp, conn_handle, evt)
    {
    }

    virtual ~BleDriverCommonEvent() {};

    virtual void ToJs(v8::Local<v8::Object> obj) override
    {
        BleDriverEvent<EventType>::ToJs(obj);
    }

    virtual v8::Local<v8::Object> ToJs() override = 0;
    virtual EventType *ToNative() override { return new EventType(); }

    const char *getEventName() override { return ConversionUtility::valueToString(this->evt_id, common_event_name_map, "Unknown Common Event"); }
};

#if NRF_SD_BLE_API_VERSION <= 3
class CommonTXCompleteEvent : BleDriverCommonEvent<ble_evt_tx_complete_t>
{
public:
    CommonTXCompleteEvent(std::string timestamp, uint16_t conn_handle, ble_evt_tx_complete_t *evt)
        : BleDriverCommonEvent<ble_evt_tx_complete_t>(BLE_EVT_TX_COMPLETE, timestamp, conn_handle, evt) {}

    v8::Local<v8::Object> ToJs() override;
};
#endif

class CommonMemRequestEvent : BleDriverCommonEvent<ble_evt_user_mem_request_t>
{
public:
    CommonMemRequestEvent(std::string timestamp, uint16_t conn_handle, ble_evt_user_mem_request_t *evt)
        : BleDriverCommonEvent<ble_evt_user_mem_request_t>(BLE_EVT_USER_MEM_REQUEST, timestamp, conn_handle, evt) {}

    v8::Local<v8::Object> ToJs();
};

class CommonMemReleaseEvent : BleDriverCommonEvent<ble_evt_user_mem_release_t>
{
public:
    CommonMemReleaseEvent(std::string timestamp, uint16_t conn_handle, ble_evt_user_mem_release_t *evt)
        : BleDriverCommonEvent<ble_evt_user_mem_release_t>(BLE_EVT_USER_MEM_RELEASE, timestamp, conn_handle, evt) {}

    v8::Local<v8::Object> ToJs();
};

#pragma endregion BleDriverCommonEvent

#pragma region Batons

struct OpenBaton : public Baton
{
public:
    BATON_CONSTRUCTOR(OpenBaton);
    BATON_DESTRUCTOR(OpenBaton) {
        if (enable_ble_params) delete  enable_ble_params;
    }

    //char path[PATH_STRING_SIZE];
    std::string path;
    std::unique_ptr<Nan::Callback> event_callback; // Callback that is called for every event that is received from the SoftDevice
    std::unique_ptr<Nan::Callback> log_callback;   // Callback that is called for every log entry that is received from the SoftDevice
    std::unique_ptr<Nan::Callback> status_callback;   // Callback that is called for every status occuring in the pc-ble-driver

    sd_rpc_log_severity_t log_level;
    sd_rpc_log_handler_t log_handler;
    sd_rpc_evt_handler_t event_handler;

    uint32_t baud_rate;
    sd_rpc_flow_control_t flow_control;
    sd_rpc_parity_t parity;

    uint32_t evt_interval; // The interval in ms that the event queue is sent to NodeJS
    uint32_t retransmission_interval; // The interval between each retransmission of packet to target
    uint32_t response_timeout; // Duration to wait for reply on reliable packet sent to target

    bool enable_ble; // Enable BLE or not when connecting, if not the developer must enable the BLE when state is active

    enable_ble_params_t *enable_ble_params; // If enable BLE is true, then use these params when enabling BLE

    Adapter *mainObject;
};

struct CloseBaton : public Baton
{
public:
    BATON_CONSTRUCTOR(CloseBaton);
    Adapter *mainObject;
};

struct ConnResetBaton : public Baton
{
public:
    BATON_CONSTRUCTOR(ConnResetBaton);
    sd_rpc_reset_t reset;
    Adapter *mainObject;
};

struct EnableBLEBaton : public Baton
{
public:
    BATON_CONSTRUCTOR(EnableBLEBaton);
    BATON_DESTRUCTOR(EnableBLEBaton) {
        if (enable_ble_params) delete  enable_ble_params;
    }

    enable_ble_params_t *enable_ble_params;
};


struct GetVersionBaton : public Baton
{
public:
    BATON_CONSTRUCTOR(GetVersionBaton);
    BATON_DESTRUCTOR(GetVersionBaton) { delete version; }
    ble_version_t *version;

};

class BleAddVendorSpcificUUIDBaton : public Baton
{
public:
    BATON_CONSTRUCTOR(BleAddVendorSpcificUUIDBaton);
    BATON_DESTRUCTOR(BleAddVendorSpcificUUIDBaton) { delete p_vs_uuid; }
    ble_uuid128_t *p_vs_uuid;
    uint8_t p_uuid_type;
};

class BleUUIDEncodeBaton : public Baton
{
public:
    BATON_CONSTRUCTOR(BleUUIDEncodeBaton);
    BATON_DESTRUCTOR(BleUUIDEncodeBaton)
    {
        delete p_uuid;
        delete uuid_le;
    }
    ble_uuid_t *p_uuid;
    uint8_t uuid_le_len;
    uint8_t *uuid_le;
};

class BleUUIDDecodeBaton : public Baton
{
public:
    BATON_CONSTRUCTOR(BleUUIDDecodeBaton);
    BATON_DESTRUCTOR(BleUUIDDecodeBaton)
    {
        delete p_uuid;
    }
    uint8_t uuid_le_len;
    ble_uuid_t *p_uuid;
    std::vector<uint8_t> uuid_le;
};

class BleUserMemReplyBaton : public Baton
{
public:
    BATON_CONSTRUCTOR(BleUserMemReplyBaton);
    BATON_DESTRUCTOR(BleUserMemReplyBaton)
    {
        free(p_block->p_mem);
        delete p_block;
    }
    uint16_t conn_handle;
    ble_user_mem_block_t *p_block;
};

class BleOptionBaton : public Baton
{
public:
    BATON_CONSTRUCTOR(BleOptionBaton);
    BATON_DESTRUCTOR(BleOptionBaton) { delete p_opt; }
    uint32_t opt_id;
    ble_opt_t *p_opt;
};

#if NRF_SD_BLE_API_VERSION >= 5
class BleConfigBaton : public Baton
{
public:
    BATON_CONSTRUCTOR(BleConfigBaton);
    BATON_DESTRUCTOR(BleConfigBaton) { delete p_cfg; }
    uint32_t cfg_id;
    ble_cfg_t *p_cfg;
};
#endif

#pragma endregion Batons


#endif //BLE_DRIVER_JS_DRIVER_H
