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

#include "common.h"
#include "driver_gap.h"

#include <cstdlib>
#include <cstdio>
#include <mutex>
#include <memory>

// stdout for debugging
#include <iostream>

#include "adapter.h"

extern adapter_t *connectedAdapters[];
extern int adapterCount;

#define UUID_16_BIT_STR_SIZE 4
#define UUID_128_BIT_STR_SIZE 36
#define UUID_16_BIT_SPRINTF "%04X"
#define UUID_128_BIT_SPRINTF "%04X%04X-0000-1000-8000-00805F9B34FB"
#define UUID_128_BIT_COMPLETE_SPRINTF "%04X%04X-%04X-%04X-%04X-%04X%04X%04X"

#pragma region Name Map entries to enable constants (value and name) from C in JavaScript

static name_map_t gap_adv_type_map =
{
    NAME_MAP_ENTRY(BLE_GAP_ADV_TYPE_ADV_IND),
    NAME_MAP_ENTRY(BLE_GAP_ADV_TYPE_ADV_DIRECT_IND),
    NAME_MAP_ENTRY(BLE_GAP_ADV_TYPE_ADV_SCAN_IND),
    NAME_MAP_ENTRY(BLE_GAP_ADV_TYPE_ADV_NONCONN_IND)
};

static name_map_t gap_role_map =
{
    NAME_MAP_ENTRY(BLE_GAP_ROLE_INVALID),
    NAME_MAP_ENTRY(BLE_GAP_ROLE_PERIPH),
    NAME_MAP_ENTRY(BLE_GAP_ROLE_CENTRAL)
};

static name_map_t gap_timeout_sources_map =
{
    NAME_MAP_ENTRY(BLE_GAP_TIMEOUT_SRC_ADVERTISING),
    NAME_MAP_ENTRY(BLE_GAP_TIMEOUT_SRC_SECURITY_REQUEST),
    NAME_MAP_ENTRY(BLE_GAP_TIMEOUT_SRC_SCAN),
    NAME_MAP_ENTRY(BLE_GAP_TIMEOUT_SRC_CONN)
};

static name_map_t gap_addr_type_map =
{
    NAME_MAP_ENTRY(BLE_GAP_ADDR_TYPE_PUBLIC),
    NAME_MAP_ENTRY(BLE_GAP_ADDR_TYPE_RANDOM_STATIC),
    NAME_MAP_ENTRY(BLE_GAP_ADDR_TYPE_RANDOM_PRIVATE_RESOLVABLE),
    NAME_MAP_ENTRY(BLE_GAP_ADDR_TYPE_RANDOM_PRIVATE_NON_RESOLVABLE)
};

static name_map_t gap_adv_flags_map =
{
    NAME_MAP_ENTRY(BLE_GAP_ADV_FLAG_LE_LIMITED_DISC_MODE),
    NAME_MAP_ENTRY(BLE_GAP_ADV_FLAG_LE_GENERAL_DISC_MODE),
    NAME_MAP_ENTRY(BLE_GAP_ADV_FLAG_BR_EDR_NOT_SUPPORTED),
    NAME_MAP_ENTRY(BLE_GAP_ADV_FLAG_LE_BR_EDR_CONTROLLER),
    NAME_MAP_ENTRY(BLE_GAP_ADV_FLAG_LE_BR_EDR_HOST),
    NAME_MAP_ENTRY(BLE_GAP_ADV_FLAGS_LE_ONLY_LIMITED_DISC_MODE),
    NAME_MAP_ENTRY(BLE_GAP_ADV_FLAGS_LE_ONLY_GENERAL_DISC_MODE)
};

static name_map_t gap_ad_type_map =
{
    NAME_MAP_ENTRY(BLE_GAP_AD_TYPE_FLAGS),
    NAME_MAP_ENTRY(BLE_GAP_AD_TYPE_16BIT_SERVICE_UUID_MORE_AVAILABLE),
    NAME_MAP_ENTRY(BLE_GAP_AD_TYPE_16BIT_SERVICE_UUID_COMPLETE),
    NAME_MAP_ENTRY(BLE_GAP_AD_TYPE_32BIT_SERVICE_UUID_MORE_AVAILABLE),
    NAME_MAP_ENTRY(BLE_GAP_AD_TYPE_32BIT_SERVICE_UUID_COMPLETE),
    NAME_MAP_ENTRY(BLE_GAP_AD_TYPE_128BIT_SERVICE_UUID_MORE_AVAILABLE),
    NAME_MAP_ENTRY(BLE_GAP_AD_TYPE_128BIT_SERVICE_UUID_COMPLETE),
    NAME_MAP_ENTRY(BLE_GAP_AD_TYPE_SHORT_LOCAL_NAME),
    NAME_MAP_ENTRY(BLE_GAP_AD_TYPE_COMPLETE_LOCAL_NAME),
    NAME_MAP_ENTRY(BLE_GAP_AD_TYPE_TX_POWER_LEVEL),
    NAME_MAP_ENTRY(BLE_GAP_AD_TYPE_CLASS_OF_DEVICE),
    NAME_MAP_ENTRY(BLE_GAP_AD_TYPE_SIMPLE_PAIRING_HASH_C),
    NAME_MAP_ENTRY(BLE_GAP_AD_TYPE_SIMPLE_PAIRING_RANDOMIZER_R),
    NAME_MAP_ENTRY(BLE_GAP_AD_TYPE_SECURITY_MANAGER_TK_VALUE),
    NAME_MAP_ENTRY(BLE_GAP_AD_TYPE_SECURITY_MANAGER_OOB_FLAGS),
    NAME_MAP_ENTRY(BLE_GAP_AD_TYPE_SLAVE_CONNECTION_INTERVAL_RANGE),
    NAME_MAP_ENTRY(BLE_GAP_AD_TYPE_SOLICITED_SERVICE_UUIDS_16BIT),
    NAME_MAP_ENTRY(BLE_GAP_AD_TYPE_SOLICITED_SERVICE_UUIDS_128BIT),
    NAME_MAP_ENTRY(BLE_GAP_AD_TYPE_SERVICE_DATA),
    NAME_MAP_ENTRY(BLE_GAP_AD_TYPE_PUBLIC_TARGET_ADDRESS),
    NAME_MAP_ENTRY(BLE_GAP_AD_TYPE_RANDOM_TARGET_ADDRESS),
    NAME_MAP_ENTRY(BLE_GAP_AD_TYPE_APPEARANCE),
    NAME_MAP_ENTRY(BLE_GAP_AD_TYPE_ADVERTISING_INTERVAL),
    NAME_MAP_ENTRY(BLE_GAP_AD_TYPE_LE_BLUETOOTH_DEVICE_ADDRESS),
    NAME_MAP_ENTRY(BLE_GAP_AD_TYPE_LE_ROLE),
    NAME_MAP_ENTRY(BLE_GAP_AD_TYPE_SIMPLE_PAIRING_HASH_C256),
    NAME_MAP_ENTRY(BLE_GAP_AD_TYPE_SIMPLE_PAIRING_RANDOMIZER_R256),
    NAME_MAP_ENTRY(BLE_GAP_AD_TYPE_SERVICE_DATA_32BIT_UUID),
    NAME_MAP_ENTRY(BLE_GAP_AD_TYPE_SERVICE_DATA_128BIT_UUID),
    NAME_MAP_ENTRY(BLE_GAP_AD_TYPE_3D_INFORMATION_DATA),
    NAME_MAP_ENTRY(BLE_GAP_AD_TYPE_MANUFACTURER_SPECIFIC_DATA)
};

static name_map_t gap_io_caps_map =
{
    NAME_MAP_ENTRY(BLE_GAP_IO_CAPS_DISPLAY_ONLY),
    NAME_MAP_ENTRY(BLE_GAP_IO_CAPS_DISPLAY_YESNO),
    NAME_MAP_ENTRY(BLE_GAP_IO_CAPS_KEYBOARD_ONLY),
    NAME_MAP_ENTRY(BLE_GAP_IO_CAPS_NONE),
    NAME_MAP_ENTRY(BLE_GAP_IO_CAPS_KEYBOARD_DISPLAY)
};

static name_map_t gap_sec_status_map =
{
    NAME_MAP_ENTRY(BLE_GAP_SEC_STATUS_SUCCESS),
    NAME_MAP_ENTRY(BLE_GAP_SEC_STATUS_TIMEOUT),
    NAME_MAP_ENTRY(BLE_GAP_SEC_STATUS_PDU_INVALID),
    NAME_MAP_ENTRY(BLE_GAP_SEC_STATUS_RFU_RANGE1_BEGIN),
    NAME_MAP_ENTRY(BLE_GAP_SEC_STATUS_RFU_RANGE1_END),
    NAME_MAP_ENTRY(BLE_GAP_SEC_STATUS_PASSKEY_ENTRY_FAILED),
    NAME_MAP_ENTRY(BLE_GAP_SEC_STATUS_OOB_NOT_AVAILABLE),
    NAME_MAP_ENTRY(BLE_GAP_SEC_STATUS_AUTH_REQ),
    NAME_MAP_ENTRY(BLE_GAP_SEC_STATUS_CONFIRM_VALUE),
    NAME_MAP_ENTRY(BLE_GAP_SEC_STATUS_PAIRING_NOT_SUPP),
    NAME_MAP_ENTRY(BLE_GAP_SEC_STATUS_ENC_KEY_SIZE),
    NAME_MAP_ENTRY(BLE_GAP_SEC_STATUS_SMP_CMD_UNSUPPORTED),
    NAME_MAP_ENTRY(BLE_GAP_SEC_STATUS_UNSPECIFIED),
    NAME_MAP_ENTRY(BLE_GAP_SEC_STATUS_REPEATED_ATTEMPTS),
    NAME_MAP_ENTRY(BLE_GAP_SEC_STATUS_INVALID_PARAMS),
    NAME_MAP_ENTRY(BLE_GAP_SEC_STATUS_DHKEY_FAILURE),
    NAME_MAP_ENTRY(BLE_GAP_SEC_STATUS_NUM_COMP_FAILURE),
    NAME_MAP_ENTRY(BLE_GAP_SEC_STATUS_BR_EDR_IN_PROG),
    NAME_MAP_ENTRY(BLE_GAP_SEC_STATUS_X_TRANS_KEY_DISALLOWED),
    NAME_MAP_ENTRY(BLE_GAP_SEC_STATUS_RFU_RANGE2_BEGIN),
    NAME_MAP_ENTRY(BLE_GAP_SEC_STATUS_RFU_RANGE2_END)
};

static name_map_t gap_sec_status_sources_map =
{
    NAME_MAP_ENTRY(BLE_GAP_SEC_STATUS_SOURCE_LOCAL),
    NAME_MAP_ENTRY(BLE_GAP_SEC_STATUS_SOURCE_REMOTE)
};

static name_map_t gap_kp_not_types =
{
    NAME_MAP_ENTRY(BLE_GAP_KP_NOT_TYPE_PASSKEY_START),
    NAME_MAP_ENTRY(BLE_GAP_KP_NOT_TYPE_PASSKEY_DIGIT_IN),
    NAME_MAP_ENTRY(BLE_GAP_KP_NOT_TYPE_PASSKEY_DIGIT_OUT),
    NAME_MAP_ENTRY(BLE_GAP_KP_NOT_TYPE_PASSKEY_CLEAR),
    NAME_MAP_ENTRY(BLE_GAP_KP_NOT_TYPE_PASSKEY_END)
};

static name_map_t gap_auth_key_types =
{
    NAME_MAP_ENTRY(BLE_GAP_AUTH_KEY_TYPE_NONE),
    NAME_MAP_ENTRY(BLE_GAP_AUTH_KEY_TYPE_PASSKEY),
    NAME_MAP_ENTRY(BLE_GAP_AUTH_KEY_TYPE_OOB)
};

#pragma endregion Name Map entries to enable constants (value and name) from C in JavaScript

#pragma region Conversion methods to/from JavaScript/C++
#pragma region GapEnableParameters

v8::Local<v8::Object> GapEnableParameters::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();

    Utility::Set(obj, "periph_conn_count", native->periph_conn_count);
    Utility::Set(obj, "central_conn_count", native->central_conn_count);
    Utility::Set(obj, "central_sec_count", native->central_sec_count);

    return scope.Escape(obj);
}

ble_gap_enable_params_t *GapEnableParameters::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto enable_params = new ble_gap_enable_params_t();

    enable_params->periph_conn_count = ConversionUtility::getNativeUint8(jsobj, "periph_conn_count");
    enable_params->central_conn_count = ConversionUtility::getNativeUint8(jsobj, "central_conn_count");
    enable_params->central_sec_count = ConversionUtility::getNativeUint8(jsobj, "central_sec_count");

    return enable_params;
}

#pragma endregion GapEnableParameters

#pragma region GapAddr

v8::Local<v8::Object> GapAddr::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();

    // Create a text string of the address. The when the NanUtf8String string is out of
    // its scope, the underlaying string is freed.

    size_t addr_len = BLE_GAP_ADDR_LEN * 3; // Each byte -> 2 chars, : separator _between_ each byte and a null termination byte
    auto addr = static_cast<char*>(malloc(addr_len));
    assert(addr != NULL);
    uint8_t *ptr = native->addr;

    sprintf(addr, "%02X:%02X:%02X:%02X:%02X:%02X", ptr[5], ptr[4], ptr[3], ptr[2], ptr[1], ptr[0]);

    Utility::Set(obj, "address", addr);
    Utility::Set(obj, "type", ConversionUtility::valueToJsString(native->addr_type, gap_addr_type_map));

#if NRF_SD_BLE_API_VERSION >= 3
    Utility::Set(obj, "addr_id_peer", native->addr_id_peer);
#endif

    free(addr);

    return scope.Escape(obj);
}

