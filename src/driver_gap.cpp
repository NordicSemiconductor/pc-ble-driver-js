#include "common.h"
#include "driver_gap.h"

#include <cstdlib>
#include <cstdio>
#include <mutex>

// stdout for debugging
#include <iostream>

#define UUID_128_BIT_STR_SIZE 36
#define UUID_128_BIT_SPRINTF "%04X%04X-0000-1000-8000-00805F9B34FB"
#define UUID_128_BIT_COMPLETE_SPRINTF "%04X%04X-%04X-%04X-%04X-%04X%04X%04X"

static name_map_t gap_adv_type_map = {
    NAME_MAP_ENTRY(BLE_GAP_ADV_TYPE_ADV_IND),
    NAME_MAP_ENTRY(BLE_GAP_ADV_TYPE_ADV_DIRECT_IND),
    NAME_MAP_ENTRY(BLE_GAP_ADV_TYPE_ADV_SCAN_IND),
    NAME_MAP_ENTRY(BLE_GAP_ADV_TYPE_ADV_NONCONN_IND)
};

static name_map_t gap_role_map = {
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

static name_map_t gap_auth_key_type_map =
{
    NAME_MAP_ENTRY(BLE_GAP_AUTH_KEY_TYPE_NONE),
    NAME_MAP_ENTRY(BLE_GAP_AUTH_KEY_TYPE_PASSKEY),
    NAME_MAP_ENTRY(BLE_GAP_AUTH_KEY_TYPE_OOB)
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
    NAME_MAP_ENTRY(BLE_GAP_SEC_STATUS_RFU_RANGE2_BEGIN),
    NAME_MAP_ENTRY(BLE_GAP_SEC_STATUS_RFU_RANGE2_END)
};

static name_map_t gap_sec_status_sources_map =
{
    NAME_MAP_ENTRY(BLE_GAP_SEC_STATUS_SOURCE_LOCAL),
    NAME_MAP_ENTRY(BLE_GAP_SEC_STATUS_SOURCE_REMOTE)
};


// BleDriverEvent -- START --
// BleDriverEvent -- END --

//
// GapAddr -- START --
//

v8::Local<v8::Object> GapAddr::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();

    // Create a text string of the address. The when the NanUtf8String string is out of
    // its scope, the underlaying string is freed.

    size_t addr_len = BLE_GAP_ADDR_LEN * 3; // Each byte -> 2 chars, : separator _between_ each byte and a null termination byte
    char *addr = (char*)malloc(addr_len);
	assert(addr != NULL);
    uint8_t *ptr = native->addr;

    sprintf(addr, "%02X:%02X:%02X:%02X:%02X:%02X", ptr[5], ptr[4], ptr[3], ptr[2], ptr[1], ptr[0]);

    Utility::Set(obj, "address", addr);
    Utility::Set(obj, "type", gap_addr_type_map[native->addr_type]);

    free(addr);

    return scope.Escape(obj);
}

ble_gap_addr_t *GapAddr::ToNative()
{
    ble_gap_addr_t *address = new ble_gap_addr_t();

    uint32_t ptr[BLE_GAP_ADDR_LEN];

    v8::Local<v8::Value> getAddress = Utility::Get(jsobj, "address");
    v8::Local<v8::String> addressString = getAddress->ToString();
    size_t addr_len = addressString->Length() + 1;
    char *addr = (char*)malloc(addr_len);
	assert(addr != NULL);
    addressString->WriteUtf8(addr, addr_len);

    int scan_count = sscanf(addr, "%hhx:%hhx:%hhx:%hhx:%hhx:%hhx", &(ptr[5]), &(ptr[4]), &(ptr[3]), &(ptr[2]), &(ptr[1]), &(ptr[0]));
	assert(scan_count == 6);

    free(addr);

    for (int i = 0; i < BLE_GAP_ADDR_LEN; i++)
    {
        address->addr[i] = (uint8_t)ptr[i];
    }

    v8::Local<v8::Value> getAddressType = Utility::Get(jsobj, "type");
    v8::Local<v8::String> addressTypeString = getAddressType->ToString();
    size_t type_len = addressTypeString->Length() + 1;
    char *typeString = (char *)malloc(type_len);
    addressTypeString->WriteUtf8(typeString, type_len);
    address->addr_type = (uint8_t)fromNameToValue(gap_addr_type_map, typeString);

    free(typeString);

    return address;
}

//
// GapAddr -- END --
//

//
// GapConnParams -- START --
//

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
    ble_gap_conn_params_t *conn_params = new ble_gap_conn_params_t();
    memset(conn_params, 0, sizeof(ble_gap_conn_params_t));

    conn_params->min_conn_interval = ConversionUtility::msecsToUnitsUint16(jsobj, "min_conn_interval", ConversionUtility::ConversionUnit1250ms);
    conn_params->max_conn_interval = ConversionUtility::msecsToUnitsUint16(jsobj, "max_conn_interval", ConversionUtility::ConversionUnit1250ms);
    conn_params->slave_latency = ConversionUtility::getNativeUint16(jsobj, "slave_latency");
    conn_params->conn_sup_timeout = ConversionUtility::msecsToUnitsUint16(jsobj, "conn_sup_timeout", ConversionUtility::ConversionUnit10s);

    return conn_params;
}

//
// GapConnParams -- END --
//


//
// GapConnSecMode -- START --
//

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
    ble_gap_conn_sec_mode_t *conn_sec_mode = new ble_gap_conn_sec_mode_t();

    conn_sec_mode->sm = ConversionUtility::getNativeUint8(jsobj, "sm");
    conn_sec_mode->lv = ConversionUtility::getNativeUint8(jsobj, "lv");

    return conn_sec_mode;
}

//
// GapConnSecMode -- END --
//

