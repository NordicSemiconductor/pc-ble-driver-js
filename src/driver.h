/*
 * Copyright (c) 2016 Nordic Semiconductor ASA
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 *   1. Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 *
 *   2. Redistributions in binary form must reproduce the above copyright notice, this
 *   list of conditions and the following disclaimer in the documentation and/or
 *   other materials provided with the distribution.
 *
 *   3. Neither the name of Nordic Semiconductor ASA nor the names of other
 *   contributors to this software may be used to endorse or promote products
 *   derived from this software without specific prior written permission.
 *
 *   4. This software must only be used in or with a processor manufactured by Nordic
 *   Semiconductor ASA, or in or with a processor manufactured by a third party that
 *   is used in combination with a processor manufactured by Nordic Semiconductor.
 *
 *   5. Any software provided in binary or object form under this license must not be
 *   reverse engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

#ifndef BLE_DRIVER_JS_DRIVER_H
#define BLE_DRIVER_JS_DRIVER_H

#include <string>

#include <sd_rpc.h>
#include "common.h"

#include "adapter.h"

extern adapter_t *connectedAdapters[];
extern int adapterCount;

static name_map_t common_event_name_map = {
    NAME_MAP_ENTRY(BLE_EVT_TX_COMPLETE),
    NAME_MAP_ENTRY(BLE_EVT_USER_MEM_REQUEST),
    NAME_MAP_ENTRY(BLE_EVT_USER_MEM_RELEASE),
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


///// Start Batons ////////////////////////////////////////

struct OpenBaton : public Baton {
public:
    BATON_CONSTRUCTOR(OpenBaton)
    //char path[PATH_STRING_SIZE];
    std::string path;
    Nan::Callback *event_callback; // Callback that is called for every event that is received from the SoftDevice
    Nan::Callback *log_callback;   // Callback that is called for every log entry that is received from the SoftDevice
    Nan::Callback *status_callback;   // Callback that is called for every status occuring in the pc-ble-driver

    sd_rpc_log_severity_t log_level;
    sd_rpc_log_handler_t log_handler;
    sd_rpc_evt_handler_t event_handler;

    uint32_t baud_rate;
    sd_rpc_flow_control_t flow_control;
    sd_rpc_parity_t parity;

    uint32_t evt_interval; // The interval in ms that the event queue is sent to NodeJS
    uint32_t retransmission_interval; // The interval between each retransmission of packet to target
    uint32_t response_timeout; // Duration to wait for reply on reliable packet sent to target

    bool enable_ble; // Enable BLE or not when connecting, if not the developer must enable the the BLE when state is active

    Adapter *mainObject;
};

struct CloseBaton : public Baton {
public:
    BATON_CONSTRUCTOR(CloseBaton)
    Adapter *mainObject;
};

struct EnableBLEBaton : public Baton {
public:
    BATON_CONSTRUCTOR(EnableBLEBaton)
    ble_enable_params_t *enable_params;
    uint32_t app_ram_base;
};


struct GetVersionBaton : public Baton {
public:
    BATON_CONSTRUCTOR(GetVersionBaton);
    ble_version_t *version;

};

class BleAddVendorSpcificUUIDBaton : public Baton {
public:
    BATON_CONSTRUCTOR(BleAddVendorSpcificUUIDBaton);
    ble_uuid128_t *p_vs_uuid;
    uint8_t p_uuid_type;
};

class BleUUIDEncodeBaton : public Baton {
public:
    BATON_CONSTRUCTOR(BleUUIDEncodeBaton);
    ble_uuid_t *p_uuid;
    uint8_t uuid_le_len;
    uint8_t *uuid_le;
};

class BleUUIDDecodeBaton : public Baton {
public:
    BATON_CONSTRUCTOR(BleUUIDDecodeBaton);
    uint8_t uuid_le_len;
    ble_uuid_t *p_uuid;
    uint8_t *uuid_le;
};

class BleUserMemReplyBaton : public Baton {
public:
    BATON_CONSTRUCTOR(BleUserMemReplyBaton);
    uint16_t conn_handle;
    ble_user_mem_block_t *p_block;
};

///// End Batons ////////////////////////////////////////


#endif //BLE_DRIVER_JS_DRIVER_H