ble_gap_addr_t *GapAddr::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto address = new ble_gap_addr_t();

    uint32_t ptr[BLE_GAP_ADDR_LEN];

    v8::Local<v8::Value> getAddress = Utility::Get(jsobj, "address");
    v8::Local<v8::String> addressString = getAddress->ToString();
    size_t addr_len = addressString->Length() + 1;
    auto addr = static_cast<char*>(malloc(addr_len));
    assert(addr != NULL);
    addressString->WriteUtf8(addr, addr_len);

    auto scan_count = sscanf(addr, "%2x:%2x:%2x:%2x:%2x:%2x", &(ptr[5]), &(ptr[4]), &(ptr[3]), &(ptr[2]), &(ptr[1]), &(ptr[0]));
    assert(scan_count == 6);

    free(addr);

    for (auto i = 0; i < BLE_GAP_ADDR_LEN; i++)
    {
        address->addr[i] = static_cast<uint8_t>(ptr[i]);
    }

    v8::Local<v8::Value> getAddressType = Utility::Get(jsobj, "type");
    v8::Local<v8::String> addressTypeString = getAddressType->ToString();
    size_t type_len = addressTypeString->Length() + 1;
    auto typeString = static_cast<char *>(malloc(type_len));
    addressTypeString->WriteUtf8(typeString, type_len);
    address->addr_type = static_cast<uint8_t>(fromNameToValue(gap_addr_type_map, typeString));

    free(typeString);

    return address;
}

#pragma endregion GapAddr

#pragma region GapConnParams

v8::Local<v8::Object> GapConnParams::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();

    Utility::Set(obj, "min_conn_interval", ConversionUtility::unitsToMsecs(native->min_conn_interval, ConversionUtility::ConversionUnit1250ms));
    Utility::Set(obj, "max_conn_interval", ConversionUtility::unitsToMsecs(native->max_conn_interval, ConversionUtility::ConversionUnit1250ms));
    Utility::Set(obj, "slave_latency", native->slave_latency);
    Utility::Set(obj, "conn_sup_timeout", ConversionUtility::unitsToMsecs(native->conn_sup_timeout, ConversionUtility::ConversionUnit10s));

    return scope.Escape(obj);
}

ble_gap_conn_params_t *GapConnParams::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto conn_params = new ble_gap_conn_params_t();
    memset(conn_params, 0, sizeof(ble_gap_conn_params_t));

    conn_params->min_conn_interval = ConversionUtility::msecsToUnitsUint16(jsobj, "min_conn_interval", ConversionUtility::ConversionUnit1250ms);
    conn_params->max_conn_interval = ConversionUtility::msecsToUnitsUint16(jsobj, "max_conn_interval", ConversionUtility::ConversionUnit1250ms);
    conn_params->slave_latency = ConversionUtility::getNativeUint16(jsobj, "slave_latency");
    conn_params->conn_sup_timeout = ConversionUtility::msecsToUnitsUint16(jsobj, "conn_sup_timeout", ConversionUtility::ConversionUnit10s);

    return conn_params;
}

#pragma endregion GapConnParams

#pragma region GapConnSecMode

v8::Local<v8::Object> GapConnSecMode::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Utility::Set(obj, "sm", native->sm);
    Utility::Set(obj, "lv", native->lv);
    return scope.Escape(obj);
}


ble_gap_conn_sec_mode_t *GapConnSecMode::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto conn_sec_mode = new ble_gap_conn_sec_mode_t();

    conn_sec_mode->sm = ConversionUtility::getNativeUint8(jsobj, "sm");
    conn_sec_mode->lv = ConversionUtility::getNativeUint8(jsobj, "lv");

    return conn_sec_mode;
}

#pragma endregion GapConnSecMode

#pragma region GapConnSec

v8::Local<v8::Object> GapConnSec::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Utility::Set(obj, "sec_mode", GapConnSecMode(&(native->sec_mode)).ToJs());
    Utility::Set(obj, "encr_key_size", native->encr_key_size);
    return scope.Escape(obj);
}

ble_gap_conn_sec_t *GapConnSec::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto conn_sec = new ble_gap_conn_sec_t();
    memset(conn_sec, 0, sizeof(ble_gap_conn_sec_t));

    conn_sec->sec_mode = GapConnSecMode(ConversionUtility::getJsObject(jsobj, "sec_mode"));
    conn_sec->encr_key_size = ConversionUtility::getNativeUint8(jsobj, "encr_key_size");

    return conn_sec;
}

#pragma endregion GapConnSec

#pragma region GapOpt

ble_gap_opt_t *GapOpt::ToNative()
{
    auto gap_opt = new ble_gap_opt_t();
    memset(gap_opt, 0, sizeof(ble_gap_opt_t));

    if (Utility::Has(jsobj, "scan_req_report"))
    {
        auto scan_req_obj = ConversionUtility::getJsObject(jsobj, "scan_req_report");
        gap_opt->scan_req_report = GapOptScanReqReport(scan_req_obj);
    }
#if NRF_SD_BLE_API_VERSION >= 3
    else if (Utility::Has(jsobj, "ext_len"))
    {
        auto ext_len_obj = ConversionUtility::getJsObject(jsobj, "ext_len");
        gap_opt->ext_len = GapOptExtLen(ext_len_obj);
    }
#endif
    //TODO: Add rest of gap_opt types

    return gap_opt;
}

#pragma endregion GapOpt

#pragma region GapOptExtLen

#if NRF_SD_BLE_API_VERSION >= 3

ble_gap_opt_ext_len_t *GapOptExtLen::ToNative()
{
    auto ext_len = new ble_gap_opt_ext_len_t();
    memset(ext_len, 0, sizeof(ble_gap_opt_ext_len_t));

    ext_len->rxtx_max_pdu_payload_size = ConversionUtility::getNativeUint8(jsobj, "rxtx_max_pdu_payload_size");

    return ext_len;
}
#endif

#pragma endregion GapOptExtLen

#pragma region GapOptScanReqReport

ble_gap_opt_scan_req_report_t *GapOptScanReqReport::ToNative()
{
    auto req_report_opt = new ble_gap_opt_scan_req_report_t();
    memset(req_report_opt, 0, sizeof(ble_gap_opt_scan_req_report_t));

    req_report_opt->enable = ConversionUtility::getNativeBool(jsobj, "enable");

    return req_report_opt;
}

#pragma endregion GapOptScanReqReport

#pragma region GapIrk

v8::Local<v8::Object> GapIrk::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Utility::Set(obj, "irk", ConversionUtility::toJsValueArray(native->irk, BLE_GAP_SEC_KEY_LEN));
    return scope.Escape(obj);
}

ble_gap_irk_t *GapIrk::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto irk = new ble_gap_irk_t();
    memset(irk, 0, sizeof(ble_gap_irk_t));

    auto p_irk = ConversionUtility::getNativePointerToUint8(jsobj, "irk");

    for (auto i = 0; i < BLE_GAP_SEC_KEY_LEN; i++)
    {
        irk->irk[i] = p_irk[i];
    }
    free(p_irk);

    return irk;
}

#pragma endregion GapIrk

#pragma region GapAdvChannelMask

v8::Local<v8::Object> GapAdvChannelMask::ToJs()
{
    Nan::EscapableHandleScope scope;
    // Channel Mask are never retrieved from driver.
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    return scope.Escape(obj);
}

ble_gap_adv_ch_mask_t *GapAdvChannelMask::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto mask = new ble_gap_adv_ch_mask_t();
    memset(mask, 0, sizeof(ble_gap_adv_ch_mask_t));

    mask->ch_37_off = ConversionUtility::getNativeBool(jsobj, "ch_37_off");
    mask->ch_38_off = ConversionUtility::getNativeBool(jsobj, "ch_38_off");
    mask->ch_39_off = ConversionUtility::getNativeBool(jsobj, "ch_39_off");

    return mask;
}

#pragma endregion GapAdvChannelMask

#pragma region GapAdvParams

v8::Local<v8::Object> GapAdvParams::ToJs()
{
    Nan::EscapableHandleScope scope;
    // Advertisement parameters are never retrieved from driver.
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    return scope.Escape(obj);
}

ble_gap_adv_params_t *GapAdvParams::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto params = new ble_gap_adv_params_t();
    memset(params, 0, sizeof(ble_gap_adv_params_t));

    params->type = ConversionUtility::getNativeUint8(jsobj, "type");
    // TODO: Add p_peer_addr
    // params->p_peer_addr = ;
    params->fp = ConversionUtility::getNativeUint8(jsobj, "fp");
    // TODO: Add whitelist
    params->interval = ConversionUtility::msecsToUnitsUint16(jsobj, "interval", ConversionUtility::ConversionUnit625ms);
    params->timeout = ConversionUtility::getNativeUint16(jsobj, "timeout");
    params->channel_mask = GapAdvChannelMask(ConversionUtility::getJsObject(jsobj, "channel_mask"));

    return params;
}

#pragma endregion GapAdvParams

#pragma region GapScanParams

v8::Local<v8::Object> GapScanParams::ToJs()
{
    Nan::EscapableHandleScope scope;
    // Scan parameters are never retrieved from driver.
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    return scope.Escape(obj);
}

ble_gap_scan_params_t *GapScanParams::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto params = new ble_gap_scan_params_t();
    memset(params, 0, sizeof(ble_gap_scan_params_t));

    params->active = ConversionUtility::getNativeBool(jsobj, "active");
    //params->selective = ConversionUtility::getNativeBool(jsobj, "selective");
    //TODO: params->p_whitelist =
    params->interval = ConversionUtility::msecsToUnitsUint16(jsobj, "interval", ConversionUtility::ConversionUnit625ms);
    params->window = ConversionUtility::msecsToUnitsUint16(jsobj, "window", ConversionUtility::ConversionUnit625ms);
    params->timeout = ConversionUtility::getNativeUint16(jsobj, "timeout");

    return params;
}

#pragma endregion GapScanParams

#pragma region GapSecKdist

v8::Local<v8::Object> GapSecKdist::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Utility::Set(obj, "enc", ConversionUtility::toJsBool(native->enc));
    Utility::Set(obj, "id", ConversionUtility::toJsBool(native->id));
    Utility::Set(obj, "sign", ConversionUtility::toJsBool(native->sign));
    Utility::Set(obj, "link", ConversionUtility::toJsBool(native->link));

    return scope.Escape(obj);
}

ble_gap_sec_kdist_t *GapSecKdist::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto kdist = new ble_gap_sec_kdist_t();
    memset(kdist, 0, sizeof(ble_gap_sec_kdist_t));

    kdist->enc = ConversionUtility::getNativeBool(jsobj, "enc");
    kdist->id = ConversionUtility::getNativeBool(jsobj, "id");
    kdist->sign = ConversionUtility::getNativeBool(jsobj, "sign");
    kdist->link = ConversionUtility::getNativeBool(jsobj, "link");

    return kdist;
}

#pragma endregion GapSecKdist

#pragma region GapSecParams

v8::Local<v8::Object> GapSecParams::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Utility::Set(obj, "bond", ConversionUtility::toJsBool(native->bond));
    Utility::Set(obj, "mitm", ConversionUtility::toJsBool(native->mitm));
    Utility::Set(obj, "lesc", ConversionUtility::toJsBool(native->lesc));
    Utility::Set(obj, "keypress", ConversionUtility::toJsBool(native->keypress));
    Utility::Set(obj, "io_caps", ConversionUtility::valueToJsString(native->io_caps, gap_io_caps_map));
    Utility::Set(obj, "oob", ConversionUtility::toJsBool(native->oob));
    Utility::Set(obj, "min_key_size", native->min_key_size);
    Utility::Set(obj, "max_key_size", native->max_key_size);
    Utility::Set(obj, "kdist_own", GapSecKdist(&(native->kdist_own)).ToJs());
    Utility::Set(obj, "kdist_peer", GapSecKdist(&(native->kdist_peer)).ToJs());

    return scope.Escape(obj);
}

ble_gap_sec_params_t *GapSecParams::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto params = new ble_gap_sec_params_t();
    memset(params, 0, sizeof(ble_gap_sec_params_t));

    params->bond = ConversionUtility::getNativeBool(jsobj, "bond");
    params->mitm = ConversionUtility::getNativeBool(jsobj, "mitm");
    params->lesc = ConversionUtility::getNativeBool(jsobj, "lesc");
    params->keypress = ConversionUtility::getNativeBool(jsobj, "keypress");

    params->io_caps = ConversionUtility::getNativeUint8(jsobj, "io_caps");

    params->oob = ConversionUtility::getNativeBool(jsobj, "oob");
    params->min_key_size = ConversionUtility::getNativeUint8(jsobj, "min_key_size");
    params->max_key_size = ConversionUtility::getNativeUint8(jsobj, "max_key_size");
    params->kdist_own = GapSecKdist(ConversionUtility::getJsObject(jsobj, "kdist_own"));
    params->kdist_peer = GapSecKdist(ConversionUtility::getJsObject(jsobj, "kdist_peer"));

    return params;
}

#pragma endregion GapSecParams

#pragma region GapEncInfo

v8::Local<v8::Object> GapEncInfo::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Utility::Set(obj, "ltk", ConversionUtility::toJsValueArray(native->ltk, BLE_GAP_SEC_KEY_LEN));
    Utility::Set(obj, "auth", ConversionUtility::toJsBool(native->auth));
    Utility::Set(obj, "ltk_len", native->ltk_len);
    Utility::Set(obj, "lesc", ConversionUtility::toJsBool(native->lesc));
    return scope.Escape(obj);
}

ble_gap_enc_info_t *GapEncInfo::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto enc_info = new ble_gap_enc_info_t();
    memset(enc_info, 0, sizeof(ble_gap_enc_info_t));

    auto p_ltk = ConversionUtility::getNativePointerToUint8(jsobj, "ltk");

    for (auto i = 0; i < BLE_GAP_SEC_KEY_LEN; i++)
    {
        enc_info->ltk[i] = p_ltk[i];
    }
    free(p_ltk);

    enc_info->auth = ConversionUtility::getNativeBool(jsobj, "auth");
    enc_info->ltk_len = ConversionUtility::getNativeUint8(jsobj, "ltk_len");
    enc_info->lesc = ConversionUtility::getNativeBool(jsobj, "lesc");

    return enc_info;
}

#pragma endregion GapEncInfo

#pragma region GapMasterId

v8::Local<v8::Object> GapMasterId::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Utility::Set(obj, "ediv", native->ediv);
    Utility::Set(obj, "rand", ConversionUtility::toJsValueArray(native->rand, BLE_GAP_SEC_RAND_LEN));
    return scope.Escape(obj);
}

ble_gap_master_id_t *GapMasterId::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto master_id = new ble_gap_master_id_t();
    memset(master_id, 0, sizeof(ble_gap_master_id_t));

    master_id->ediv = ConversionUtility::getNativeUint16(jsobj, "ediv");


    auto p_rand = ConversionUtility::getNativePointerToUint8(jsobj, "rand");

    for (auto i = 0; i < BLE_GAP_SEC_RAND_LEN; i++)
    {
        master_id->rand[i] = p_rand[i];
    }
    free(p_rand);

    return master_id;
}