//
// GapAdvReport -- START --
//
v8::Local<v8::Object> GapAdvReport::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);
    Utility::Set(obj, "rssi", evt->rssi);
    Utility::Set(obj, "peer_addr", GapAddr(&(this->evt->peer_addr)).ToJs());
    Utility::Set(obj, "scan_rsp", ConversionUtility::toJsBool(evt->scan_rsp));

    if (this->evt->scan_rsp == 1) 
    {
        Utility::Set(obj, "adv_type", gap_adv_type_map[this->evt->type]); // TODO: add support for non defined adv types
    }

    uint8_t dlen = this->evt->dlen;

    if (dlen != 0)
    {
        // Attach a scan_rsp object to the adv_report
        v8::Local<v8::Object> data_obj = Nan::New<v8::Object>();
        Utility::Set(obj, "data", data_obj);

        uint8_t *data = evt->data;

        // TODO: Evaluate if buffer is the correct datatype for advertisement data
        Utility::Set(data_obj, "raw", ConversionUtility::toJsValueArray(data, dlen));

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
                int flags_array_idx = 0;
                uint8_t flags = data[pos + 1];

                for (name_map_it_t iterator = gap_adv_flags_map.begin(); iterator != gap_adv_flags_map.end(); iterator++)
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
                Utility::Set(data_obj, gap_ad_type_map[ad_type], ConversionUtility::toJsString((char *)&data[offset], name_len));
            }
            else if (ad_type == BLE_GAP_AD_TYPE_16BIT_SERVICE_UUID_MORE_AVAILABLE || ad_type == BLE_GAP_AD_TYPE_16BIT_SERVICE_UUID_COMPLETE)
            {
                v8::Local<v8::Array> uuid_array = Nan::New<v8::Array>();
                uint8_t array_pos = 0;
                uint8_t sub_pos = pos + 1;

                // Fetch 16 bit UUIDS and put them into the array
                for (int i = 0; i < ad_len - 1; i += 2)
                {
                    char *uuid_as_text = (char*)malloc(UUID_128_BIT_STR_SIZE + 1);
					assert(uuid_as_text != NULL);
                    sprintf(uuid_as_text, UUID_128_BIT_SPRINTF, 0, uint16_decode((uint8_t*)data + sub_pos + i));
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
                for (int i = 0; i < ad_len - 1; i += 4)
                {
                    char *uuid_as_text = (char*)malloc(UUID_128_BIT_STR_SIZE + 1);
					assert(uuid_as_text != NULL);

                    sprintf(uuid_as_text, UUID_128_BIT_SPRINTF,
                            uint16_decode((uint8_t*)data + sub_pos + 2 + i),
                            uint16_decode((uint8_t*)data + sub_pos + 0 + i));
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
                for (int i = 0; i < ad_len - 1; i += 16)
                {
                    char *uuid_as_text = (char*)malloc(UUID_128_BIT_STR_SIZE + 1);
                    assert(uuid_as_text != NULL);

                    sprintf(
                        uuid_as_text,
                        UUID_128_BIT_COMPLETE_SPRINTF,
                        uint16_decode((uint8_t*)data + (sub_pos + i + 14)),
                        uint16_decode((uint8_t*)data + (sub_pos + i + 12)),
                        uint16_decode((uint8_t*)data + (sub_pos + i + 10)),
                        uint16_decode((uint8_t*)data + (sub_pos + i + 8)),
                        uint16_decode((uint8_t*)data + (sub_pos + i + 6)),
                        uint16_decode((uint8_t*)data + (sub_pos + i + 4)),
                        uint16_decode((uint8_t*)data + (sub_pos + i + 2)),
                        uint16_decode((uint8_t*)data + (sub_pos + i + 0))
                        );
                    Nan::Set(uuid_array, Nan::New<v8::Integer>(array_pos), ConversionUtility::toJsString(uuid_as_text));
                    free(uuid_as_text);
                    array_pos++;
                }

                Utility::Set(data_obj, gap_ad_type_map[ad_type], uuid_array);
            }
            else if (ad_type == BLE_GAP_AD_TYPE_SERVICE_DATA)
            {
                //std::cout << "Not processed: " << gap_ad_type_map[ad_type] << std::endl;
                // data_obj->Set(Nan::New(gap_ad_type_map[ad_type]), Nan::New((data[pos + 1] << 8) + data[pos + 2]));
            }
            else if (ad_type == BLE_GAP_AD_TYPE_TX_POWER_LEVEL)
            {
                if(ad_len - 1 == 1)
                {
                    Utility::Set(data_obj, gap_ad_type_map[ad_type], Nan::New<v8::Integer>(data[pos + 1]));
                } else {
                    std::cerr << "Wrong length of AD_TYPE :" << gap_ad_type_map[ad_type] << std::endl;
                }
            }
            else
            {
                // std::cout << "Not processed: " << gap_ad_type_map[ad_type] << std::endl;
            }

            pos += ad_len; // Jump to the next AD Type
        }
    }

    return scope.Escape(obj);
}

//
// GapAdvReport -- END --
//

//
// GapScanReqReport -- START --
//
v8::Local<v8::Object> GapScanReqReport::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);
    Utility::Set(obj, "rssi", evt->rssi);
    Utility::Set(obj, "peer_addr", GapAddr(&(this->evt->peer_addr)).ToJs());

    return scope.Escape(obj);
}

//
// GapScanReqReport -- END --
//

//
// GapConnected -- START --
//
v8::Local<v8::Object> GapConnected::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);

    Utility::Set(obj, "own_addr", GapAddr(&(evt->own_addr)).ToJs());
    Utility::Set(obj, "peer_addr", GapAddr(&(evt->peer_addr)).ToJs());
    Utility::Set(obj, "role", ConversionUtility::valueToJsString(evt->role, gap_role_map));
    Utility::Set(obj, "conn_params", GapConnParams(&(evt->conn_params)).ToJs());
    Utility::Set(obj, "irk_match", ConversionUtility::toJsBool(evt->irk_match));

    if (evt->irk_match == 1)
    {
        Utility::Set(obj, "irk_idx", evt->irk_match_idx);
    }

    return scope.Escape(obj);
}

//
// GapConnected -- END --
//

//
// GapDisconnected -- START --
//
v8::Local<v8::Object> GapDisconnected::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);
    Utility::Set(obj, "reason", evt->reason);
    Utility::Set(obj, "reason_name", HciStatus::getHciStatus(evt->reason));

    return scope.Escape(obj);
}

//
// GapDisconnected -- END --
//

//
// GapTimeout -- START --
//
v8::Local<v8::Object> GapTimeout::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);
    Utility::Set(obj, "src", evt->src);
    Utility::Set(obj, "src_name", ConversionUtility::valueToJsString(evt->src, gap_timeout_sources_map));

    return scope.Escape(obj);
}

//
// GapTimeout -- END --
//

//
// GapRssiChanged -- START --
//
v8::Local<v8::Object> GapRssiChanged::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);
    Utility::Set(obj, "rssi", evt->rssi);

    return scope.Escape(obj);
}

//
// GapRssiChanged -- END --
//

//
// GapConnParamUpdate -- START --
//
v8::Local<v8::Object> GapConnParamUpdate::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);
    Utility::Set(obj, "conn_params", GapConnParams(&(this->evt->conn_params)).ToJs());

    return scope.Escape(obj);
}

//
// GapConnParamUpdate -- END --
//

//
// GapConnParamUpdateRequest -- START --
//
v8::Local<v8::Object> GapConnParamUpdateRequest::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);
    Utility::Set(obj, "conn_params", GapConnParams(&(this->evt->conn_params)).ToJs());
    return scope.Escape(obj);
}

//
// GapConnParamUpdateRequest -- END --
//


//
// GapSecParamsRequest -- START --
//

v8::Local<v8::Object> GapSecParamsRequest::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);
    Utility::Set(obj, "peer_params", GapSecParams(&(this->evt->peer_params)).ToJs());
    return scope.Escape(obj);
}

//
// GapSecParamsRequest -- END --
//

//
// GapAuthStatus -- START --
//

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
    Utility::Set(obj, "kdist_periph", GapSecKdist(&(evt->kdist_periph)).ToJs());
    Utility::Set(obj, "kdist_central", GapSecKdist(&(evt->kdist_central)).ToJs());
    return scope.Escape(obj);
}

//
// GapAuthStatus -- END --
//

//
// GapConnSecUpdate -- START --
//

v8::Local<v8::Object> GapConnSecUpdate::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);
    Utility::Set(obj, "conn_sec", GapConnSec(&(evt->conn_sec)).ToJs());
    return scope.Escape(obj);
}

//
// GapConnSecUpdate -- END --
//

// GapSecInfoRequest -- START --

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

// GapSecInfoRequest -- END --

// GapSecRequest -- START --

v8::Local<v8::Object> GapSecRequest::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);
    Utility::Set(obj, "bond", ConversionUtility::toJsBool(evt->bond));
    Utility::Set(obj, "mitm", ConversionUtility::toJsBool(evt->mitm));
    return scope.Escape(obj);
}

// GapSecRequest -- END --

//
// GapSecParams -- START --
//

v8::Local<v8::Object> GapSecParams::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Utility::Set(obj, "bond", ConversionUtility::toJsBool(native->bond));
    Utility::Set(obj, "mitm", ConversionUtility::toJsBool(native->mitm));
    Utility::Set(obj, "io_caps", ConversionUtility::valueToJsString(native->io_caps, gap_io_caps_map));
    Utility::Set(obj, "oob", ConversionUtility::toJsBool(native->oob));
    Utility::Set(obj, "min_key_size", native->min_key_size);
    Utility::Set(obj, "max_key_size", native->max_key_size);
    Utility::Set(obj, "kdist_periph", GapSecKdist(&(native->kdist_periph)).ToJs());
    Utility::Set(obj, "kdist_central", GapSecKdist(&(native->kdist_central)).ToJs());

    return scope.Escape(obj);
}

