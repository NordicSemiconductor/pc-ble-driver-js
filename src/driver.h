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
    NAME_MAP_ENTRY(BLE_EVT_TX_COMPLETE),
    NAME_MAP_ENTRY(BLE_EVT_USER_MEM_REQUEST),
    NAME_MAP_ENTRY(BLE_EVT_USER_MEM_RELEASE),
#if NRF_SD_BLE_API_VERSION >= 3
    NAME_MAP_ENTRY(BLE_EVT_DATA_LENGTH_CHANGED),
#endif
};

NAN_INLINE sd_rpc_parity_t ToParityEnum(const v8::Handle<v8::String>& str);
NAN_INLINE sd_rpc_flow_control_t ToFlowControlEnum(const v8::Handle<v8::String>& str);
NAN_INLINE sd_rpc_log_severity_t ToLogSeverityEnum(const v8::Handle<v8::String>& str);

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

class EnableParameters : public BleToJs<ble_enable_params_t>
{
public:
    explicit EnableParameters(ble_enable_params_t *enable_params) : BleToJs<ble_enable_params_t>(enable_params) {}
    explicit EnableParameters(v8::Local<v8::Object> js) : BleToJs<ble_enable_params_t>(js) {}
    virtual ~EnableParameters() {}

    v8::Local<v8::Object> ToJs() override;
    ble_enable_params_t *ToNative() override;
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

class CommonTXCompleteEvent : BleDriverCommonEvent<ble_evt_tx_complete_t>
{
public:
    CommonTXCompleteEvent(std::string timestamp, uint16_t conn_handle, ble_evt_tx_complete_t *evt)
        : BleDriverCommonEvent<ble_evt_tx_complete_t>(BLE_EVT_TX_COMPLETE, timestamp, conn_handle, evt) {}

    v8::Local<v8::Object> ToJs() override;
};

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

#if NRF_SD_BLE_API_VERSION >= 3
class CommonDataLengthChangedEvent : BleDriverCommonEvent<ble_evt_data_length_changed_t>
{
public:
    CommonDataLengthChangedEvent(std::string timestamp, uint16_t conn_handle, ble_evt_data_length_changed_t *evt)
        : BleDriverCommonEvent<ble_evt_data_length_changed_t>(BLE_EVT_DATA_LENGTH_CHANGED, timestamp, conn_handle, evt) {}

    v8::Local<v8::Object> ToJs();
};
#endif

#pragma endregion BleDriverCommonEvent

///// Start Batons ////////////////////////////////////////

struct OpenBaton : public Baton
{
public:
    BATON_CONSTRUCTOR(OpenBaton)
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
    ble_enable_params_t *ble_enable_params; // If enable BLE is true, then use these params when enabling BLE

    Adapter *mainObject;
};

struct CloseBaton : public Baton
{
public:
    BATON_CONSTRUCTOR(CloseBaton)
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
    BATON_DESTRUCTOR(EnableBLEBaton) { delete enable_params; }
    ble_enable_params_t *enable_params;
    uint32_t app_ram_base;
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
        delete uuid_le;
    }
    uint8_t uuid_le_len;
    ble_uuid_t *p_uuid;
    uint8_t *uuid_le;
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

///// End Batons ////////////////////////////////////////


#endif //BLE_DRIVER_JS_DRIVER_H