#pragma endregion GapMasterId

#pragma region GapSignInfo

v8::Local<v8::Object> GapSignInfo::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Utility::Set(obj, "csrk", ConversionUtility::toJsValueArray(native->csrk, BLE_GAP_SEC_KEY_LEN));

    return scope.Escape(obj);
}

ble_gap_sign_info_t *GapSignInfo::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto sign_info = new ble_gap_sign_info_t();
    memset(sign_info, 0, sizeof(ble_gap_sign_info_t));

    auto p_csrk = ConversionUtility::getNativePointerToUint8(jsobj, "csrk");

    for (auto i = 0; i < BLE_GAP_SEC_KEY_LEN; i++)
    {
        sign_info->csrk[i] = p_csrk[i];
    }
    free(p_csrk);

    return sign_info;
}

#pragma endregion GapSignInfo

#pragma region GapLescP256Pk

v8::Local<v8::Object> GapLescP256Pk::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Utility::Set(obj, "pk", ConversionUtility::toJsValueArray(native->pk, BLE_GAP_LESC_P256_PK_LEN));

    return scope.Escape(obj);
}

ble_gap_lesc_p256_pk_t *GapLescP256Pk::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto lesc_p256 = new ble_gap_lesc_p256_pk_t();
    memset(lesc_p256, 0, sizeof(ble_gap_lesc_p256_pk_t));

    auto p_pk = ConversionUtility::getNativePointerToUint8(jsobj, "pk");

    for (auto i = 0; i < BLE_GAP_LESC_P256_PK_LEN; i++)
    {
        lesc_p256->pk[i] = p_pk[i];
    }
    free(p_pk);

    return lesc_p256;
}

#pragma endregion GapLescP256Pk

#pragma region GapLescDHKey

v8::Local<v8::Object> GapLescDHKey::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Utility::Set(obj, "key", ConversionUtility::toJsValueArray(native->key, BLE_GAP_LESC_DHKEY_LEN));
    return scope.Escape(obj);
}

ble_gap_lesc_dhkey_t *GapLescDHKey::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto lesc_dhkey = new ble_gap_lesc_dhkey_t();
    memset(lesc_dhkey, 0, sizeof(ble_gap_lesc_dhkey_t));

    auto p_key = ConversionUtility::getNativePointerToUint8(jsobj, "key");

    for (auto i = 0; i < BLE_GAP_LESC_DHKEY_LEN; i++)
    {
        lesc_dhkey->key[i] = p_key[i];
    }
    free(p_key);

    return lesc_dhkey;
}

#pragma endregion GapLescDHKey

#pragma region GapLescOobData

v8::Local<v8::Object> GapLescOobData::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Utility::Set(obj, "addr", GapAddr(&(native->addr)).ToJs());
    Utility::Set(obj, "r", ConversionUtility::toJsValueArray(native->r, BLE_GAP_SEC_KEY_LEN));
    Utility::Set(obj, "c", ConversionUtility::toJsValueArray(native->c, BLE_GAP_SEC_KEY_LEN));
    return scope.Escape(obj);
}

ble_gap_lesc_oob_data_t *GapLescOobData::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto lesc_oob_data = new ble_gap_lesc_oob_data_t();
    memset(lesc_oob_data, 0, sizeof(ble_gap_lesc_oob_data_t));

    auto p_r = ConversionUtility::getNativePointerToUint8(jsobj, "r");

    for (auto i = 0; i < BLE_GAP_SEC_KEY_LEN; i++)
    {
        lesc_oob_data->r[i] = p_r[i];
    }

    auto p_c = ConversionUtility::getNativePointerToUint8(jsobj, "c");

    for (auto i = 0; i < BLE_GAP_SEC_KEY_LEN; i++)
    {
        lesc_oob_data->c[i] = p_c[i];
    }

    std::unique_ptr<ble_gap_addr_t> native(GapAddr(ConversionUtility::getJsObject(jsobj, "addr")));
    std::memcpy(&(lesc_oob_data->addr), native.get(), sizeof(ble_gap_addr_t));

    return lesc_oob_data;
}

#pragma endregion GapLescOobData

#pragma region GapConnected
v8::Local<v8::Object> GapConnected::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);

    Utility::Set(obj, "peer_addr", GapAddr(&(evt->peer_addr)).ToJs());
    Utility::Set(obj, "role", ConversionUtility::valueToJsString(evt->role, gap_role_map));
    Utility::Set(obj, "conn_params", GapConnParams(&(evt->conn_params)).ToJs());
#if NRF_SD_BLE_API_VERSION <= 2
    Utility::Set(obj, "own_addr", GapAddr(&(evt->own_addr)).ToJs());
    Utility::Set(obj, "irk_match", ConversionUtility::toJsBool(evt->irk_match));

    if (evt->irk_match == 1)
    {
        Utility::Set(obj, "irk_idx", evt->irk_match_idx);
    }
#endif

    return scope.Escape(obj);
}

#pragma endregion GapConnected

#pragma region GapDisconnected
v8::Local<v8::Object> GapDisconnected::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);
    Utility::Set(obj, "reason", evt->reason);
    Utility::Set(obj, "reason_name", HciStatus::getHciStatus(evt->reason));

    return scope.Escape(obj);
}

#pragma endregion GapDisconnected

#pragma region GapConnParamUpdate
v8::Local<v8::Object> GapConnParamUpdate::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);
    Utility::Set(obj, "conn_params", GapConnParams(&(this->evt->conn_params)).ToJs());

    return scope.Escape(obj);
}

#pragma endregion GapConnParamUpdate

#pragma region GapSecParamsRequest

v8::Local<v8::Object> GapSecParamsRequest::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);
    Utility::Set(obj, "peer_params", GapSecParams(&(this->evt->peer_params)).ToJs());
    return scope.Escape(obj);
}

#pragma endregion GapSecParamsRequest

#pragma region GapSecInfoRequest

v8::Local<v8::Object> GapSecInfoRequest::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);
    Utility::Set(obj, "peer_addr", GapAddr(&(evt->peer_addr)).ToJs());
    Utility::Set(obj, "master_id", GapMasterId(&(evt->master_id)).ToJs());
    Utility::Set(obj, "enc_info", ConversionUtility::toJsBool(evt->enc_info));
    Utility::Set(obj, "id_info", ConversionUtility::toJsBool(evt->id_info));
    Utility::Set(obj, "sign_info", ConversionUtility::toJsBool(evt->sign_info));
    return scope.Escape(obj);
}

#pragma endregion GapSecInfoRequest

#pragma region GapPasskeyDisplay

v8::Local<v8::Object> GapPasskeyDisplay::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);
    Utility::Set(obj, "match_request", ConversionUtility::toJsBool(evt->match_request));
    Utility::Set(obj, "passkey", ConversionUtility::toJsString(reinterpret_cast<char *>(evt->passkey), BLE_GAP_PASSKEY_LEN));
    return scope.Escape(obj);
}

#pragma endregion GapPasskeyDisplay

#pragma region GapKeyPressed

v8::Local<v8::Object> GapKeyPressed::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);
    Utility::Set(obj, "kp_not", ConversionUtility::valueToJsString(evt->kp_not, gap_kp_not_types));
    return scope.Escape(obj);
}

#pragma endregion GapKeyPressed

#pragma region GapAuthKeyRequest
v8::Local<v8::Object> GapAuthKeyRequest::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);
    Utility::Set(obj, "key_type", ConversionUtility::valueToJsString(evt->key_type, gap_auth_key_types));
    return scope.Escape(obj);
}
#pragma endregion GapAuthKeyRequest

#pragma region GapLESCDHKeyRequest
v8::Local<v8::Object> GapLESCDHKeyRequest::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);
    Utility::Set(obj, "oobd_req", ConversionUtility::toJsBool(evt->oobd_req));
    Utility::Set(obj, "pk_peer", GapLescP256Pk(evt->p_pk_peer).ToJs());
    return scope.Escape(obj);
}
#pragma endregion GapLESCDHKeyRequest

#pragma region GapSecLevels

v8::Local<v8::Object> GapSecLevels::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Utility::Set(obj, "lv1", ConversionUtility::toJsBool(native->lv1));
    Utility::Set(obj, "lv2", ConversionUtility::toJsBool(native->lv2));
    Utility::Set(obj, "lv3", ConversionUtility::toJsBool(native->lv3));
    Utility::Set(obj, "lv4", ConversionUtility::toJsBool(native->lv4));
    return scope.Escape(obj);
}

ble_gap_sec_levels_t *GapSecLevels::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto sec_levels = new ble_gap_sec_levels_t();
    memset(sec_levels, 0, sizeof(ble_gap_sec_levels_t));

    sec_levels->lv1 = ConversionUtility::getNativeBool(jsobj, "lv1");
    sec_levels->lv2 = ConversionUtility::getNativeBool(jsobj, "lv2");
    sec_levels->lv3 = ConversionUtility::getNativeBool(jsobj, "lv3");
    sec_levels->lv4 = ConversionUtility::getNativeBool(jsobj, "lv4");

    return sec_levels;
}

#pragma endregion GapSecLevels

#pragma region GapEncKey

v8::Local<v8::Object> GapEncKey::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Utility::Set(obj, "enc_info", GapEncInfo(&native->enc_info).ToJs());
    Utility::Set(obj, "master_id", GapMasterId(&native->master_id).ToJs());

    return scope.Escape(obj);
}

ble_gap_enc_key_t *GapEncKey::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto enc_key = new ble_gap_enc_key_t();
    memset(enc_key, 0, sizeof(ble_gap_enc_key_t));

    enc_key->enc_info = GapEncInfo(ConversionUtility::getJsObject(jsobj, "enc_info"));
    enc_key->master_id = GapMasterId(ConversionUtility::getJsObject(jsobj, "master_id"));

    return enc_key;
}

#pragma endregion GapEncKey

#pragma region GapIdKey

v8::Local<v8::Object> GapIdKey::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Utility::Set(obj, "id_info", GapIrk(&native->id_info).ToJs());
    Utility::Set(obj, "id_addr_info", GapAddr(&native->id_addr_info).ToJs());

    return scope.Escape(obj);
}

ble_gap_id_key_t *GapIdKey::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto id_key = new ble_gap_id_key_t();
    memset(id_key, 0, sizeof(ble_gap_id_key_t));

    id_key->id_info = GapIrk(ConversionUtility::getJsObject(jsobj, "id_info"));
    id_key->id_addr_info = GapAddr(ConversionUtility::getJsObject(jsobj, "id_addr_info"));

    return id_key;
}

#pragma endregion GapIdKey

#pragma region GapSecKeys

v8::Local<v8::Object> GapSecKeys::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();

    if (native == nullptr)
    {
        return scope.Escape(obj);
    }

    if (native->p_enc_key == nullptr)
    {
        Utility::Set(obj, "enc_key", Nan::Null());
    }
    else
    {
        Utility::Set(obj, "enc_key", GapEncKey(native->p_enc_key).ToJs());
    }

    if (native->p_id_key == nullptr)
    {
        Utility::Set(obj, "id_key", Nan::Null());
    }
    else
    {
        Utility::Set(obj, "id_key", GapIdKey(native->p_id_key).ToJs());
    }

    if (native->p_sign_key == nullptr)
    {
        Utility::Set(obj, "sign_key", Nan::Null());
    }
    else
    {
        Utility::Set(obj, "sign_key", GapSignInfo(native->p_sign_key).ToJs());
    }

    if (native->p_pk == nullptr)
    {
        Utility::Set(obj, "pk", Nan::Null());
    }
    else
    {
        Utility::Set(obj, "pk", GapLescP256Pk(native->p_pk).ToJs());
    }

    return scope.Escape(obj);
}

ble_gap_sec_keys_t *GapSecKeys::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto keys = new ble_gap_sec_keys_t();
    memset(keys, 0, sizeof(ble_gap_sec_keys_t));

    keys->p_enc_key = GapEncKey(ConversionUtility::getJsObjectOrNull(jsobj, "enc_key"));
    keys->p_id_key = GapIdKey(ConversionUtility::getJsObjectOrNull(jsobj, "id_key"));
    keys->p_sign_key = GapSignInfo(ConversionUtility::getJsObjectOrNull(jsobj, "sign_key"));
    keys->p_pk = GapLescP256Pk(ConversionUtility::getJsObjectOrNull(jsobj, "pk"));

    return keys;
}

#pragma endregion GapSecKeys

#pragma region GapSecKeyset

v8::Local<v8::Object> GapSecKeyset::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();

    if (native == nullptr)
    {
        return scope.Escape(obj);
    }

    Utility::Set(obj, "keys_own", GapSecKeys(&native->keys_own).ToJs());
    Utility::Set(obj, "keys_peer", GapSecKeys(&native->keys_peer).ToJs());

    return scope.Escape(obj);
}

ble_gap_sec_keyset_t *GapSecKeyset::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto keyset = new ble_gap_sec_keyset_t();
    memset(keyset, 0, sizeof(ble_gap_sec_keyset_t));

    keyset->keys_own = GapSecKeys(ConversionUtility::getJsObject(jsobj, "keys_own"));
    keyset->keys_peer = GapSecKeys(ConversionUtility::getJsObject(jsobj, "keys_peer"));

    return keyset;
}

#pragma endregion GapSecKeyset

#pragma region GapAuthStatus

v8::Local<v8::Object> GapAuthStatus::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);
    Utility::Set(obj, "auth_status", ConversionUtility::toJsNumber(evt->auth_status));
    Utility::Set(obj, "auth_status_name", ConversionUtility::valueToJsString(evt->auth_status, gap_sec_status_map));
    Utility::Set(obj, "error_src", ConversionUtility::toJsNumber(evt->error_src));
    Utility::Set(obj, "error_src_name", ConversionUtility::valueToJsString(evt->error_src, gap_sec_status_sources_map));
    Utility::Set(obj, "bonded", ConversionUtility::toJsBool(evt->bonded));
    Utility::Set(obj, "sm1_levels", GapSecLevels(&(evt->sm1_levels)).ToJs());
    Utility::Set(obj, "sm2_levels", GapSecLevels(&(evt->sm2_levels)).ToJs());
    Utility::Set(obj, "kdist_own", GapSecKdist(&(evt->kdist_own)).ToJs());
    Utility::Set(obj, "kdist_peer", GapSecKdist(&(evt->kdist_peer)).ToJs());

    return scope.Escape(obj);
}