ble_gap_sec_params_t *GapSecParams::ToNative()
{
    ble_gap_sec_params_t *params = new ble_gap_sec_params_t();
    memset(params, 0, sizeof(ble_gap_sec_params_t));

    params->bond = ConversionUtility::getNativeBool(jsobj, "bond");
    params->mitm = ConversionUtility::getNativeBool(jsobj, "mitm");

    params->io_caps = ConversionUtility::getNativeUint8(jsobj, "io_caps");

    params->oob = ConversionUtility::getNativeBool(jsobj, "oob");
    params->min_key_size = ConversionUtility::getNativeUint8(jsobj, "min_key_size");
    params->max_key_size = ConversionUtility::getNativeUint8(jsobj, "max_key_size");
    params->kdist_periph = GapSecKdist(ConversionUtility::getJsObject(jsobj, "kdist_periph"));
    params->kdist_central = GapSecKdist(ConversionUtility::getJsObject(jsobj, "kdist_central"));

    return params;
}

//
// GapSecParams -- END --
//

//
// GapSecKdist -- START --
//

v8::Local<v8::Object> GapSecKdist::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Utility::Set(obj, "enc", ConversionUtility::toJsBool(native->enc));
    Utility::Set(obj, "id", ConversionUtility::toJsBool(native->id));
    Utility::Set(obj, "sign", ConversionUtility::toJsBool(native->sign));

    return scope.Escape(obj);
}

ble_gap_sec_kdist_t *GapSecKdist::ToNative()
{
    ble_gap_sec_kdist_t *kdist = new ble_gap_sec_kdist_t();
    memset(kdist, 0, sizeof(ble_gap_sec_kdist_t));

    kdist->enc = ConversionUtility::getNativeBool(jsobj, "enc");
    kdist->id = ConversionUtility::getNativeBool(jsobj, "id");
    kdist->sign = ConversionUtility::getNativeBool(jsobj, "sign");

    return kdist;
}

//
// GapSecKdist -- END --
//

//
// GapSecKeyset -- START --
//

v8::Local<v8::Object> GapSecKeyset::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Utility::Set(obj, "keys_periph", GapSecKeys(&native->keys_periph).ToJs());
    Utility::Set(obj, "keys_central", GapSecKeys(&native->keys_central).ToJs());

    return scope.Escape(obj);
}

ble_gap_sec_keyset_t *GapSecKeyset::ToNative()
{
    ble_gap_sec_keyset_t *keyset = new ble_gap_sec_keyset_t();
    memset(keyset, 0, sizeof(ble_gap_sec_keyset_t));

    keyset->keys_periph = GapSecKeys(ConversionUtility::getJsObject(jsobj, "keys_periph"));
    keyset->keys_central = GapSecKeys(ConversionUtility::getJsObject(jsobj, "keys_central"));

    return keyset;
}

//
// GapSecKeyset -- END --
//

// 
// GapSecKeys -- START --
// 

v8::Local<v8::Object> GapSecKeys::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Utility::Set(obj, "p_enc_key", GapEncKey(native->p_enc_key).ToJs());
    Utility::Set(obj, "p_id_key", GapIdKey(native->p_id_key).ToJs());
    Utility::Set(obj, "p_sign_key", GapSignInfo(native->p_sign_key).ToJs());

    return scope.Escape(obj);
}

ble_gap_sec_keys_t *GapSecKeys::ToNative()
{
    ble_gap_sec_keys_t *keys = new ble_gap_sec_keys_t();
    memset(keys, 0, sizeof(ble_gap_sec_keys_t));

    keys->p_enc_key = GapEncKey(ConversionUtility::getJsObject(jsobj, "p_enc_key"));
    keys->p_id_key = GapIdKey(ConversionUtility::getJsObject(jsobj, "p_id_key"));
    keys->p_sign_key = GapSignInfo(ConversionUtility::getJsObject(jsobj, "p_sign_key"));

    return keys;
}

// 
// GapSecKeys -- END --
// 

// 
// GapEncKeys -- START --
// 

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
    ble_gap_enc_key_t* enc_key = new ble_gap_enc_key_t();
    memset(enc_key, 0, sizeof(ble_gap_enc_key_t));

    enc_key->enc_info = GapEncInfo(ConversionUtility::getJsObject(jsobj, "enc_info"));
    enc_key->master_id = GapMasterId(ConversionUtility::getJsObject(jsobj, "master_id"));

    return enc_key;
}

// 
// GapEncKeys -- END --
// 

// 
// GapIdKey -- START --
// 

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
    ble_gap_id_key_t* id_key = new ble_gap_id_key_t();
    memset(id_key, 0, sizeof(ble_gap_id_key_t));

    id_key->id_info = GapIrk(ConversionUtility::getJsObject(jsobj, "id_info"));
    id_key->id_addr_info = GapAddr(ConversionUtility::getJsObject(jsobj, "id_addr_info"));

    return id_key;
}

// 
// GapIdKey -- END --
// 

// 
// GapSignInfo -- START --
// 

v8::Local<v8::Object> GapSignInfo::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Utility::Set(obj, "csrk", ConversionUtility::toJsValueArray(native->csrk, BLE_GAP_SEC_KEY_LEN));

    return scope.Escape(obj);
}

ble_gap_sign_info_t *GapSignInfo::ToNative()
{
    ble_gap_sign_info_t *sign_info = new ble_gap_sign_info_t();
    memset(sign_info, 0, sizeof(ble_gap_sign_info_t));

    uint8_t *p_csrk = ConversionUtility::getNativePointerToUint8(jsobj, "csrk");

    for (int i = 0; i < BLE_GAP_SEC_KEY_LEN; i++)
    {
        sign_info->csrk[i] = p_csrk[i];
    }

    return sign_info;
}

// 
// GapSignInfo -- END --
// 

// 
// GapIrk -- START --
// 

v8::Local<v8::Object> GapIrk::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Utility::Set(obj, "irk", ConversionUtility::toJsValueArray(native->irk, BLE_GAP_SEC_KEY_LEN));
    return scope.Escape(obj);
}

ble_gap_irk_t *GapIrk::ToNative()
{
    ble_gap_irk_t *irk = new ble_gap_irk_t();
    memset(irk, 0, sizeof(ble_gap_irk_t));

    uint8_t *p_irk = ConversionUtility::getNativePointerToUint8(jsobj, "irk");

    for (int i = 0; i < BLE_GAP_SEC_KEY_LEN; i++)
    {
        irk->irk[i] = p_irk[i];
    }

    return irk;
}

// 
// GapIrk -- END --
// 

// 
// GapEncInfo -- START --
// 

v8::Local<v8::Object> GapEncInfo::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Utility::Set(obj, "ltk", ConversionUtility::toJsValueArray(native->ltk, BLE_GAP_SEC_KEY_LEN));
    Utility::Set(obj, "auth", ConversionUtility::toJsBool(native->auth));
    Utility::Set(obj, "ltk_len", native->ltk_len);
    return scope.Escape(obj);
}

ble_gap_enc_info_t *GapEncInfo::ToNative()
{
    ble_gap_enc_info_t* enc_info = new ble_gap_enc_info_t();
    memset(enc_info, 0, sizeof(ble_gap_enc_info_t));

    uint8_t *p_ltk = ConversionUtility::getNativePointerToUint8(jsobj, "ltk");

    for (int i = 0; i < BLE_GAP_SEC_KEY_LEN; i++)
    {
        enc_info->ltk[i] = p_ltk[i];
    }

    enc_info->auth = ConversionUtility::getNativeBool(jsobj, "auth");
    enc_info->ltk_len = ConversionUtility::getNativeUint8(jsobj, "ltk_len");

    return enc_info;
}

// 
// GapEncInfo -- END --
// 

// 
// GapMasterId -- START --
// 

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
    ble_gap_master_id_t *master_id = new ble_gap_master_id_t();
    memset(master_id, 0, sizeof(ble_gap_master_id_t));

    master_id->ediv = ConversionUtility::getNativeUint16(jsobj, "ediv");


    uint8_t *p_rand = ConversionUtility::getNativePointerToUint8(jsobj, "rand");

    for (int i = 0; i < BLE_GAP_SEC_RAND_LEN; i++)
    {
        master_id->rand[i] = p_rand[i];
    }

    return master_id;
}

// 
// GapMasterId -- END --
// 

//
// GapSecLevels -- START --
//

v8::Local<v8::Object> GapSecLevels::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Utility::Set(obj, "lv1", ConversionUtility::toJsBool(native->lv1));
    Utility::Set(obj, "lv2", ConversionUtility::toJsBool(native->lv2));
    Utility::Set(obj, "lv3", ConversionUtility::toJsBool(native->lv3));
    return scope.Escape(obj);
}

ble_gap_sec_levels_t *GapSecLevels::ToNative()
{
    ble_gap_sec_levels_t *sec_levels = new ble_gap_sec_levels_t();
    memset(sec_levels, 0, sizeof(ble_gap_sec_levels_t));

    sec_levels->lv1 = ConversionUtility::getNativeBool(jsobj, "lv1");
    sec_levels->lv2 = ConversionUtility::getNativeBool(jsobj, "lv2");
    sec_levels->lv3 = ConversionUtility::getNativeBool(jsobj, "lv3");

    return sec_levels;
}

//
// GapSecLevels -- END --
//

//
// GapConnSec -- START --
//

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
    ble_gap_conn_sec_t *conn_sec = new ble_gap_conn_sec_t();
    memset(conn_sec, 0, sizeof(ble_gap_conn_sec_t));

    conn_sec->sec_mode = GapConnSecMode(ConversionUtility::getJsObject(jsobj, "sec_mode"));
    conn_sec->encr_key_size = ConversionUtility::getNativeUint8(jsobj, "encr_key_size");

    return conn_sec;
}

//
// GapConnSec -- END --
//

//
// GapScanParams -- START --
//

v8::Local<v8::Object> GapScanParams::ToJs()
{
    Nan::EscapableHandleScope scope;
    // Scan parameters are never retrieved from driver.
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    return scope.Escape(obj);
}

ble_gap_scan_params_t *GapScanParams::ToNative()
{
    ble_gap_scan_params_t *params = new ble_gap_scan_params_t();
    memset(params, 0, sizeof(ble_gap_scan_params_t));

    params->active = ConversionUtility::getNativeBool(jsobj, "active");
    //params->selective = ConversionUtility::getNativeBool(jsobj, "selective");
    //TODO: Add whitelist
    params->interval = ConversionUtility::msecsToUnitsUint16(jsobj, "interval", ConversionUtility::ConversionUnit625ms);
    params->window = ConversionUtility::msecsToUnitsUint16(jsobj, "window", ConversionUtility::ConversionUnit625ms);
    params->timeout = ConversionUtility::getNativeUint16(jsobj, "timeout");

    return params;
}

//
// GapScanParams -- END --
//

//
// GapAdvParams -- START --
//

v8::Local<v8::Object> GapAdvParams::ToJs()
{
    Nan::EscapableHandleScope scope;
    // Advertisement parameters are never retrieved from driver.
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    return scope.Escape(obj);
}