#pragma endregion GapAuthStatus

#pragma region GapConnSecUpdate

v8::Local<v8::Object> GapConnSecUpdate::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);
    Utility::Set(obj, "conn_sec", GapConnSec(&(evt->conn_sec)).ToJs());
    return scope.Escape(obj);
}

#pragma endregion GapConnSecUpdate

#pragma region GapTimeout
v8::Local<v8::Object> GapTimeout::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);
    Utility::Set(obj, "src", evt->src);
    Utility::Set(obj, "src_name", ConversionUtility::valueToJsString(evt->src, gap_timeout_sources_map));

    return scope.Escape(obj);
}

#pragma endregion GapTimeout

#pragma region GapRssiChanged
v8::Local<v8::Object> GapRssiChanged::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);
    Utility::Set(obj, "rssi", evt->rssi);

    return scope.Escape(obj);
}

#pragma endregion GapRssiChanged

#pragma region GapAdvReport
v8::Local<v8::Object> GapAdvReport::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);
    Utility::Set(obj, "rssi", evt->rssi);
    Utility::Set(obj, "peer_addr", GapAddr(&(this->evt->peer_addr)).ToJs());
    Utility::Set(obj, "scan_rsp", ConversionUtility::toJsBool(evt->scan_rsp));

    if (this->evt->scan_rsp != 1)
    {
        Utility::Set(obj, "adv_type", ConversionUtility::valueToJsString(this->evt->type, gap_adv_type_map)); // TODO: add support for non defined adv types
    }

    uint8_t dlen = this->evt->dlen;

    if (dlen != 0)
    {
        // Attach a scan_rsp object to the adv_report
        v8::Local<v8::Object> data_obj = Nan::New<v8::Object>();
        Utility::Set(obj, "data", data_obj);

        auto data = evt->data;

        // TODO: Evaluate if buffer is the correct datatype for advertisement data
        //Utility::Set(data_obj, "raw", ConversionUtility::toJsValueArray(data, dlen));

        uint8_t pos = 0;  // Position in packet
        uint8_t ad_len;   // AD Type length
        uint8_t ad_type;  // AD Type

        // Parse the adv/scan_rsp data (31 octets)
        while (pos < dlen)
        {
            ad_len = data[pos]; // Advertisement Type length
            pos++; // Move position to AD Type

            if (pos + ad_len > dlen) break; // If length of AD Type is larger than packet, something is wrong, return silently for now.
            if (ad_len == 0) break; // If length of AD Type is zero, something is wrong, return silently for now.

            ad_type = data[pos]; // Advertisement Type type

            if (ad_type == BLE_GAP_AD_TYPE_FLAGS)
            {
                v8::Local<v8::Array> flags_array = Nan::New<v8::Array>();
                auto flags_array_idx = 0;
                auto flags = data[pos + 1];

                for (auto iterator = gap_adv_flags_map.begin(); iterator != gap_adv_flags_map.end(); iterator++)
                {
                    if ((flags & iterator->first) != 0)
                    {
                        Nan::Set(flags_array, Nan::New<v8::Integer>(flags_array_idx), Nan::New(iterator->second).ToLocalChecked());
                        flags_array_idx++;
                    }
                }

                Utility::Set(data_obj, gap_ad_type_map[ad_type], flags_array);
            }
            else if (ad_type == BLE_GAP_AD_TYPE_COMPLETE_LOCAL_NAME || ad_type == BLE_GAP_AD_TYPE_SHORT_LOCAL_NAME)
            {
                uint8_t name_len = ad_len - 1;
                uint8_t offset = pos + 1;
                Utility::Set(data_obj, gap_ad_type_map[ad_type], ConversionUtility::toJsString(reinterpret_cast<char *>(&data[offset]), name_len));
            }
            else if (ad_type == BLE_GAP_AD_TYPE_16BIT_SERVICE_UUID_MORE_AVAILABLE || ad_type == BLE_GAP_AD_TYPE_16BIT_SERVICE_UUID_COMPLETE)
            {
                v8::Local<v8::Array> uuid_array = Nan::New<v8::Array>();
                uint8_t array_pos = 0;
                uint8_t sub_pos = pos + 1;

                // Fetch 16 bit UUIDS and put them into the array
                for (auto i = 0; i < ad_len - 1; i += 2)
                {
                    auto uuid_as_text = static_cast<char*>(malloc(UUID_16_BIT_STR_SIZE + 1));
                    assert(uuid_as_text != nullptr);
                    sprintf(uuid_as_text, UUID_16_BIT_SPRINTF, uint16_decode(static_cast<uint8_t*>(data) + sub_pos + i));
                    Nan::Set(uuid_array, Nan::New<v8::Integer>(array_pos), ConversionUtility::toJsString(uuid_as_text));
                    free(uuid_as_text);
                    array_pos++;
                }

                Utility::Set(data_obj, gap_ad_type_map[ad_type], uuid_array);
            }
            else if (ad_type == BLE_GAP_AD_TYPE_32BIT_SERVICE_UUID_MORE_AVAILABLE || ad_type == BLE_GAP_AD_TYPE_32BIT_SERVICE_UUID_COMPLETE)
            {
                v8::Local<v8::Array> uuid_array = Nan::New<v8::Array>();
                uint8_t array_pos = 0;
                uint8_t sub_pos = pos + 1;

                // Fetch 32 bit UUIDS and put them into the array
                for (auto i = 0; i < ad_len - 1; i += 4)
                {
                    auto uuid_as_text = static_cast<char*>(malloc(UUID_128_BIT_STR_SIZE + 1));
                    assert(uuid_as_text != nullptr);

                    sprintf(uuid_as_text, UUID_128_BIT_SPRINTF,
                            uint16_decode(static_cast<uint8_t*>(data) + sub_pos + 2 + i),
                            uint16_decode(static_cast<uint8_t*>(data) + sub_pos + 0 + i));
                    Nan::Set(uuid_array, Nan::New<v8::Integer>(array_pos), ConversionUtility::toJsString(uuid_as_text));
                    free(uuid_as_text);
                    array_pos++;
                }

                Utility::Set(data_obj, gap_ad_type_map[ad_type], uuid_array);
            }
            else if (ad_type == BLE_GAP_AD_TYPE_128BIT_SERVICE_UUID_COMPLETE || ad_type == BLE_GAP_AD_TYPE_128BIT_SERVICE_UUID_MORE_AVAILABLE)
            {
                v8::Local<v8::Array> uuid_array = Nan::New<v8::Array>();
                uint8_t array_pos = 0;
                uint8_t sub_pos = pos + 1;

                // Fetch 128 bit UUIDS and put them into the array
                for (auto i = 0; i < ad_len - 1; i += 16)
                {
                    auto uuid_as_text = static_cast<char*>(malloc(UUID_128_BIT_STR_SIZE + 1));
                    assert(uuid_as_text != NULL);

                    sprintf(
                        uuid_as_text,
                        UUID_128_BIT_COMPLETE_SPRINTF,
                        uint16_decode(static_cast<uint8_t*>(data) + (sub_pos + i + 14)),
                        uint16_decode(static_cast<uint8_t*>(data) + (sub_pos + i + 12)),
                        uint16_decode(static_cast<uint8_t*>(data) + (sub_pos + i + 10)),
                        uint16_decode(static_cast<uint8_t*>(data) + (sub_pos + i + 8)),
                        uint16_decode(static_cast<uint8_t*>(data) + (sub_pos + i + 6)),
                        uint16_decode(static_cast<uint8_t*>(data) + (sub_pos + i + 4)),
                        uint16_decode(static_cast<uint8_t*>(data) + (sub_pos + i + 2)),
                        uint16_decode(static_cast<uint8_t*>(data) + (sub_pos + i + 0))
                        );
                    Nan::Set(uuid_array, Nan::New<v8::Integer>(array_pos), ConversionUtility::toJsString(uuid_as_text));
                    free(uuid_as_text);
                    array_pos++;
                }

                Utility::Set(data_obj, gap_ad_type_map[ad_type], uuid_array);
            }
            // else if (ad_type == BLE_GAP_AD_TYPE_SERVICE_DATA)
            // {
            //     Utility::Set(data_obj, gap_ad_type_map[ad_type], Nan::New<v8::Integer>((data[pos + 1] << 8) + data[pos + 2]));
            // }
            else if (ad_type == BLE_GAP_AD_TYPE_TX_POWER_LEVEL)
            {
                if(ad_len - 1 == 1)
                {
                    Utility::Set(data_obj, gap_ad_type_map[ad_type], Nan::New<v8::Integer>(data[pos + 1]));
                } else {
                    std::cerr << "Wrong length of AD_TYPE :" << gap_ad_type_map[ad_type] << std::endl;
                }
            }
            else if ( gap_ad_type_map.find(ad_type) != gap_ad_type_map.end())
            {
                // For other AD types, pass data as array without parsing
                Utility::Set(data_obj, gap_ad_type_map[ad_type], ConversionUtility::toJsValueArray(data + pos + 1, ad_len - 1));
            }
            else
            {
                Utility::Set(data_obj, std::to_string(ad_type).c_str(), ConversionUtility::toJsValueArray(data + pos + 1, ad_len - 1));
            }

            pos += ad_len; // Jump to the next AD Type
        }
    }

    return scope.Escape(obj);
}

#pragma endregion GapAdvReport

#pragma region GapSecRequest

v8::Local<v8::Object> GapSecRequest::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);
    Utility::Set(obj, "bond", ConversionUtility::toJsBool(evt->bond));
    Utility::Set(obj, "mitm", ConversionUtility::toJsBool(evt->mitm));
    Utility::Set(obj, "lesc", ConversionUtility::toJsBool(evt->lesc));
    Utility::Set(obj, "keypress", ConversionUtility::toJsBool(evt->keypress));
    return scope.Escape(obj);
}

#pragma endregion GapSecRequest

#pragma region GapScanReqReport
v8::Local<v8::Object> GapScanReqReport::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);
    Utility::Set(obj, "rssi", evt->rssi);
    Utility::Set(obj, "peer_addr", GapAddr(&(this->evt->peer_addr)).ToJs());

    return scope.Escape(obj);
}

#pragma endregion GapScanReqReport

#pragma region GapConnParamUpdateRequest
v8::Local<v8::Object> GapConnParamUpdateRequest::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);
    Utility::Set(obj, "conn_params", GapConnParams(&(this->evt->conn_params)).ToJs());
    return scope.Escape(obj);
}

#pragma endregion GapConnParamUpdateRequest

#pragma endregion Conversion methods to/from JavaScript/C++

#pragma region JavaScript function implementations

#pragma region GapSetAddress
NAN_METHOD(Adapter::GapSetAddress)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    uint8_t address_cycle_mode;
    v8::Local<v8::Object> addressObject;
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        // Check validity of argument as cycle_modeMode is only applicable in SD API v2
        if (info[argumentcount]->IsInt32())
        {
            address_cycle_mode = ConversionUtility::getNativeUint8(info[argumentcount]);
        }
        argumentcount++;

        addressObject = ConversionUtility::getJsObject(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new GapAddressSetBaton(callback);
#if NRF_SD_BLE_API_VERSION <= 2
    baton->addr_cycle_mode = address_cycle_mode;
#endif

    try
    {
        baton->address = GapAddr(addressObject);
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getStructErrorMessage("address", error);
        Nan::ThrowTypeError(message);
        return;
    }
    baton->adapter = obj->adapter;

    uv_queue_work(uv_default_loop(), baton->req, GapSetAddress, reinterpret_cast<uv_after_work_cb>(AfterGapSetAddress));
}

void Adapter::GapSetAddress(uv_work_t *req)
{
    auto baton = static_cast<GapAddressSetBaton *>(req->data);
#if NRF_SD_BLE_API_VERSION <= 2
    baton->result = sd_ble_gap_address_set(baton->adapter, baton->addr_cycle_mode, baton->address);
#elif NRF_SD_BLE_API_VERSION >= 3
    baton->result = sd_ble_gap_addr_set(baton->adapter, baton->address);
#endif
}

// This runs in Main Thread
void Adapter::AfterGapSetAddress(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<GapAddressSetBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "setting address.");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(1, argv, &resource);
    delete baton;
}

#pragma endregion GapSetAddress

#pragma region GapGetAddress

NAN_METHOD(Adapter::GapGetAddress)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto address = new ble_gap_addr_t();

    auto baton = new GapAddressGetBaton(callback);
    baton->address = address;
    baton->adapter = obj->adapter;

    uv_queue_work(uv_default_loop(), baton->req, GapGetAddress, reinterpret_cast<uv_after_work_cb>(AfterGapGetAddress));

    return;
}


void Adapter::GapGetAddress(uv_work_t *req)
{
    auto baton = static_cast<GapAddressGetBaton *>(req->data);
#if NRF_SD_BLE_API_VERSION <= 2
    baton->result = sd_ble_gap_address_get(baton->adapter, baton->address);
#elif NRF_SD_BLE_API_VERSION >= 3
    baton->result = sd_ble_gap_addr_get(baton->adapter, baton->address);
#endif
}

// This runs in Main Thread
void Adapter::AfterGapGetAddress(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<GapAddressGetBaton *>(req->data);
    v8::Local<v8::Value> argv[2];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = Nan::Undefined();
        argv[1] = ErrorMessage::getErrorMessage(baton->result, "getting address.");
    }
    else
    {
        argv[0] = GapAddr(baton->address).ToJs();
        argv[1] = Nan::Undefined();
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(2, argv, &resource);
    delete baton;
}

#pragma endregion GapGetAddress

#pragma region GapUpdateConnectionParameters

NAN_METHOD(Adapter::GapUpdateConnectionParameters)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    uint16_t conn_handle;
    v8::Local<v8::Object> connParamsObject;
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        conn_handle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        connParamsObject = ConversionUtility::getJsObjectOrNull(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new GapUpdateConnectionParametersBaton(callback);
    baton->conn_handle = conn_handle;

    try
    {
        baton->connectionParameters = GapConnParams(connParamsObject);
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getStructErrorMessage("connectionParameters", error);
        Nan::ThrowTypeError(message);
        return;
    }
    baton->adapter = obj->adapter;

    uv_queue_work(uv_default_loop(), baton->req, GapUpdateConnectionParameters, reinterpret_cast<uv_after_work_cb>(AfterGapUpdateConnectionParameters));
}

// This runs in a worker thread (not Main Thread)
void Adapter::GapUpdateConnectionParameters(uv_work_t *req)
{
    // TODO: handle if .Close is called before this function is called.
    auto baton = static_cast<GapUpdateConnectionParametersBaton *>(req->data);
    baton->result = sd_ble_gap_conn_param_update(baton->adapter, baton->conn_handle, baton->connectionParameters);
}

// This runs in Main Thread
void Adapter::AfterGapUpdateConnectionParameters(uv_work_t *req)
{
    Nan::HandleScope scope;

    // TODO: handle if .Close is called before this function is called.
    auto baton = static_cast<GapUpdateConnectionParametersBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "updating connection parameters");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(1, argv, &resource);
    delete baton;
}

#pragma endregion GapUpdateConnectionParameters

#pragma region GapDisconnect

NAN_METHOD(Adapter::GapDisconnect)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    uint16_t conn_handle;
    uint8_t hci_status_code;
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        conn_handle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        hci_status_code = ConversionUtility::getNativeUint8(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new GapDisconnectBaton(callback);
    baton->conn_handle = conn_handle;
    baton->hci_status_code = hci_status_code;
    baton->adapter = obj->adapter;

    uv_queue_work(uv_default_loop(), baton->req, GapDisconnect, reinterpret_cast<uv_after_work_cb>(AfterGapDisconnect));
}

// This runs in a worker thread (not Main Thread)
void Adapter::GapDisconnect(uv_work_t *req)
{
    auto baton = static_cast<GapDisconnectBaton *>(req->data);
    baton->result = sd_ble_gap_disconnect(baton->adapter, baton->conn_handle, baton->hci_status_code);
}

// This runs in Main Thread
void Adapter::AfterGapDisconnect(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<GapDisconnectBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "disconnecting");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(1, argv, &resource);
    delete baton;
}

#pragma endregion GapDisconnect

#pragma region GapSetTXPower

NAN_METHOD(Adapter::GapSetTXPower)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    int8_t tx_power;
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        tx_power = ConversionUtility::getNativeInt8(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new TXPowerBaton(callback);

    baton->tx_power = tx_power;
    baton->adapter = obj->adapter;

    uv_queue_work(uv_default_loop(), baton->req, GapSetTXPower, reinterpret_cast<uv_after_work_cb>(AfterGapSetTXPower));

}

// This runs in a worker thread (not Main Thread)
void Adapter::GapSetTXPower(uv_work_t *req)
{
    auto baton = static_cast<TXPowerBaton *>(req->data);
    baton->result = sd_ble_gap_tx_power_set(baton->adapter, baton->tx_power);
}

// This runs in Main Thread
void Adapter::AfterGapSetTXPower(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<TXPowerBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "setting TX power.");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(1, argv, &resource);
    delete baton;
}

#pragma endregion GapSetTXPower

#pragma region GapSetDeviceName

NAN_METHOD(Adapter::GapSetDeviceName)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    v8::Local<v8::Object> conn_sec_mode;
    uint8_t *dev_name;
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        conn_sec_mode = ConversionUtility::getJsObject(info[argumentcount]);
        argumentcount++;

        dev_name = ConversionUtility::getNativePointerToUint8(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto length = strlen(reinterpret_cast<char *>(dev_name));

    auto baton = new GapSetDeviceNameBaton(callback);

    try
    {
        baton->conn_sec_mode = GapConnSecMode(conn_sec_mode);
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getStructErrorMessage("conn_sec_mode", error);
        Nan::ThrowTypeError(message);
        return;
    }

    baton->dev_name = dev_name;
    baton->length = (uint16_t)length;
    baton->adapter = obj->adapter;

    uv_queue_work(uv_default_loop(), baton->req, GapSetDeviceName, reinterpret_cast<uv_after_work_cb>(AfterGapSetDeviceName));
}

// This runs in a worker thread (not Main Thread)
void Adapter::GapSetDeviceName(uv_work_t *req)
{
    auto baton = static_cast<GapSetDeviceNameBaton *>(req->data);
    baton->result = sd_ble_gap_device_name_set(baton->adapter, baton->conn_sec_mode, baton->dev_name, baton->length);
}

// This runs in Main Thread
void Adapter::AfterGapSetDeviceName(uv_work_t *req)
{
    Nan::HandleScope scope;

    // TODO: handle if .Close is called before this function is called.
    auto baton = static_cast<GapSetDeviceNameBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "setting device name.");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(1, argv, &resource);
    delete baton;
}

#pragma endregion GapSetDeviceName

#pragma region GapGetDeviceName

NAN_METHOD(Adapter::GapGetDeviceName)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new GapGetDeviceNameBaton(callback);

    baton->length = 248; // Max length of Device name characteristic
    baton->dev_name = static_cast<uint8_t*>(malloc(baton->length));
    baton->adapter = obj->adapter;

    uv_queue_work(uv_default_loop(), baton->req, GapGetDeviceName, reinterpret_cast<uv_after_work_cb>(AfterGapGetDeviceName));
}

// This runs in a worker thread (not Main Thread)
void Adapter::GapGetDeviceName(uv_work_t *req)
{
    auto baton = static_cast<GapGetDeviceNameBaton *>(req->data);
    baton->result = sd_ble_gap_device_name_get(baton->adapter, baton->dev_name, &(baton->length));
}

// This runs in Main Thread
void Adapter::AfterGapGetDeviceName(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<GapGetDeviceNameBaton *>(req->data);
    v8::Local<v8::Value> argv[2];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = Nan::Undefined();
        argv[1] = ErrorMessage::getErrorMessage(baton->result, "getting device name.");
    }
    else
    {
        size_t length = baton->length;
        baton->dev_name[length] = 0;

        v8::Local<v8::Value> dev_name = ConversionUtility::toJsString(reinterpret_cast<char *>(baton->dev_name));

        argv[0] = dev_name;
        argv[1] = Nan::Undefined();
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(2, argv, &resource);
    delete baton;
}

#pragma endregion GapGetDeviceName

#pragma region GapStartRSSI

NAN_METHOD(Adapter::GapStartRSSI)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    uint16_t conn_handle;
    uint8_t treshold_dbm;
    uint8_t skip_count;
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        conn_handle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        treshold_dbm = ConversionUtility::getNativeUint8(info[argumentcount]);
        argumentcount++;

        skip_count = ConversionUtility::getNativeUint8(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new GapStartRSSIBaton(callback);
    baton->conn_handle = conn_handle;
    baton->treshold_dbm = treshold_dbm;
    baton->skip_count = skip_count;
    baton->adapter = obj->adapter;

    uv_queue_work(uv_default_loop(), baton->req, GapStartRSSI, reinterpret_cast<uv_after_work_cb>(AfterGapStartRSSI));
}

// This runs in a worker thread (not Main Thread)
void Adapter::GapStartRSSI(uv_work_t *req)
{
    auto baton = static_cast<GapStartRSSIBaton *>(req->data);
    baton->result = sd_ble_gap_rssi_start(baton->adapter, baton->conn_handle, baton->treshold_dbm, baton->skip_count);
}

// This runs in Main Thread
void Adapter::AfterGapStartRSSI(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<GapStartRSSIBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "starting RSSI");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(1, argv, &resource);
    delete baton;
}

#pragma endregion GapStartRSSI

#pragma region GapStopRSSI

NAN_METHOD(Adapter::GapStopRSSI)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    uint16_t conn_handle;
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        conn_handle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new GapStopRSSIBaton(callback);
    baton->conn_handle = conn_handle;
    baton->adapter = obj->adapter;

    uv_queue_work(uv_default_loop(), baton->req, GapStopRSSI, reinterpret_cast<uv_after_work_cb>(AfterGapStopRSSI));
}

// This runs in a worker thread (not Main Thread)
void Adapter::GapStopRSSI(uv_work_t *req)
{
    auto baton = static_cast<GapStopRSSIBaton *>(req->data);
    baton->result = sd_ble_gap_rssi_stop(baton->adapter, baton->conn_handle);
}

// This runs in Main Thread
void Adapter::AfterGapStopRSSI(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<GapStopRSSIBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "stopping RSSI");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(1, argv, &resource);
    delete baton;
}

#pragma endregion GapStopRSSI

#pragma region GapStartScan

NAN_METHOD(Adapter::GapStartScan)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    v8::Local<v8::Object> options;
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        options = ConversionUtility::getJsObject(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    ble_gap_scan_params_t *params = GapScanParams(options);

    auto baton = new StartScanBaton(callback);
    baton->scan_params = params;
    baton->adapter = obj->adapter;

    uv_queue_work(uv_default_loop(), baton->req, GapStartScan, reinterpret_cast<uv_after_work_cb>(AfterGapStartScan));
}

// This runs in a worker thread (not Main Thread)
void Adapter::GapStartScan(uv_work_t *req)
{
    auto baton = static_cast<StartScanBaton *>(req->data);
    baton->result = sd_ble_gap_scan_start(baton->adapter, baton->scan_params);
}

// This runs in Main Thread
void Adapter::AfterGapStartScan(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<StartScanBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "starting scan");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(1, argv, &resource);
    delete baton;
}

#pragma endregion GapStartScan

#pragma region GapStopScan

NAN_METHOD(Adapter::GapStopScan)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new StopScanBaton(callback);
    baton->adapter = obj->adapter;

    uv_queue_work(uv_default_loop(), baton->req, GapStopScan, reinterpret_cast<uv_after_work_cb>(AfterGapStopScan));
}

// This runs in a worker thread (not Main Thread)
void Adapter::GapStopScan(uv_work_t *req)
{
    auto baton = static_cast<StopScanBaton *>(req->data);
    baton->result = sd_ble_gap_scan_stop(baton->adapter);
}

// This runs in Main Thread
void Adapter::AfterGapStopScan(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<StopScanBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "stopping scan");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(1, argv, &resource);
    delete baton;
}

#pragma endregion GapStopScan

#pragma region GapConnect

NAN_METHOD(Adapter::GapConnect)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    v8::Local<v8::Object> address;
    v8::Local<v8::Object> scan_params;
    v8::Local<v8::Object> conn_params;
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        address = ConversionUtility::getJsObject(info[argumentcount]);
        argumentcount++;

        scan_params = ConversionUtility::getJsObject(info[argumentcount]);
        argumentcount++;

        conn_params = ConversionUtility::getJsObject(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new GapConnectBaton(callback);
    baton->adapter = obj->adapter;
    baton->req->data = static_cast<void *>(baton);

    try
    {
        baton->address = GapAddr(address);
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getStructErrorMessage("address", error);
        Nan::ThrowTypeError(message);
        return;
    }

    try
    {
        baton->scan_params = GapScanParams(scan_params);
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getStructErrorMessage("scan_params", error);
        Nan::ThrowTypeError(message);
        return;
    }

    try
    {
        baton->conn_params = GapConnParams(conn_params);
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getStructErrorMessage("conn_params", error);
        Nan::ThrowTypeError(message);
        return;
    }

    uv_queue_work(uv_default_loop(), baton->req, GapConnect, reinterpret_cast<uv_after_work_cb>(AfterGapConnect));
}

// This runs in a worker thread (not Main Thread)
void Adapter::GapConnect(uv_work_t *req)
{
    auto baton = static_cast<GapConnectBaton *>(req->data);
    baton->result = sd_ble_gap_connect(baton->adapter, baton->address, baton->scan_params, baton->conn_params);
}

// This runs in Main Thread
void Adapter::AfterGapConnect(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<GapConnectBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "connecting");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(1, argv, &resource);
    delete baton;
}

#pragma endregion GapConnect

#pragma region GapCancelConnect

NAN_METHOD(Adapter::GapCancelConnect)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new GapConnectCancelBaton(callback);
    baton->adapter = obj->adapter;

    uv_queue_work(uv_default_loop(), baton->req, GapCancelConnect, reinterpret_cast<uv_after_work_cb>(AfterGapCancelConnect));
}

// This runs in a worker thread (not Main Thread)
void Adapter::GapCancelConnect(uv_work_t *req)
{
    auto baton = static_cast<GapConnectCancelBaton *>(req->data);
    baton->result = sd_ble_gap_connect_cancel(baton->adapter);
}

// This runs in Main Thread
void Adapter::AfterGapCancelConnect(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<GapConnectCancelBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "canceling connection");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(1, argv, &resource);
    delete baton;
}

#pragma endregion GapCancelConnect

#pragma region GapGetRSSI
NAN_METHOD(Adapter::GapGetRSSI)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    uint16_t conn_handle;
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        conn_handle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new GapGetRSSIBaton(callback);
    baton->conn_handle = conn_handle;
    baton->rssi = 0;
    baton->adapter = obj->adapter;

    uv_queue_work(uv_default_loop(), baton->req, GapGetRSSI, reinterpret_cast<uv_after_work_cb>(AfterGapGetRSSI));
}

// This runs in a worker thread (not Main Thread)
void Adapter::GapGetRSSI(uv_work_t *req)
{
    auto baton = static_cast<GapGetRSSIBaton *>(req->data);

    //TODO: Does not return. Unsure if it is the serialization, my code, or SD which does not behave.
    baton->result = sd_ble_gap_rssi_get(baton->adapter, baton->conn_handle, &(baton->rssi));

    std::cout << "GapGetRSSI After Call" << std::endl;
}

// This runs in Main Thread
void Adapter::AfterGapGetRSSI(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<GapGetRSSIBaton *>(req->data);
    v8::Local<v8::Value> argv[2];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = Nan::Undefined();
        argv[1] = ErrorMessage::getErrorMessage(baton->result, "getting rssi");
    }
    else
    {
        argv[0] = ConversionUtility::toJsNumber(baton->rssi);
        argv[1] = Nan::Undefined();
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(2, argv, &resource);
    delete baton;
}

#pragma endregion GapGetRSSI

#pragma region GapStartAdvertising

NAN_METHOD(Adapter::GapStartAdvertising)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    v8::Local<v8::Object> adv_params;
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        adv_params = ConversionUtility::getJsObject(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new GapStartAdvertisingBaton(callback);
    try
    {
        baton->p_adv_params = GapAdvParams(adv_params);
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getStructErrorMessage("adv_params", error);
        Nan::ThrowTypeError(message);
        return;
    }
    baton->adapter = obj->adapter;

    uv_queue_work(uv_default_loop(), baton->req, GapStartAdvertising, reinterpret_cast<uv_after_work_cb>(AfterGapStartAdvertising));
}