ble_gap_adv_params_t *GapAdvParams::ToNative()
{
    ble_gap_adv_params_t *params = new ble_gap_adv_params_t();
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

//
// GapAdvParams -- END --
//

//
// GapAdvChannelMask -- START --
//

v8::Local<v8::Object> GapAdvChannelMask::ToJs()
{
    Nan::EscapableHandleScope scope;
    // Channel Mask are never retrieved from driver.
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    return scope.Escape(obj);
}

ble_gap_adv_ch_mask_t *GapAdvChannelMask::ToNative()
{
    ble_gap_adv_ch_mask_t *mask = new ble_gap_adv_ch_mask_t();
    memset(mask, 0, sizeof(ble_gap_adv_ch_mask_t));

    mask->ch_37_off = ConversionUtility::getNativeUint8(jsobj, "ch_37_off");
    mask->ch_38_off = ConversionUtility::getNativeUint8(jsobj, "ch_38_off");
    mask->ch_39_off = ConversionUtility::getNativeUint8(jsobj, "ch_39_off");

    return mask;
}

//
// GapAdvChannelMask -- END --
//

NAN_METHOD(GapSetAddress)
{
    uint8_t address_cycle_mode;
    v8::Local<v8::Object> addressObject;
    v8::Local<v8::Function> callback;
    int argumentcount = 0;

    try
    {
        address_cycle_mode = ConversionUtility::getNativeUint8(info[argumentcount]);
        argumentcount++;

        addressObject = ConversionUtility::getJsObject(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (char const *error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    ble_gap_addr_t *address;

    try
    {
        address = GapAddr(addressObject);
    }
    catch (char const *)
    {
        Nan::ThrowTypeError("The provided address can not be parsed as an address.");
        return;
    }


    GapAddressSetBaton *baton = new GapAddressSetBaton(callback);
    baton->addr_cycle_mode = address_cycle_mode;
    baton->address = address;

    uv_queue_work(uv_default_loop(), baton->req, GapSetAddress, (uv_after_work_cb)AfterGapSetAddress);

    return;
}

void GapSetAddress(uv_work_t *req) 
{
    GapAddressSetBaton *baton = static_cast<GapAddressSetBaton *>(req->data);
    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gap_address_set(baton->addr_cycle_mode, baton->address);
}

// This runs in Main Thread
void AfterGapSetAddress(uv_work_t *req) 
{
	Nan::HandleScope scope;

    GapAddressSetBaton *baton = static_cast<GapAddressSetBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "setting address.");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    baton->callback->Call(1, argv);

    delete baton;
}

NAN_METHOD(GapGetAddress)
{
    v8::Local<v8::Function> callback;
    int argumentcount = 0;

    try
    {
        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (char const *error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    ble_gap_addr_t *address = new ble_gap_addr_t();

    GapAddressGetBaton *baton = new GapAddressGetBaton(callback);
    baton->address = address;

    uv_queue_work(uv_default_loop(), baton->req, GapGetAddress, (uv_after_work_cb)AfterGapGetAddress);

    return;
}


void GapGetAddress(uv_work_t *req) 
{
    GapAddressGetBaton *baton = static_cast<GapAddressGetBaton *>(req->data);
    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gap_address_get(baton->address);
}

// This runs in Main Thread
void AfterGapGetAddress(uv_work_t *req) 
{
	Nan::HandleScope scope;

    GapAddressGetBaton *baton = static_cast<GapAddressGetBaton *>(req->data);
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

    baton->callback->Call(2, argv);
    delete baton;
}

NAN_METHOD(GapUpdateConnectionParameters)
{
    uint16_t conn_handle;
    v8::Local<v8::Object> connParamsObject;
    v8::Local<v8::Function> callback;
    int argumentcount = 0;

    try
    {
        conn_handle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        connParamsObject = ConversionUtility::getJsObject(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (char const *error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    GapUpdateConnectionParametersBaton *baton = new GapUpdateConnectionParametersBaton(callback);
    baton->conn_handle = conn_handle;

    try
    {
        baton->connectionParameters = GapConnParams(connParamsObject);
    }
    catch (char const *)
    {
        Nan::ThrowTypeError("The provided connection parameters can not be parsed.");
        return;
    }
    

    uv_queue_work(uv_default_loop(), baton->req, GapUpdateConnectionParameters, (uv_after_work_cb)AfterGapUpdateConnectionParameters);
}

// This runs in a worker thread (not Main Thread)
void GapUpdateConnectionParameters(uv_work_t *req) 
{
    // TODO: handle if .Close is called before this function is called.
    GapUpdateConnectionParametersBaton *baton = static_cast<GapUpdateConnectionParametersBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gap_conn_param_update(baton->conn_handle, baton->connectionParameters);
}

// This runs in Main Thread
void AfterGapUpdateConnectionParameters(uv_work_t *req) 
{
	Nan::HandleScope scope;

    // TODO: handle if .Close is called before this function is called.
    GapUpdateConnectionParametersBaton *baton = static_cast<GapUpdateConnectionParametersBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "updating connection parameters");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    baton->callback->Call(1, argv);
    delete baton;
}

NAN_METHOD(GapDisconnect)
{
    uint16_t conn_handle;
    uint8_t hci_status_code;
    v8::Local<v8::Function> callback;
    int argumentcount = 0;

    try
    {
        conn_handle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        hci_status_code = ConversionUtility::getNativeUint8(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (char const *error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    GapDisconnectBaton *baton = new GapDisconnectBaton(callback);
    baton->conn_handle = conn_handle;
    baton->hci_status_code = hci_status_code;

    uv_queue_work(uv_default_loop(), baton->req, GapDisconnect, (uv_after_work_cb)AfterGapDisconnect);
}

// This runs in a worker thread (not Main Thread)
void GapDisconnect(uv_work_t *req) 
{
    GapDisconnectBaton *baton = static_cast<GapDisconnectBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gap_disconnect(baton->conn_handle, baton->hci_status_code);
}

// This runs in Main Thread
void AfterGapDisconnect(uv_work_t *req)
{
	Nan::HandleScope scope;

    GapDisconnectBaton *baton = static_cast<GapDisconnectBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "disconnecting");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    baton->callback->Call(1, argv);
    delete baton;
}

NAN_METHOD(GapSetTXPower)
{
    int8_t tx_power;
    v8::Local<v8::Function> callback;
    int argumentcount = 0;

    try
    {
        tx_power = ConversionUtility::getNativeInt8(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (char const *error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    TXPowerBaton *baton = new TXPowerBaton(callback);

    baton->tx_power = tx_power;

    uv_queue_work(uv_default_loop(), baton->req, GapSetTXPower, (uv_after_work_cb)AfterGapSetTXPower);

}

// This runs in a worker thread (not Main Thread)
void GapSetTXPower(uv_work_t *req) 
{
    TXPowerBaton *baton = static_cast<TXPowerBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gap_tx_power_set(baton->tx_power);
}

// This runs in Main Thread
void AfterGapSetTXPower(uv_work_t *req) 
{
	Nan::HandleScope scope;

    TXPowerBaton *baton = static_cast<TXPowerBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "setting TX power.");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    baton->callback->Call(1, argv);
    delete baton;
}

NAN_METHOD(GapSetDeviceName)
{
    v8::Local<v8::Object> conn_sec_mode;
    uint8_t *dev_name;
    v8::Local<v8::Function> callback;
    int argumentcount = 0;

    try
    {
        conn_sec_mode = ConversionUtility::getJsObject(info[argumentcount]);
        argumentcount++;

        dev_name = ConversionUtility::getNativePointerToUint8(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (char const *error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    size_t length = strlen((char *)dev_name);

    GapSetDeviceNameBaton *baton = new GapSetDeviceNameBaton(callback);
    try
    {
        baton->conn_sec_mode = GapConnSecMode(conn_sec_mode);
    }
    catch (char const *)
    {
        Nan::ThrowTypeError("The provided gap connection security mode can not be parsed.");
        return;
    }

    baton->dev_name = dev_name;
    baton->length = length;

    uv_queue_work(uv_default_loop(), baton->req, GapSetDeviceName, (uv_after_work_cb)AfterGapSetDeviceName);
}

// This runs in a worker thread (not Main Thread)
void GapSetDeviceName(uv_work_t *req) 
{
    GapSetDeviceNameBaton *baton = static_cast<GapSetDeviceNameBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gap_device_name_set(baton->conn_sec_mode, baton->dev_name, baton->length);
}

// This runs in Main Thread
void AfterGapSetDeviceName(uv_work_t *req) 
{
	Nan::HandleScope scope;

    // TODO: handle if .Close is called before this function is called.
    GapSetDeviceNameBaton *baton = static_cast<GapSetDeviceNameBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "setting device name.");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    baton->callback->Call(1, argv);
    free(baton->dev_name);
    delete baton;
}

NAN_METHOD(GapGetDeviceName)
{
    v8::Local<v8::Function> callback;
    int argumentcount = 0;

    try
    {
        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (char const *error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    GapGetDeviceNameBaton *baton = new GapGetDeviceNameBaton(callback);

    baton->length = 248; // Max length of Device name characteristic
    baton->dev_name = (uint8_t*)malloc(baton->length);

    uv_queue_work(uv_default_loop(), baton->req, GapGetDeviceName, (uv_after_work_cb)AfterGapGetDeviceName);
}

// This runs in a worker thread (not Main Thread)
void GapGetDeviceName(uv_work_t *req) 
{
    GapGetDeviceNameBaton *baton = static_cast<GapGetDeviceNameBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gap_device_name_get(baton->dev_name, &(baton->length));
}

// This runs in Main Thread
void AfterGapGetDeviceName(uv_work_t *req)
{
	Nan::HandleScope scope;

    GapGetDeviceNameBaton *baton = static_cast<GapGetDeviceNameBaton *>(req->data);
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

        v8::Local<v8::Value> dev_name = ConversionUtility::toJsString((char *)baton->dev_name);

        argv[0] = dev_name;
        argv[1] = Nan::Undefined();
    }

    baton->callback->Call(2, argv);
    free(baton->dev_name);
    delete baton;
}

NAN_METHOD(GapStartRSSI)
{
    uint16_t conn_handle;
    uint8_t treshold_dbm;
    uint8_t skip_count;
    v8::Local<v8::Function> callback;
    int argumentcount = 0;

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
    catch (char const *error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    GapStartRSSIBaton *baton = new GapStartRSSIBaton(callback);
    baton->conn_handle = conn_handle;
    baton->treshold_dbm = treshold_dbm;
    baton->skip_count = skip_count;

    uv_queue_work(uv_default_loop(), baton->req, GapStartRSSI, (uv_after_work_cb)AfterGapStartRSSI);
}

// This runs in a worker thread (not Main Thread)
void GapStartRSSI(uv_work_t *req) 
{
    GapStartRSSIBaton *baton = static_cast<GapStartRSSIBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gap_rssi_start(baton->conn_handle, baton->treshold_dbm, baton->skip_count);
}

// This runs in Main Thread
void AfterGapStartRSSI(uv_work_t *req)
{
    Nan::HandleScope scope;

    GapStartRSSIBaton *baton = static_cast<GapStartRSSIBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "starting RSSI");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    baton->callback->Call(1, argv);
    delete baton;
}

NAN_METHOD(GapStopRSSI)
{
    uint16_t conn_handle;
    v8::Local<v8::Function> callback;
    int argumentcount = 0;

    try
    {
        conn_handle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (char const *error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    GapStopRSSIBaton *baton = new GapStopRSSIBaton(callback);
    baton->conn_handle = conn_handle;

    uv_queue_work(uv_default_loop(), baton->req, GapStopRSSI, (uv_after_work_cb)AfterGapStopRSSI);
}

// This runs in a worker thread (not Main Thread)
void GapStopRSSI(uv_work_t *req) 
{
    GapStopRSSIBaton *baton = static_cast<GapStopRSSIBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gap_rssi_stop(baton->conn_handle);
}

// This runs in Main Thread
void AfterGapStopRSSI(uv_work_t *req) 
{
	Nan::HandleScope scope;

    GapStopRSSIBaton *baton = static_cast<GapStopRSSIBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "stopping RSSI");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    baton->callback->Call(1, argv);
    delete baton;
}

NAN_METHOD(StartScan)
{
    v8::Local<v8::Object> options;
    v8::Local<v8::Function> callback;
    int argumentcount = 0;

    try
    {
        options = ConversionUtility::getJsObject(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (char const *error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    ble_gap_scan_params_t *params = GapScanParams(options);

    StartScanBaton *baton = new StartScanBaton(callback);
    baton->scan_params = params;

    uv_queue_work(uv_default_loop(), baton->req, StartScan, (uv_after_work_cb)AfterStartScan);
}

// This runs in a worker thread (not Main Thread)
void StartScan(uv_work_t *req) 
{
    StartScanBaton *baton = static_cast<StartScanBaton *>(req->data);
    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gap_scan_start(baton->scan_params);
}

// This runs in Main Thread
void AfterStartScan(uv_work_t *req) 
{
	Nan::HandleScope scope;

    StartScanBaton *baton = static_cast<StartScanBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "starting scan");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    baton->callback->Call(1, argv);
    delete baton;
}

NAN_METHOD(StopScan)
{
    v8::Local<v8::Function> callback;
    int argumentcount = 0;

    try
    {
        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (char const *error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    StopScanBaton *baton = new StopScanBaton(callback);

    uv_queue_work(uv_default_loop(), baton->req, StopScan, (uv_after_work_cb)AfterStopScan);
}

// This runs in a worker thread (not Main Thread)
void StopScan(uv_work_t *req) 
{
    StopScanBaton *baton = static_cast<StopScanBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gap_scan_stop();
}

// This runs in Main Thread
void AfterStopScan(uv_work_t *req) 
{
	Nan::HandleScope scope;

    StopScanBaton *baton = static_cast<StopScanBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "stopping scan");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    baton->callback->Call(1, argv);
    delete baton;
}

NAN_METHOD(GapConnect)
{
    v8::Local<v8::Object> address;
    v8::Local<v8::Object> scan_params;
    v8::Local<v8::Object> conn_params;
    v8::Local<v8::Function> callback;
    int argumentcount = 0;

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
    catch (char const *error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    GapConnectBaton *baton = new GapConnectBaton(callback);
    baton->req->data = (void *)baton;
    try
    {
        baton->address = GapAddr(address);
    }
    catch (char const *)
    {
        Nan::ThrowTypeError("The provided address can not be parsed.");
        return;
    }

    try
    {
        baton->scan_params = GapScanParams(scan_params);
    }
    catch (char const *)
    {
        Nan::ThrowTypeError("The provided scan parameters can not be parsed.");
        return;
    }

    try
    {
        baton->conn_params = GapConnParams(conn_params);
    }
    catch (char const *)
    {
        Nan::ThrowTypeError("The provided connection parameters can not be parsed.");
        return;
    }

    uv_queue_work(uv_default_loop(), baton->req, GapConnect, (uv_after_work_cb)AfterGapConnect);
}

// This runs in a worker thread (not Main Thread)
void GapConnect(uv_work_t *req) 
{
    GapConnectBaton *baton = static_cast<GapConnectBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gap_connect(baton->address, baton->scan_params, baton->conn_params);
}

// This runs in Main Thread
void AfterGapConnect(uv_work_t *req) 
{
	Nan::HandleScope scope;

    GapConnectBaton *baton = static_cast<GapConnectBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "connecting");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    baton->callback->Call(1, argv);
    delete baton;
}

NAN_METHOD(GapCancelConnect)
{
    v8::Local<v8::Function> callback;
    int argumentcount = 0;

    try
    {
        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (char const *error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    GapConnectCancelBaton *baton = new GapConnectCancelBaton(callback);

    uv_queue_work(uv_default_loop(), baton->req, GapCancelConnect, (uv_after_work_cb)AfterGapCancelConnect);
}

// This runs in a worker thread (not Main Thread)
void GapCancelConnect(uv_work_t *req) 
{
    GapConnectCancelBaton *baton = static_cast<GapConnectCancelBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gap_connect_cancel();
}

// This runs in Main Thread
void AfterGapCancelConnect(uv_work_t *req) 
{
	Nan::HandleScope scope;

    GapConnectCancelBaton *baton = static_cast<GapConnectCancelBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "canceling connection");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    baton->callback->Call(1, argv);
    delete baton;
}

NAN_METHOD(GapGetRSSI)
{
    uint16_t conn_handle;
    v8::Local<v8::Function> callback;
    int argumentcount = 0;

    try
    {
        conn_handle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (char const *error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    GapGetRSSIBaton *baton = new GapGetRSSIBaton(callback);
    baton->conn_handle = conn_handle;
    baton->rssi = 0;

    uv_queue_work(uv_default_loop(), baton->req, GapGetRSSI, (uv_after_work_cb)AfterGapGetRSSI);
}

// This runs in a worker thread (not Main Thread)
void GapGetRSSI(uv_work_t *req) 
{
    GapGetRSSIBaton *baton = static_cast<GapGetRSSIBaton *>(req->data);

    std::cout << "GapGetRSSI Call" << std::endl;

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);

    std::cout << "GapGetRSSI After Lock" << baton->conn_handle << std::endl;
    //TODO: Does not return. Unsure if it is the serialization, my code, or SD which does not behave.
    baton->result = sd_ble_gap_rssi_get(baton->conn_handle, &(baton->rssi));

    std::cout << "GapGetRSSI After Call" << std::endl;
}

// This runs in Main Thread
void AfterGapGetRSSI(uv_work_t *req) 
{
	Nan::HandleScope scope;

    GapGetRSSIBaton *baton = static_cast<GapGetRSSIBaton *>(req->data);
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

    baton->callback->Call(2, argv);
    delete baton;
}

NAN_METHOD(GapStartAdvertising)
{
    v8::Local<v8::Object> adv_params;
    v8::Local<v8::Function> callback;
    int argumentcount = 0;
    
    try
    {
        adv_params = ConversionUtility::getJsObject(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (char const *error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    GapStartAdvertisingBaton *baton = new GapStartAdvertisingBaton(callback);
    try
    {
        baton->p_adv_params = GapAdvParams(adv_params);
    }
    catch (char const *)
    {
        Nan::ThrowTypeError("The provided advertisement parameters can not be parsed.");
        return;
    }

    uv_queue_work(uv_default_loop(), baton->req, GapStartAdvertising, (uv_after_work_cb)AfterGapStartAdvertising);
}

// This runs in a worker thread (not Main Thread)
void GapStartAdvertising(uv_work_t *req) 
{
    GapStartAdvertisingBaton *baton = static_cast<GapStartAdvertisingBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);

    baton->result = sd_ble_gap_adv_start(baton->p_adv_params);

}

// This runs in Main Thread
void AfterGapStartAdvertising(uv_work_t *req) 
{
    Nan::HandleScope scope;

    GapStartAdvertisingBaton *baton = static_cast<GapStartAdvertisingBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "starting advertisement");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    baton->callback->Call(1, argv);
    delete baton;
}

NAN_METHOD(GapStopAdvertising)
{
    v8::Local<v8::Function> callback;
    int argumentcount = 0;

    try
    {
         callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (char const *error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    GapStopAdvertisingBaton *baton = new GapStopAdvertisingBaton(callback);

    uv_queue_work(uv_default_loop(), baton->req, GapStopAdvertising, (uv_after_work_cb)AfterGapStopAdvertising);
}

// This runs in a worker thread (not Main Thread)
void GapStopAdvertising(uv_work_t *req) 
{
    GapStopAdvertisingBaton *baton = static_cast<GapStopAdvertisingBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gap_adv_stop();
}

// This runs in Main Thread
void AfterGapStopAdvertising(uv_work_t *req) 
{
    Nan::HandleScope scope;

    GapStopAdvertisingBaton *baton = static_cast<GapStopAdvertisingBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "stopping advertising");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    baton->callback->Call(1, argv);
    delete baton;
}

NAN_METHOD(GapConnSecGet)
{
    uint16_t conn_handle;
    v8::Local<v8::Function> callback;
    int argumentcount = 0;

    try
    {
        conn_handle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (char const *error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    GapConnSecGetBaton *baton = new GapConnSecGetBaton(callback);
    baton->conn_handle = conn_handle;
    baton->conn_sec = new ble_gap_conn_sec_t();

    uv_queue_work(uv_default_loop(), baton->req, GapConnSecGet, (uv_after_work_cb)AfterGapConnSecGet);
}

// This runs in a worker thread (not Main Thread)
void GapConnSecGet(uv_work_t *req)
{
    GapConnSecGetBaton *baton = static_cast<GapConnSecGetBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gap_conn_sec_get(baton->conn_handle, baton->conn_sec);
}

// This runs in Main Thread
void AfterGapConnSecGet(uv_work_t *req)
{
    Nan::HandleScope scope;

    GapConnSecGetBaton *baton = static_cast<GapConnSecGetBaton *>(req->data);
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

    baton->callback->Call(2, argv);
    delete baton->conn_sec;
    delete baton;
}

NAN_METHOD(GapEncrypt)
{
    uint16_t conn_handle;
    v8::Local<v8::Object> master_id_object;
    v8::Local<v8::Object> enc_info_object;
    v8::Local<v8::Function> callback;
    int argumentcount = 0;

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
    catch (char const *error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    GapEncryptBaton *baton = new GapEncryptBaton(callback);
    baton->conn_handle = conn_handle;

    try
    {
        baton->master_id = GapMasterId(master_id_object);
    }
    catch (char const *)
    {
        Nan::ThrowTypeError("The provided master id can not be parsed.");
        return;
    }

    try
    {
        baton->master_id = GapMasterId(master_id_object);
        baton->enc_info = GapEncInfo(enc_info_object);
    }
    catch (char const *)
    {
        Nan::ThrowTypeError("The provided encryption parameters can not be parsed.");
        return;
    }

    uv_queue_work(uv_default_loop(), baton->req, GapEncrypt, (uv_after_work_cb)AfterGapEncrypt);
}

void GapEncrypt(uv_work_t *req)
{
    GapEncryptBaton *baton = static_cast<GapEncryptBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gap_encrypt(baton->conn_handle, baton->master_id, baton->enc_info);
}

void AfterGapEncrypt(uv_work_t *req)
{
    Nan::HandleScope scope;

    GapEncryptBaton *baton = static_cast<GapEncryptBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "encrypting");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    baton->callback->Call(1, argv);
    delete baton;
}

NAN_METHOD(GapSecParamsReply)
{
    uint16_t conn_handle;
    uint8_t sec_status;
    v8::Local<v8::Object> sec_params_object;
    v8::Local<v8::Object> sec_keyset_object;
    v8::Local<v8::Function> callback;
    int argumentcount = 0;

    try
    {
        conn_handle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        sec_status = ConversionUtility::getNativeUint8(info[argumentcount]);
        argumentcount++;

        sec_params_object = ConversionUtility::getJsObject(info[argumentcount]);
        argumentcount++;

        sec_keyset_object = ConversionUtility::getJsObject(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (char const *error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    GapSecParamsReplyBaton *baton = new GapSecParamsReplyBaton(callback);
    baton->conn_handle = conn_handle;
    baton->sec_status = sec_status;
    try
    {
        baton->sec_params = GapSecParams(sec_params_object);
    }
    catch (char const *)
    {
        Nan::ThrowTypeError("The provided security parameters can not be parsed.");
        return;
    }

    /*try
    {
        baton->sec_keyset = GapSecKeyset(sec_keyset_object);
    }
    catch (char const *error)
    {
        Nan::ThrowTypeError("The provided keyset can not be parsed.");
        return;
    }*/

    baton->sec_keyset = new ble_gap_sec_keyset_t();

    baton->sec_keyset->keys_central.p_enc_key = new ble_gap_enc_key_t();
    baton->sec_keyset->keys_central.p_id_key = new ble_gap_id_key_t ();
    baton->sec_keyset->keys_central.p_sign_key = new ble_gap_sign_info_t();
    baton->sec_keyset->keys_periph.p_enc_key = new ble_gap_enc_key_t();
    baton->sec_keyset->keys_periph.p_id_key = new ble_gap_id_key_t();
    baton->sec_keyset->keys_periph.p_sign_key = new ble_gap_sign_info_t();

    uv_queue_work(uv_default_loop(), baton->req, GapSecParamsReply, (uv_after_work_cb)AfterGapSecParamsReply);
}

// This runs in a worker thread (not Main Thread)
void GapSecParamsReply(uv_work_t *req) 
{
    GapSecParamsReplyBaton *baton = static_cast<GapSecParamsReplyBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gap_sec_params_reply(baton->conn_handle, baton->sec_status, 
        baton->sec_params, baton->sec_keyset);
}

// This runs in Main Thread
void AfterGapSecParamsReply(uv_work_t *req) 
{
    Nan::HandleScope scope;

    GapSecParamsReplyBaton *baton = static_cast<GapSecParamsReplyBaton *>(req->data);
    v8::Local<v8::Value> argv[2];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "replying sec params");
        argv[1] = Nan::Undefined();
    }
    else
    {
        argv[0] = Nan::Undefined();
        argv[1] = GapSecKeyset(baton->sec_keyset).ToJs();
    }

    baton->callback->Call(2, argv);
    delete baton->sec_keyset;
    delete baton;
}

NAN_METHOD(GapSecInfoReply)
{
    uint16_t conn_handle;
    v8::Local<v8::Object> enc_info_object;
    v8::Local<v8::Object> id_info_object;
    v8::Local<v8::Object> sign_info_object;
    v8::Local<v8::Function> callback;
    int argumentcount = 0;
    bool enc_info_is_null = false;
    bool id_info_is_null = false;
    bool sign_info_is_null = false;

    try
    {
        conn_handle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        if (info[argumentcount]->IsNull())
        {
            enc_info_is_null = true;
        }
        else
        {
            enc_info_object = ConversionUtility::getJsObject(info[argumentcount]);
        }
        argumentcount++;

        if (info[argumentcount]->IsNull())
        {
            id_info_is_null = true;
        }
        else
        {
            id_info_object = ConversionUtility::getJsObject(info[argumentcount]);            
        }
        argumentcount++;

        if (info[argumentcount]->IsNull()) 
        {
            sign_info_is_null = true;
        }
        else
        {
            sign_info_object = ConversionUtility::getJsObject(info[argumentcount]);
        }    
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (char const *error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    GapSecInfoReplyBaton *baton = new GapSecInfoReplyBaton(callback);

    baton->conn_handle = conn_handle;

    try
    {
        if (enc_info_is_null)
        {
            baton->enc_info = 0;
        }
        else
        {
            baton->enc_info = GapEncInfo(enc_info_object);
        }
    }
    catch (char const *)
    {
        Nan::ThrowTypeError("The provided enc_info can not be parsed");
        return;
    }

    try
    {
        if (id_info_is_null) 
        {
            baton->id_info = 0;
        }
        else
        {
            baton->id_info = GapIrk(id_info_object);
        }
    }
    catch (char const *)
    {
        Nan::ThrowTypeError("The provided id_info can not be parsed");
        return;
    }

    try
    {
        if (sign_info_is_null)
        {
            baton->sign_info = 0;
        }
        else
        {
            baton->sign_info = GapSignInfo(sign_info_object);
        }
    }
    catch (char const *)
    {
        Nan::ThrowTypeError("The provided sign_info can not be parsed");
        return;
    }

    uv_queue_work(uv_default_loop(), baton->req, GapSecInfoReply, (uv_after_work_cb)AfterGapSecInfoReply);
}

void GapSecInfoReply(uv_work_t *req)
{
    GapSecInfoReplyBaton *baton = static_cast<GapSecInfoReplyBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gap_sec_info_reply(baton->conn_handle, baton->enc_info, baton->id_info, baton->sign_info);
}

void AfterGapSecInfoReply(uv_work_t *req)
{
    Nan::HandleScope scope;

    GapSecInfoReplyBaton *baton = static_cast<GapSecInfoReplyBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "replying sec info");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    baton->callback->Call(1, argv);
    delete baton;    
}

NAN_METHOD(GapAuthenticate)
{
    uint16_t conn_handle;
    v8::Local<v8::Object> sec_params;
    v8::Local<v8::Function> callback;
    int argumentcount = 0;

    try
    {
        conn_handle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        sec_params = ConversionUtility::getJsObject(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (char const *error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    GapAuthenticateBaton *baton = new GapAuthenticateBaton(callback);
    baton->conn_handle = conn_handle;

    try
    {
        baton->p_sec_params = GapSecParams(sec_params);
    }
    catch (char const *)
    {
        Nan::ThrowTypeError("The provided advertisement parameters can not be parsed.");
        return;
    }

    uv_queue_work(uv_default_loop(), baton->req, GapAuthenticate, (uv_after_work_cb)AfterGapAuthenticate);
}

// This runs in a worker thread (not Main Thread)
void GapAuthenticate(uv_work_t *req)
{
    GapAuthenticateBaton *baton = static_cast<GapAuthenticateBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);

    baton->result = sd_ble_gap_authenticate(baton->conn_handle, baton->p_sec_params);

}

// This runs in Main Thread
void AfterGapAuthenticate(uv_work_t *req)
{
    Nan::HandleScope scope;

    GapAuthenticateBaton *baton = static_cast<GapAuthenticateBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "authenticating");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    baton->callback->Call(1, argv);
    delete baton;
}

extern "C" {
    void init_gap(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target)
    {
        Utility::SetMethod(target, "gap_set_address", GapSetAddress);
        Utility::SetMethod(target, "gap_get_address", GapGetAddress);
        Utility::SetMethod(target, "gap_update_connection_parameters", GapUpdateConnectionParameters);
        Utility::SetMethod(target, "gap_disconnect", GapDisconnect);
        Utility::SetMethod(target, "gap_set_tx_power", GapSetTXPower);
        Utility::SetMethod(target, "gap_set_device_name", GapSetDeviceName);
        Utility::SetMethod(target, "gap_get_device_name", GapGetDeviceName);
        Utility::SetMethod(target, "gap_start_rssi", GapStartRSSI);
        Utility::SetMethod(target, "gap_stop_rssi", GapStopRSSI);
        Utility::SetMethod(target, "gap_start_scan", StartScan);
        Utility::SetMethod(target, "gap_stop_scan", StopScan);
        Utility::SetMethod(target, "gap_connect", GapConnect);
        Utility::SetMethod(target, "gap_cancel_connect", GapCancelConnect);
        Utility::SetMethod(target, "gap_get_rssi", GapGetRSSI);
        Utility::SetMethod(target, "gap_start_advertising", GapStartAdvertising);
        Utility::SetMethod(target, "gap_stop_advertising", GapStopAdvertising);
        Utility::SetMethod(target, "gap_sec_params_reply", GapSecParamsReply);
        Utility::SetMethod(target, "gap_conn_sec_get", GapConnSecGet);
        Utility::SetMethod(target, "gap_encrypt", GapEncrypt);
        Utility::SetMethod(target, "gap_sec_info_reply", GapSecInfoReply);
        Utility::SetMethod(target, "gap_authenticate", GapAuthenticate);

        // Constants from ble_gap.h

        /* GAP Event IDs.
        * IDs that uniquely identify an event coming from the stack to the application. */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_EVT_CONNECTED);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_EVT_DISCONNECTED);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_EVT_CONN_PARAM_UPDATE);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_EVT_SEC_PARAMS_REQUEST);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_EVT_SEC_INFO_REQUEST);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_EVT_PASSKEY_DISPLAY);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_EVT_AUTH_KEY_REQUEST);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_EVT_AUTH_STATUS);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_EVT_CONN_SEC_UPDATE);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_EVT_TIMEOUT);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_EVT_RSSI_CHANGED);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_EVT_ADV_REPORT);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_EVT_SEC_REQUEST);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_EVT_CONN_PARAM_UPDATE_REQUEST);
        NODE_DEFINE_CONSTANT(target, BLE_GAP_EVT_SCAN_REQ_REPORT);

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

        /* BLE_GAP_ADDR_TYPES GAP Address types */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ADDR_TYPE_PUBLIC); //Public address.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ADDR_TYPE_RANDOM_STATIC); //Random Static address.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ADDR_TYPE_RANDOM_PRIVATE_RESOLVABLE); //Private Resolvable address.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ADDR_TYPE_RANDOM_PRIVATE_NON_RESOLVABLE); //Private Non-Resolvable address.

        /* BLE_GAP_ADDR_CYCLE_MODES GAP Address cycle modes */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ADDR_CYCLE_MODE_NONE); //Set addresses directly, no automatic address cycling.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_ADDR_CYCLE_MODE_AUTO); //Automatically generate and update private addresses.

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
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_SUCCESS); //Procedure completed with success.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_TIMEOUT); //Procedure timed out.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_PDU_INVALID); //Invalid PDU received.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_RFU_RANGE1_BEGIN); //Reserved for Future Use range #1 begin.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_RFU_RANGE1_END); //Reserved for Future Use range #1 end.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_PASSKEY_ENTRY_FAILED); //Passkey entry failed (user cancelled or other).
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_OOB_NOT_AVAILABLE); //Out of Band Key not available.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_AUTH_REQ); //Authentication requirements not met.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_CONFIRM_VALUE); //Confirm value failed.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_PAIRING_NOT_SUPP); //Pairing not supported.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_ENC_KEY_SIZE); //Encryption key size.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_SMP_CMD_UNSUPPORTED); //Unsupported SMP command.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_UNSPECIFIED); //Unspecified reason.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_REPEATED_ATTEMPTS); //Too little time elapsed since last attempt.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_INVALID_PARAMS); //Invalid parameters.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_RFU_RANGE2_BEGIN); //Reserved for Future Use range #2 begin.
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_STATUS_RFU_RANGE2_END); //Reserved for Future Use range #2 end.

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

        /* GAP device name maximum length. */
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

        /* Maximum amount of IRKs in a whitelist.
        * @note  The number of IRKs is limited to 8, even if the hardware supports more. */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_WHITELIST_IRK_MAX_COUNT);

        /* GAP_SEC_MODES GAP Security Modes */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SEC_MODE); //No key (may be used to reject).
    }
}