// This runs in a worker thread (not Main Thread)
void Adapter::GapStartAdvertising(uv_work_t *req)
{
    auto baton = static_cast<GapStartAdvertisingBaton *>(req->data);
    baton->result = sd_ble_gap_adv_start(baton->adapter, baton->p_adv_params);

}

// This runs in Main Thread
void Adapter::AfterGapStartAdvertising(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<GapStartAdvertisingBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "starting advertisement");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(1, argv, &resource);
    delete baton;
}

#pragma endregion GapStartAdvertising

#pragma region GapStopAdvertising

NAN_METHOD(Adapter::GapStopAdvertising)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new GapStopAdvertisingBaton(callback);
    baton->adapter = obj->adapter;

    uv_queue_work(uv_default_loop(), baton->req, GapStopAdvertising, reinterpret_cast<uv_after_work_cb>(AfterGapStopAdvertising));
}

// This runs in a worker thread (not Main Thread)
void Adapter::GapStopAdvertising(uv_work_t *req)
{
    auto baton = static_cast<GapStopAdvertisingBaton *>(req->data);
    baton->result = sd_ble_gap_adv_stop(baton->adapter);
}

// This runs in Main Thread
void Adapter::AfterGapStopAdvertising(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<GapStopAdvertisingBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "stopping advertising");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(1, argv, &resource);
    delete baton;
}

#pragma endregion GapStopAdvertising

#pragma region GapGetConnectionSecurity

NAN_METHOD(Adapter::GapGetConnectionSecurity)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    uint16_t conn_handle;
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        conn_handle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new GapConnSecGetBaton(callback);
    baton->conn_handle = conn_handle;
    baton->conn_sec = new ble_gap_conn_sec_t();
    baton->adapter = obj->adapter;

    uv_queue_work(uv_default_loop(), baton->req, GapGetConnectionSecurity, reinterpret_cast<uv_after_work_cb>(AfterGapGetConnectionSecurity));
}

// This runs in a worker thread (not Main Thread)
void Adapter::GapGetConnectionSecurity(uv_work_t *req)
{
    auto baton = static_cast<GapConnSecGetBaton *>(req->data);
    baton->result = sd_ble_gap_conn_sec_get(baton->adapter, baton->conn_handle, baton->conn_sec);
}

// This runs in Main Thread
void Adapter::AfterGapGetConnectionSecurity(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<GapConnSecGetBaton *>(req->data);
    v8::Local<v8::Value> argv[2];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "getting connection security");
        argv[1] = Nan::Undefined();
    }
    else
    {
        argv[0] = Nan::Undefined();
        argv[1] = GapConnSec(baton->conn_sec).ToJs();
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(2, argv, &resource);
    delete baton;
}

#pragma endregion GapGetConnectionSecurity

#pragma region GapEncrypt

NAN_METHOD(Adapter::GapEncrypt)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    uint16_t conn_handle;
    v8::Local<v8::Object> master_id_object;
    v8::Local<v8::Object> enc_info_object;
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        conn_handle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        master_id_object = ConversionUtility::getJsObject(info[argumentcount]);
        argumentcount++;

        enc_info_object = ConversionUtility::getJsObject(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new GapEncryptBaton(callback);
    baton->conn_handle = conn_handle;

    try
    {
        baton->master_id = GapMasterId(master_id_object);
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getStructErrorMessage("master_id", error);
        Nan::ThrowTypeError(message);
        return;
    }

    try
    {
        baton->enc_info = GapEncInfo(enc_info_object);
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getStructErrorMessage("enc_info", error);
        Nan::ThrowTypeError(message);
        return;
    }
    baton->adapter = obj->adapter;

    uv_queue_work(uv_default_loop(), baton->req, GapEncrypt, reinterpret_cast<uv_after_work_cb>(AfterGapEncrypt));
}

void Adapter::GapEncrypt(uv_work_t *req)
{
    auto baton = static_cast<GapEncryptBaton *>(req->data);
    baton->result = sd_ble_gap_encrypt(baton->adapter, baton->conn_handle, baton->master_id, baton->enc_info);
}

void Adapter::AfterGapEncrypt(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<GapEncryptBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "encrypting");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(1, argv, &resource);
    delete baton;
}
#pragma endregion GapEncrypt

#pragma region GapReplySecurityParameters
NAN_METHOD(Adapter::GapReplySecurityParameters)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    uint16_t conn_handle;
    uint8_t sec_status;
    v8::Local<v8::Object> sec_params_object;
    v8::Local<v8::Object> sec_keyset_object;
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        conn_handle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        sec_status = ConversionUtility::getNativeUint8(info[argumentcount]);
        argumentcount++;

        sec_params_object = ConversionUtility::getJsObjectOrNull(info[argumentcount]);
        argumentcount++;

        sec_keyset_object = ConversionUtility::getJsObjectOrNull(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new GapSecParamsReplyBaton(callback);
    baton->conn_handle = conn_handle;
    baton->sec_status = sec_status;

    try
    {
        baton->sec_params = GapSecParams(sec_params_object);
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getStructErrorMessage("sec_params", error);
        Nan::ThrowTypeError(message);
        return;
    }

    try
    {
        ble_gap_sec_keyset_t *keyset = GapSecKeyset(sec_keyset_object);

        if (keyset == nullptr)
        {
            keyset = new ble_gap_sec_keyset_t();

            keyset->keys_own.p_enc_key = nullptr;
            keyset->keys_own.p_id_key = nullptr;
            keyset->keys_own.p_sign_key = nullptr;
            keyset->keys_own.p_pk = nullptr;
        }

        if (keyset->keys_own.p_enc_key == nullptr)
        {
            keyset->keys_own.p_enc_key = new ble_gap_enc_key_t();
        }

        if (keyset->keys_own.p_id_key == nullptr)
        {
            keyset->keys_own.p_id_key = new ble_gap_id_key_t();
        }

        if (keyset->keys_own.p_sign_key == nullptr)
        {
            keyset->keys_own.p_sign_key = new ble_gap_sign_info_t();
        }

        if (keyset->keys_own.p_pk == nullptr)
        {
            keyset->keys_own.p_pk = new ble_gap_lesc_p256_pk_t();
        }


        keyset->keys_peer.p_enc_key = new ble_gap_enc_key_t();
        keyset->keys_peer.p_id_key = new ble_gap_id_key_t();
        keyset->keys_peer.p_sign_key = new ble_gap_sign_info_t();
        keyset->keys_peer.p_pk = new ble_gap_lesc_p256_pk_t();

        baton->sec_keyset = keyset;

        obj->createSecurityKeyStorage(conn_handle, keyset);
    }
    catch (std::string)
    {
        Nan::ThrowTypeError("The provided keyset can not be parsed.");
        return;
    }

    baton->adapter = obj->adapter;

    uv_queue_work(uv_default_loop(), baton->req, GapReplySecurityParameters, reinterpret_cast<uv_after_work_cb>(AfterGapReplySecurityParameters));
}

// This runs in a worker thread (not Main Thread)
void Adapter::GapReplySecurityParameters(uv_work_t *req)
{
    auto baton = static_cast<GapSecParamsReplyBaton *>(req->data);

    baton->result = sd_ble_gap_sec_params_reply(baton->adapter,
                                            baton->conn_handle,
                                            baton->sec_status,
                                            baton->sec_params,
                                            baton->sec_keyset);
}

// This runs in Main Thread
void Adapter::AfterGapReplySecurityParameters(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<GapSecParamsReplyBaton *>(req->data);
    v8::Local<v8::Value> argv[2];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "replying sec params");
        argv[1] = Nan::Undefined();
    }
    else
    {
        argv[0] = Nan::Undefined();

        if (baton->sec_keyset == nullptr)
        {
            argv[1] = Nan::Null();
        }
        else
        {
            argv[1] = GapSecKeyset(baton->sec_keyset).ToJs();
        }
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(2, argv, &resource);
    delete baton;
}

#pragma endregion GapReplySecurityParameters

#pragma region GapReplySecurityInfo
NAN_METHOD(Adapter::GapReplySecurityInfo)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    uint16_t conn_handle;
    v8::Local<v8::Object> enc_info_object;
    v8::Local<v8::Object> id_info_object;
    v8::Local<v8::Object> sign_info_object;
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        conn_handle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        enc_info_object = ConversionUtility::getJsObjectOrNull(info[argumentcount]);
        argumentcount++;

        id_info_object = ConversionUtility::getJsObjectOrNull(info[argumentcount]);
        argumentcount++;

        sign_info_object = ConversionUtility::getJsObjectOrNull(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new GapSecInfoReplyBaton(callback);

    baton->conn_handle = conn_handle;

    try
    {
        baton->enc_info = GapEncInfo(enc_info_object);
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getStructErrorMessage("enc_info", error);
        Nan::ThrowTypeError(message);
        return;
    }

    try
    {
        baton->id_info = GapIrk(id_info_object);
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getStructErrorMessage("id_info", error);
        Nan::ThrowTypeError(message);
        return;
    }

    try
    {
        baton->sign_info = GapSignInfo(sign_info_object);
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getStructErrorMessage("sign_info", error);
        Nan::ThrowTypeError(message);
        return;
    }
    baton->adapter = obj->adapter;

    uv_queue_work(uv_default_loop(), baton->req, GapReplySecurityInfo, reinterpret_cast<uv_after_work_cb>(AfterGapReplySecurityInfo));
}

void Adapter::GapReplySecurityInfo(uv_work_t *req)
{
    auto baton = static_cast<GapSecInfoReplyBaton *>(req->data);
    baton->result = sd_ble_gap_sec_info_reply(baton->adapter, baton->conn_handle, baton->enc_info, baton->id_info, baton->sign_info);
}

void Adapter::AfterGapReplySecurityInfo(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<GapSecInfoReplyBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "replying sec info");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(1, argv, &resource);
    delete baton;
}

#pragma endregion GapReplySecurityInfo

#pragma region GapAuthenticate

NAN_METHOD(Adapter::GapAuthenticate)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    uint16_t conn_handle;
    v8::Local<v8::Object> sec_params;
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        conn_handle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        sec_params = ConversionUtility::getJsObjectOrNull(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new GapAuthenticateBaton(callback);
    baton->conn_handle = conn_handle;

    try
    {
        baton->p_sec_params = GapSecParams(sec_params);
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getStructErrorMessage("sec_params", error);
        Nan::ThrowTypeError(message);
        return;
    }
    baton->adapter = obj->adapter;

    uv_queue_work(uv_default_loop(), baton->req, GapAuthenticate, reinterpret_cast<uv_after_work_cb>(AfterGapAuthenticate));
}

// This runs in a worker thread (not Main Thread)
void Adapter::GapAuthenticate(uv_work_t *req)
{
    auto baton = static_cast<GapAuthenticateBaton *>(req->data);
    baton->result = sd_ble_gap_authenticate(baton->adapter, baton->conn_handle, baton->p_sec_params);
}

// This runs in Main Thread
void Adapter::AfterGapAuthenticate(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<GapAuthenticateBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "authenticating");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(1, argv, &resource);
    delete baton;
}

#pragma endregion GapAuthenticate

#pragma region GapSetAdvertisingData

NAN_METHOD(Adapter::GapSetAdvertisingData)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    uint8_t *adv_data;
    uint8_t adv_data_length;
    uint8_t *scan_response;
    uint8_t scan_response_length;
    v8::Local<v8::Function> callback;
    uint8_t argumentcount = 0;

    try
    {
        if (info[argumentcount]->IsNull())
        {
            adv_data = nullptr;
            adv_data_length = 0;
        }
        else
        {
            adv_data = ConversionUtility::getNativePointerToUint8(info[argumentcount]);

            v8::Local<v8::Array> js_advdata_array = v8::Local<v8::Array>::Cast(info[argumentcount]);
            adv_data_length = static_cast<uint8_t>(js_advdata_array->Length());
        }
        argumentcount++;

        if (info[argumentcount]->IsNull())
        {
            scan_response = nullptr;
            scan_response_length = 0;
        }
        else
        {
            scan_response = ConversionUtility::getNativePointerToUint8(info[argumentcount]);

            v8::Local<v8::Array> js_scanresponse_array = v8::Local<v8::Array>::Cast(info[argumentcount]);
            scan_response_length = static_cast<uint8_t>(js_scanresponse_array->Length());
        }
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new GapSetAdvertisingDataBaton(callback);
    baton->data = adv_data;
    baton->dlen = adv_data_length;
    baton->sr_data = scan_response;
    baton->srdlen = scan_response_length;
    baton->adapter = obj->adapter;

    uv_queue_work(uv_default_loop(), baton->req, GapSetAdvertisingData, reinterpret_cast<uv_after_work_cb>(AfterGapSetAdvertisingData));
}

// This runs in a worker thread (not Main Thread)
void Adapter::GapSetAdvertisingData(uv_work_t *req)
{
    auto baton = static_cast<GapSetAdvertisingDataBaton *>(req->data);
    baton->result = sd_ble_gap_adv_data_set(baton->adapter, baton->data, baton->dlen, baton->sr_data, baton->srdlen);
}

// This runs in Main Thread
void Adapter::AfterGapSetAdvertisingData(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<GapSetAdvertisingDataBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "setting advertising data");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(1, argv, &resource);
    delete baton;
}

#pragma endregion GapSetAdvertisingData

#pragma region GapSetPPCP

NAN_METHOD(Adapter::GapSetPPCP)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    v8::Local<v8::Object> connectionParameters;
    v8::Local<v8::Function> callback;
    uint8_t argumentcount = 0;

    try
    {
        connectionParameters = ConversionUtility::getJsObject(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new GapSetPPCPBaton(callback);

    try
    {
        baton->p_conn_params = GapConnParams(connectionParameters);
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getStructErrorMessage("setppcp", error);
        Nan::ThrowTypeError(message);
        return;
    }
    baton->adapter = obj->adapter;

    uv_queue_work(uv_default_loop(), baton->req, GapSetPPCP, reinterpret_cast<uv_after_work_cb>(AfterGapSetPPCP));
}

// This runs in a worker thread (not Main Thread)
void Adapter::GapSetPPCP(uv_work_t *req)
{
    auto baton = static_cast<GapSetPPCPBaton *>(req->data);
    baton->result = sd_ble_gap_ppcp_set(baton->adapter, baton->p_conn_params);
}

// This runs in Main Thread
void Adapter::AfterGapSetPPCP(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<GapSetPPCPBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "setting ppcp");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(1, argv, &resource);
    delete baton;
}

#pragma endregion GapSetPPCP

#pragma region GapGetPPCP

NAN_METHOD(Adapter::GapGetPPCP)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    v8::Local<v8::Function> callback;
    uint8_t argumentcount = 0;

    try
    {
        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new GapGetPPCPBaton(callback);
    baton->p_conn_params = new ble_gap_conn_params_t();
    baton->adapter = obj->adapter;

    uv_queue_work(uv_default_loop(), baton->req, GapGetPPCP, reinterpret_cast<uv_after_work_cb>(AfterGapGetPPCP));
}

// This runs in a worker thread (not Main Thread)
void Adapter::GapGetPPCP(uv_work_t *req)
{
    auto baton = static_cast<GapGetPPCPBaton *>(req->data);
    baton->result = sd_ble_gap_ppcp_get(baton->adapter, baton->p_conn_params);
}

// This runs in Main Thread
void Adapter::AfterGapGetPPCP(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<GapGetPPCPBaton *>(req->data);
    v8::Local<v8::Value> argv[2];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "getting ppcp");
        argv[1] = Nan::Undefined();
    }
    else
    {
        argv[0] = Nan::Undefined();
        argv[1] = GapConnParams(baton->p_conn_params);
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(2, argv, &resource);
    delete baton;
}

#pragma endregion GapGetPPCP

#pragma region GapSetAppearance

NAN_METHOD(Adapter::GapSetAppearance)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    uint16_t appearance;
    v8::Local<v8::Function> callback;
    uint8_t argumentcount = 0;

    try
    {
        appearance = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new GapSetAppearanceBaton(callback);
    baton->appearance = appearance;
    baton->adapter = obj->adapter;

    uv_queue_work(uv_default_loop(), baton->req, GapSetAppearance, reinterpret_cast<uv_after_work_cb>(AfterGapSetAppearance));
}

// This runs in a worker thread (not Main Thread)
void Adapter::GapSetAppearance(uv_work_t *req)
{
    auto baton = static_cast<GapSetAppearanceBaton *>(req->data);
    baton->result = sd_ble_gap_appearance_set(baton->adapter, baton->appearance);
}

// This runs in Main Thread
void Adapter::AfterGapSetAppearance(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<GapSetAppearanceBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "setting appearance");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(1, argv, &resource);
    delete baton;
}
#pragma endregion GapSetAppearance

#pragma region GapGetAppearance
NAN_METHOD(Adapter::GapGetAppearance)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    v8::Local<v8::Function> callback;
    uint8_t argumentcount = 0;

    try
    {
        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new GapGetAppearanceBaton(callback);
    baton->adapter = obj->adapter;

    uv_queue_work(uv_default_loop(), baton->req, GapGetAppearance, reinterpret_cast<uv_after_work_cb>(AfterGapGetAppearance));
}

// This runs in a worker thread (not Main Thread)
void Adapter::GapGetAppearance(uv_work_t *req)
{
    auto baton = static_cast<GapGetAppearanceBaton *>(req->data);
    baton->result = sd_ble_gap_appearance_get(baton->adapter, &baton->appearance);
}

// This runs in Main Thread
void Adapter::AfterGapGetAppearance(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<GapGetAppearanceBaton *>(req->data);
    v8::Local<v8::Value> argv[2];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "getting appearance");
        argv[1] = Nan::Undefined();
    }
    else
    {
        argv[0] = Nan::Undefined();
        argv[1] = ConversionUtility::toJsNumber(baton->appearance);
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(2, argv, &resource);
    delete baton;
}
#pragma endregion GapGetAppearance

#pragma region GapReplyAuthKey

NAN_METHOD(Adapter::GapReplyAuthKey)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    uint16_t conn_handle;
    uint8_t key_type;
    uint8_t *key = nullptr;
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        conn_handle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        key_type = ConversionUtility::getNativeUint8(info[argumentcount]);
        argumentcount++;

        v8::Local<v8::Object> keyobject = ConversionUtility::getJsObjectOrNull(info[argumentcount]);

        if (!Utility::IsNull(keyobject))
        {
            key = ConversionUtility::getNativePointerToUint8(info[argumentcount]);
        }

        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    if (key != nullptr && key_type == BLE_GAP_AUTH_KEY_TYPE_PASSKEY)
    {
        if (!Utility::EnsureAsciiNumbers(key, BLE_GAP_PASSKEY_LEN))
        {
            v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, "ascii number");
            Nan::ThrowTypeError(message);
            free(key);
            return;
        }
    }

    auto baton = new GapReplyAuthKeyBaton(callback);
    baton->adapter = obj->adapter;
    baton->conn_handle = conn_handle;
    baton->key_type = key_type;
    baton->key = key;

    uv_queue_work(uv_default_loop(), baton->req, GapReplyAuthKey, reinterpret_cast<uv_after_work_cb>(AfterGapReplyAuthKey));
}

// This runs in a worker thread (not Main Thread)
void Adapter::GapReplyAuthKey(uv_work_t *req)
{
    auto baton = static_cast<GapReplyAuthKeyBaton *>(req->data);
    baton->result = sd_ble_gap_auth_key_reply(baton->adapter, baton->conn_handle, baton->key_type, baton->key);
}

// This runs in Main Thread
void Adapter::AfterGapReplyAuthKey(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<GapReplyAuthKeyBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "replying with auth key");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(1, argv, &resource);
    delete baton;
}
#pragma endregion GapReplyAuthKey

#pragma region GapReplyDHKeyLESC

NAN_METHOD(Adapter::GapReplyDHKeyLESC)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    uint16_t conn_handle;
    uint8_t *key;
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        conn_handle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        key = ConversionUtility::getNativePointerToUint8(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new GapReplyDHKeyLESCBaton(callback);
    baton->adapter = obj->adapter;
    baton->conn_handle = conn_handle;

    ble_gap_lesc_dhkey_t *dhkey = new ble_gap_lesc_dhkey_t();
    memcpy(dhkey->key, key, BLE_GAP_LESC_DHKEY_LEN);
    baton->dhkey = dhkey;
    free(key);

    uv_queue_work(uv_default_loop(), baton->req, GapReplyDHKeyLESC, reinterpret_cast<uv_after_work_cb>(AfterGapReplyDHKeyLESC));
}

// This runs in a worker thread (not Main Thread)
void Adapter::GapReplyDHKeyLESC(uv_work_t *req)
{
    auto baton = static_cast<GapReplyDHKeyLESCBaton *>(req->data);
    baton->result = sd_ble_gap_lesc_dhkey_reply(baton->adapter, baton->conn_handle, baton->dhkey);
}

// This runs in Main Thread
void Adapter::AfterGapReplyDHKeyLESC(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<GapReplyDHKeyLESCBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "replying with DH key (LESC)");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(1, argv, &resource);
    delete baton;
}
#pragma endregion GapReplyDHKeyLESC

#pragma region GapNotifyKeypress

NAN_METHOD(Adapter::GapNotifyKeypress)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    uint16_t conn_handle;
    uint8_t kp_not;
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        conn_handle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        kp_not = ConversionUtility::getNativeUint8(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new GapNotifyKeypressBaton(callback);
    baton->adapter = obj->adapter;
    baton->conn_handle = conn_handle;
    baton->kp_not = kp_not;

    uv_queue_work(uv_default_loop(), baton->req, GapNotifyKeypress, reinterpret_cast<uv_after_work_cb>(AfterGapNotifyKeypress));
}

// This runs in a worker thread (not Main Thread)
void Adapter::GapNotifyKeypress(uv_work_t *req)
{
    auto baton = static_cast<GapNotifyKeypressBaton *>(req->data);
    baton->result = sd_ble_gap_keypress_notify(baton->adapter, baton->conn_handle, baton->kp_not);
}

// This runs in Main Thread
void Adapter::AfterGapNotifyKeypress(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<GapNotifyKeypressBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "notify keypress");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(1, argv, &resource);
    delete baton;
}
#pragma endregion GapNotifyKeypress

#pragma region GapGetLESCOOBData

NAN_METHOD(Adapter::GapGetLESCOOBData)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    uint16_t conn_handle;
    uint8_t *key;
    ble_gap_lesc_p256_pk_t *p_pk_own = new ble_gap_lesc_p256_pk_t();
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        conn_handle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        key = ConversionUtility::getNativePointerToUint8(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new GapGetLESCOOBDataBaton(callback);
    baton->adapter = obj->adapter;
    baton->conn_handle = conn_handle;

    memcpy(p_pk_own->pk, key, BLE_GAP_LESC_P256_PK_LEN);
    free(key);
    baton->p_pk_own = p_pk_own;
    baton->p_oobd_own = new ble_gap_lesc_oob_data_t();

    uv_queue_work(uv_default_loop(), baton->req, GapGetLESCOOBData, reinterpret_cast<uv_after_work_cb>(AfterGapGetLESCOOBData));
}

// This runs in a worker thread (not Main Thread)
void Adapter::GapGetLESCOOBData(uv_work_t *req)
{
    auto baton = static_cast<GapGetLESCOOBDataBaton *>(req->data);
    baton->result = sd_ble_gap_lesc_oob_data_get(baton->adapter, baton->conn_handle, baton->p_pk_own, baton->p_oobd_own);
}

// This runs in Main Thread
void Adapter::AfterGapGetLESCOOBData(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<GapGetLESCOOBDataBaton *>(req->data);
    v8::Local<v8::Value> argv[2];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "get lesc oob data");
        argv[1] = Nan::Undefined();
    }
    else
    {
        argv[0] = Nan::Undefined();
        argv[1] = GapLescOobData(baton->p_oobd_own);
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(2, argv, &resource);
    delete baton;
}
#pragma endregion GapGetLESCOOBData

#pragma region GapSetLESCOOBData

NAN_METHOD(Adapter::GapSetLESCOOBData)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    uint16_t conn_handle;
    v8::Local<v8::Object> p_oobd_own;
    v8::Local<v8::Object> p_oobd_peer;
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        conn_handle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        p_oobd_own = ConversionUtility::getJsObjectOrNull(info[argumentcount]);
        argumentcount++;

        p_oobd_peer = ConversionUtility::getJsObjectOrNull(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new GapSetLESCOOBDataBaton(callback);
    baton->adapter = obj->adapter;
    baton->conn_handle = conn_handle;

    try
    {
        baton->p_oobd_own = GapLescOobData(p_oobd_own);
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getStructErrorMessage("p_oobd_own", error);
        Nan::ThrowTypeError(message);
        return;
    }

    try
    {
        baton->p_oobd_peer = GapLescOobData(p_oobd_peer);
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getStructErrorMessage("p_oobd_peer", error);
        Nan::ThrowTypeError(message);
        return;
    }

    uv_queue_work(uv_default_loop(), baton->req, GapSetLESCOOBData, reinterpret_cast<uv_after_work_cb>(AfterGapSetLESCOOBData));
}

// This runs in a worker thread (not Main Thread)
void Adapter::GapSetLESCOOBData(uv_work_t *req)
{
    auto baton = static_cast<GapSetLESCOOBDataBaton *>(req->data);
    baton->result = sd_ble_gap_lesc_oob_data_set(baton->adapter, baton->conn_handle, baton->p_oobd_own, baton->p_oobd_peer);
}

// This runs in Main Thread
void Adapter::AfterGapSetLESCOOBData(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<GapSetLESCOOBDataBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "set lesc oob data");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(1, argv, &resource);
    delete baton;
}
#pragma endregion GapSetLESCOOBData

#pragma endregion JavaScript function implementations

#pragma region JavaScript constants from ble_gap.h
extern "C" {
    void init_gap(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target)
    {
        // Constants from ble_gap.h

        /* GAP Event IDs.
        * IDs that uniquely identify an event coming from the stack to the application. */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_EVT_CONNECTED);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_EVT_DISCONNECTED);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_EVT_CONN_PARAM_UPDATE);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_EVT_SEC_PARAMS_REQUEST);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_EVT_SEC_INFO_REQUEST);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_EVT_PASSKEY_DISPLAY);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_EVT_KEY_PRESSED);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_EVT_AUTH_KEY_REQUEST);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_EVT_LESC_DHKEY_REQUEST);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_EVT_AUTH_STATUS);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_EVT_CONN_SEC_UPDATE);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_EVT_TIMEOUT);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_EVT_RSSI_CHANGED);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_EVT_ADV_REPORT);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_EVT_SEC_REQUEST);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_EVT_CONN_PARAM_UPDATE_REQUEST);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_EVT_SCAN_REQ_REPORT);

        /* GAP Option IDs */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_OPT_CH_MAP);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_OPT_LOCAL_CONN_LATENCY);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_OPT_PASSKEY);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_OPT_SCAN_REQ_REPORT);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_OPT_COMPAT_MODE);

#if NRF_SD_BLE_API_VERSION >= 3
        NODE_DEFINE_CONSTANT(target, BLE_GAP_OPT_AUTH_PAYLOAD_TIMEOUT);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_OPT_EXT_LEN);
#endif

        /* BLE_ERRORS_GAP SVC return values specific to GAP */
        NODE_DEFINE_CONSTANT(target, BLE_ERROR_GAP_UUID_LIST_MISMATCH); //UUID list does not contain an integral number of UUIDs.
        NODE_DEFINE_CONSTANT(target, BLE_ERROR_GAP_DISCOVERABLE_WITH_WHITELIST); //Use of Whitelist not permitted with discoverable advertising.
        NODE_DEFINE_CONSTANT(target, BLE_ERROR_GAP_INVALID_BLE_ADDR); //The upper two bits of the address do not correspond to the specified address type.
        NODE_DEFINE_CONSTANT(target, BLE_ERROR_GAP_WHITELIST_IN_USE); //Attempt to overwrite the whitelist while already in use by another operation.

        /* BLE_GAP_ROLES GAP Roles
        * @note Not explicitly used in peripheral API, but will be relevant for central API. */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ROLE_INVALID); //Invalid Role.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ROLE_PERIPH); //Peripheral Role.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ROLE_CENTRAL); //Central Role.

        /* BLE_GAP_TIMEOUT_SOURCES GAP Timeout sources */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_TIMEOUT_SRC_ADVERTISING); //Advertising timeout.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_TIMEOUT_SRC_SECURITY_REQUEST); //Security request timeout.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_TIMEOUT_SRC_SCAN); //Scanning timeout.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_TIMEOUT_SRC_CONN); //Connection timeout.
#if NRF_SD_BLE_API_VERSION >= 3
        NODE_DEFINE_CONSTANT(target, BLE_GAP_TIMEOUT_SRC_AUTH_PAYLOAD); //Authenticated payload timeout
#endif

        /* BLE_GAP_ADDR_TYPES GAP Address types */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ADDR_TYPE_PUBLIC); //Public address.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ADDR_TYPE_RANDOM_STATIC); //Random Static address.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ADDR_TYPE_RANDOM_PRIVATE_RESOLVABLE); //Private Resolvable address.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ADDR_TYPE_RANDOM_PRIVATE_NON_RESOLVABLE); //Private Non-Resolvable address.

        /* BLE_GAP_ADDR_CYCLE_MODES GAP Address cycle modes */
#if NRF_SD_BLE_API_VERSION <= 2
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ADDR_CYCLE_MODE_NONE); //Set addresses directly, no automatic address cycling.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ADDR_CYCLE_MODE_AUTO); //Automatically generate and update private addresses.
#endif
        /* The default interval in seconds at which a private address is refreshed when address cycle mode is @ref BLE_GAP_ADDR_CYCLE_MODE_AUTO.  */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_DEFAULT_PRIVATE_ADDR_CYCLE_INTERVAL_S);

        /* BLE address length. */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ADDR_LEN);


        /* BLE_GAP_AD_TYPE_DEFINITIONS GAP Advertising and Scan Response Data format
        * @note Found at https://www.bluetooth.org/Technical/AssignedNumbers/generic_access_profile.htm*/
        NODE_DEFINE_CONSTANT(target, BLE_GAP_AD_TYPE_FLAGS); //Flags for discoverability.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_AD_TYPE_16BIT_SERVICE_UUID_MORE_AVAILABLE); //Partial list of 16 bit service UUIDs.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_AD_TYPE_16BIT_SERVICE_UUID_COMPLETE); //Complete list of 16 bit service UUIDs.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_AD_TYPE_32BIT_SERVICE_UUID_MORE_AVAILABLE); //Partial list of 32 bit service UUIDs.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_AD_TYPE_32BIT_SERVICE_UUID_COMPLETE); //Complete list of 32 bit service UUIDs.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_AD_TYPE_128BIT_SERVICE_UUID_MORE_AVAILABLE); //Partial list of 128 bit service UUIDs.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_AD_TYPE_128BIT_SERVICE_UUID_COMPLETE); //Complete list of 128 bit service UUIDs.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_AD_TYPE_SHORT_LOCAL_NAME); //Short local device name.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_AD_TYPE_COMPLETE_LOCAL_NAME); //Complete local device name.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_AD_TYPE_TX_POWER_LEVEL); //Transmit power level.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_AD_TYPE_CLASS_OF_DEVICE); //Class of device.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_AD_TYPE_SIMPLE_PAIRING_HASH_C); //Simple Pairing Hash C.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_AD_TYPE_SIMPLE_PAIRING_RANDOMIZER_R); //Simple Pairing Randomizer R.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_AD_TYPE_SECURITY_MANAGER_TK_VALUE); //Security Manager TK Value.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_AD_TYPE_SECURITY_MANAGER_OOB_FLAGS); //Security Manager Out Of Band Flags.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_AD_TYPE_SLAVE_CONNECTION_INTERVAL_RANGE); //Slave Connection Interval Range.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_AD_TYPE_SOLICITED_SERVICE_UUIDS_16BIT); //List of 16-bit Service Solicitation UUIDs.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_AD_TYPE_SOLICITED_SERVICE_UUIDS_128BIT); //List of 128-bit Service Solicitation UUIDs.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_AD_TYPE_SERVICE_DATA); //Service Data - 16-bit UUID.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_AD_TYPE_PUBLIC_TARGET_ADDRESS); //Public Target Address.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_AD_TYPE_RANDOM_TARGET_ADDRESS); //Random Target Address.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_AD_TYPE_APPEARANCE); //Appearance.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_AD_TYPE_ADVERTISING_INTERVAL); //Advertising Interval.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_AD_TYPE_LE_BLUETOOTH_DEVICE_ADDRESS); //LE Bluetooth Device Address.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_AD_TYPE_LE_ROLE); //LE Role.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_AD_TYPE_SIMPLE_PAIRING_HASH_C256); //Simple Pairing Hash C-256.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_AD_TYPE_SIMPLE_PAIRING_RANDOMIZER_R256); //Simple Pairing Randomizer R-256.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_AD_TYPE_SERVICE_DATA_32BIT_UUID); //Service Data - 32-bit UUID.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_AD_TYPE_SERVICE_DATA_128BIT_UUID); //Service Data - 128-bit UUID.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_AD_TYPE_3D_INFORMATION_DATA); //3D Information Data.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_AD_TYPE_MANUFACTURER_SPECIFIC_DATA); //Manufacturer Specific Data.

        /* BLE_GAP_ADV_FLAGS GAP Advertisement Flags */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ADV_FLAG_LE_LIMITED_DISC_MODE); //LE Limited Discoverable Mode.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ADV_FLAG_LE_GENERAL_DISC_MODE); //LE General Discoverable Mode.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ADV_FLAG_BR_EDR_NOT_SUPPORTED); //BR/EDR not supported.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ADV_FLAG_LE_BR_EDR_CONTROLLER); //Simultaneous LE and BR/EDR, Controller.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ADV_FLAG_LE_BR_EDR_HOST); //Simultaneous LE and BR/EDR, Host.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ADV_FLAGS_LE_ONLY_LIMITED_DISC_MODE); //LE Limited Discoverable Mode, BR/EDR not supported.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ADV_FLAGS_LE_ONLY_GENERAL_DISC_MODE); //LE General Discoverable Mode, BR/EDR not supported.

        /* BLE_GAP_ADV_INTERVALS GAP Advertising interval max and min */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ADV_INTERVAL_MIN); //Minimum Advertising interval in 625 us units, i.e. 20 ms.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ADV_NONCON_INTERVAL_MIN); //Minimum Advertising interval in 625 us units for non connectable mode, i.e. 100 ms.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ADV_INTERVAL_MAX); //Maximum Advertising interval in 625 us units, i.e. 10.24 s.

        /* BLE_GAP_SCAN_INTERVALS GAP Scan interval max and min */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SCAN_INTERVAL_MIN); //Minimum Scan interval in 625 us units, i.e. 2.5 ms.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SCAN_INTERVAL_MAX); //Maximum Scan interval in 625 us units, i.e. 10.24 s.

        /* BLE_GAP_SCAN_WINDOW GAP Scan window max and min */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SCAN_WINDOW_MIN); //Minimum Scan window in 625 us units, i.e. 2.5 ms.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SCAN_WINDOW_MAX); //Maximum Scan window in 625 us units, i.e. 10.24 s.

        /* BLE_GAP_SCAN_TIMEOUT GAP Scan timeout max and min */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SCAN_TIMEOUT_MIN); //Minimum Scan timeout in seconds.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SCAN_TIMEOUT_MAX); //Maximum Scan timeout in seconds.

        /* Maximum size of advertising data in octets. */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ADV_MAX_SIZE);

        /* BLE_GAP_ADV_TYPES GAP Advertising types */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ADV_TYPE_ADV_IND); //Connectable undirected.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ADV_TYPE_ADV_DIRECT_IND); //Connectable directed.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ADV_TYPE_ADV_SCAN_IND); //Scannable undirected.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ADV_TYPE_ADV_NONCONN_IND); //Non connectable undirected.

        /* BLE_GAP_ADV_FILTER_POLICIES GAP Advertising filter policies */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ADV_FP_ANY); //Allow scan requests and connect requests from any device.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ADV_FP_FILTER_SCANREQ); //Filter scan requests with whitelist.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ADV_FP_FILTER_CONNREQ); //Filter connect requests with whitelist.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ADV_FP_FILTER_BOTH); //Filter both scan and connect requests with whitelist.

        /* BLE_GAP_ADV_TIMEOUT_VALUES GAP Advertising timeout values */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ADV_TIMEOUT_LIMITED_MAX); //Maximum advertising time in limited discoverable mode (TGAP(lim_adv_timeout) = 180s).
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ADV_TIMEOUT_GENERAL_UNLIMITED); //Unlimited advertising in general discoverable mode.

        /* BLE_GAP_DISC_MODES GAP Discovery modes */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_DISC_MODE_NOT_DISCOVERABLE); //Not discoverable discovery Mode.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_DISC_MODE_LIMITED); //Limited Discovery Mode.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_DISC_MODE_GENERAL); //General Discovery Mode.

        /* BLE_GAP_IO_CAPS GAP IO Capabilities */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_IO_CAPS_DISPLAY_ONLY); //Display Only.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_IO_CAPS_DISPLAY_YESNO); //Display and Yes/No entry.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_IO_CAPS_KEYBOARD_ONLY); //Keyboard Only.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_IO_CAPS_NONE); //No I/O capabilities.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_IO_CAPS_KEYBOARD_DISPLAY); //Keyboard and Display.

        /* BLE_GAP_AUTH_KEY_TYPES GAP Authentication Key Types */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_AUTH_KEY_TYPE_NONE); //No key (may be used to reject).
        NODE_DEFINE_CONSTANT(target, BLE_GAP_AUTH_KEY_TYPE_PASSKEY); //6-digit Passkey.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_AUTH_KEY_TYPE_OOB); //Out Of Band data.

        /* BLE_GAP_SEC_STATUS GAP Security status */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_SUCCESS); // Procedure completed with success.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_TIMEOUT); // Procedure timed out.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_PDU_INVALID); // Invalid PDU received.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_RFU_RANGE1_BEGIN); // Reserved for Future Use range #1 begin.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_RFU_RANGE1_END); // Reserved for Future Use range #1 end.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_PASSKEY_ENTRY_FAILED); // Passkey entry failed (user cancelled or other).
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_OOB_NOT_AVAILABLE); // Out of Band Key not available.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_AUTH_REQ); // Authentication requirements not met.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_CONFIRM_VALUE); // Confirm value failed.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_PAIRING_NOT_SUPP); // Pairing not supported.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_ENC_KEY_SIZE); // Encryption key size.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_SMP_CMD_UNSUPPORTED); // Unsupported SMP command.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_UNSPECIFIED); // Unspecified reason.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_REPEATED_ATTEMPTS); // Too little time elapsed since last attempt.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_INVALID_PARAMS); // Invalid parameters.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_DHKEY_FAILURE); // DHKey check failure.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_NUM_COMP_FAILURE); // Numeric Comparison failure.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_BR_EDR_IN_PROG); // BR/EDR pairing in progress.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_X_TRANS_KEY_DISALLOWED); // BR/EDR Link Key cannot be used for LE keys.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_RFU_RANGE2_BEGIN); // Reserved for Future Use range #2 begin.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_RFU_RANGE2_END); // Reserved for Future Use range #2 end.

        /* BLE_GAP_SEC_STATUS_SOURCES GAP Security status sources */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_SOURCE_LOCAL); //Local failure.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_SOURCE_REMOTE); //Remote failure.

        /* BLE_GAP_CP_LIMITS GAP Connection Parameters Limits */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_CP_MIN_CONN_INTVL_NONE); //No new minimum connction interval specified in connect parameters.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_CP_MIN_CONN_INTVL_MIN); //Lowest mimimum connection interval permitted, in units of 1.25 ms, i.e. 7.5 ms.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_CP_MIN_CONN_INTVL_MAX); //Highest minimum connection interval permitted, in units of 1.25 ms, i.e. 4 s.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_CP_MAX_CONN_INTVL_NONE); //No new maximum connction interval specified in connect parameters.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_CP_MAX_CONN_INTVL_MIN); //Lowest maximum connection interval permitted, in units of 1.25 ms, i.e. 7.5 ms.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_CP_MAX_CONN_INTVL_MAX); //Highest maximum connection interval permitted, in units of 1.25 ms, i.e. 4 s.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_CP_SLAVE_LATENCY_MAX); //Highest slave latency permitted, in connection events.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_CP_CONN_SUP_TIMEOUT_NONE); //No new supervision timeout specified in connect parameters.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_CP_CONN_SUP_TIMEOUT_MIN); //Lowest supervision timeout permitted, in units of 10 ms, i.e. 100 ms.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_CP_CONN_SUP_TIMEOUT_MAX); //Highest supervision timeout permitted, in units of 10 ms, i.e. 32 s.

#if NRF_SD_BLE_API_VERSION >= 3
        /* Default number of octets in device name. */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_DEVNAME_DEFAULT_LEN);
#endif
        /* Maximum number of octets in device name. */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_DEVNAME_MAX_LEN);

        /* Disable RSSI events for connections */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_RSSI_THRESHOLD_INVALID);

        /* GAP Security Random Number Length. */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_RAND_LEN);

        /* GAP Security Key Length. */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_KEY_LEN);

        /* GAP Passkey Length. */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_PASSKEY_LEN);

        /* Maximum amount of addresses in a whitelist. */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_WHITELIST_ADDR_MAX_COUNT);

#if NRF_SD_BLE_API_VERSION <= 2
        /* Maximum amount of IRKs in a whitelist.
        * @note  The number of IRKs is limited to 8, even if the hardware supports more. */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_WHITELIST_IRK_MAX_COUNT);
#elif NRF_SD_BLE_API_VERSION >= 3
        /* Maximum amount of identities in the device identities list. */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_DEVICE_IDENTITIES_MAX_COUNT);
#endif

        /* GAP_SEC_MODES GAP Security Modes */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_MODE); //No key (may be used to reject).

        /* GAP Keypress Notification Types */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_KP_NOT_TYPE_PASSKEY_START);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_KP_NOT_TYPE_PASSKEY_DIGIT_IN);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_KP_NOT_TYPE_PASSKEY_DIGIT_OUT);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_KP_NOT_TYPE_PASSKEY_CLEAR);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_KP_NOT_TYPE_PASSKEY_END);
    }
}

#pragma endregion
