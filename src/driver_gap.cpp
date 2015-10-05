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

// BleDriverEvent -- START --
// BleDriverEvent -- END --

//
// GapAddr -- START --
//

v8::Local<v8::Object> GapAddr::ToJs()
{
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();

    Nan::Set(obj, Nan::New("type").ToLocalChecked(), Nan::New(gap_addr_type_map[native->addr_type]));

    // Create a text string of the address. The when the NanUtf8String string is out of
    // its scope, the underlaying string is freed.

    size_t addr_len = BLE_GAP_ADDR_LEN * 3; // Each byte -> 2 chars, : separator _between_ each byte and a null termination byte
    char *addr = (char*)malloc(addr_len);
    uint8_t *ptr = native->addr;

    sprintf(addr, "%02X:%02X:%02X:%02X:%02X:%02X", ptr[5], ptr[4], ptr[3], ptr[2], ptr[1], ptr[0]);

    // TODO: According to Instruments (OS X), GapAddr::ToJs leaks 32 bytes. This must be resolved.
    v8::Local<v8::String> _addr = Nan::New(addr);
    Nan::Set(obj, Nan::New("address").ToLocalChecked(), _addr);
    Nan::Set(obj, Nan::New("type").ToLocalChecked(), Nan::New(gap_addr_type_map[native->addr_type]));

    free(addr);
    return obj;
}

ble_gap_addr_t *GapAddr::ToNative()
{
    ble_gap_addr_t *address = new ble_gap_addr_t();

    uint32_t ptr[BLE_GAP_ADDR_LEN];

    v8::Local<v8::Value> getAddress = jsobj->Get(Nan::New("address"));
    v8::Local<v8::String> addressString = getAddress->ToString();
    size_t addr_len = addressString->Length() + 1;
    char *addr = (char*)malloc(addr_len);
    addressString->WriteUtf8(addr, addr_len);

    sscanf(addr, "%hhx:%hhx:%hhx:%hhx:%hhx:%hhx", &(ptr[5]), &(ptr[4]), &(ptr[3]), &(ptr[2]), &(ptr[1]), &(ptr[0]));
    free(addr);

    for (int i = 0; i < BLE_GAP_ADDR_LEN; i++)
    {
        address->addr[i] = (uint8_t)ptr[i];
    }

    v8::Local<v8::Value> getAddressType = jsobj->Get(Nan::New("type"));
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
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();

    Nan::Set(obj, Nan::New("min_conn_interval").ToLocalChecked(), ConversionUtility::unitsToMsecs(native->min_conn_interval, ConversionUtility::ConversionUnit1250ms));
    Nan::Set(obj, Nan::New("max_conn_interval").ToLocalChecked(), ConversionUtility::unitsToMsecs(native->max_conn_interval, ConversionUtility::ConversionUnit1250ms));
    Nan::Set(obj, Nan::New("slave_latency").ToLocalChecked(), ConversionUtility::toJsNumber(native->slave_latency));
    Nan::Set(obj, Nan::New("conn_sup_timeout").ToLocalChecked(), ConversionUtility::unitsToMsecs(native->conn_sup_timeout, ConversionUtility::ConversionUnit10s));

    return obj;
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
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Nan::Set(obj, Nan::New("sm").ToLocalChecked(), Nan::New(native->sm));
    Nan::Set(obj, Nan::New("lv").ToLocalChecked(), Nan::New(native->lv));
    return obj;
}

ble_gap_conn_sec_mode_t *GapConnSecMode::ToNative()
{
    ble_gap_conn_sec_mode_t *conn_sec_mode = new ble_gap_conn_sec_mode_t();

    conn_sec_mode->sm = (uint8_t)jsobj->Get(Nan::New("sm"))->ToUint32()->NumberValue();
    conn_sec_mode->lv = (uint8_t)jsobj->Get(Nan::New("lv"))->ToUint32()->NumberValue();

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
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);
    Nan::Set(obj, Nan::New("rssi").ToLocalChecked(), Nan::New<v8::Integer>(this->evt->rssi));
    Nan::Set(obj, Nan::New("peer_addr").ToLocalChecked(), GapAddr(&(this->evt->peer_addr)));
    Nan::Set(obj, Nan::New("scan_rsp").ToLocalChecked(), Nan::New<v8::Boolean>(this->evt->scan_rsp ? true : false));

    if (this->evt->scan_rsp == 1) {
        Nan::Set(obj, Nan::New("adv_type").ToLocalChecked(), Nan::New(gap_adv_type_map[this->evt->type])); // TODO: add support for non defined adv types
    }

    uint8_t dlen = this->evt->dlen;

    if (dlen != 0)
    {
        // Attach a scan_rsp object to the adv_report
        v8::Local<v8::Object> data_obj = Nan::New<v8::Object>();
        Nan::Set(obj, Nan::New("data").ToLocalChecked(), data_obj);

        uint8_t *data = this->evt->data;

        // TODO: Evaluate if buffer is the correct datatype for advertisement data
        Nan::Set(data_obj, Nan::New("raw").ToLocalChecked(), NanNewBufferHandle((char *)data, dlen));

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
                    if ((flags & iterator->first) != 0) {
                        flags_array->Set(Nan::New<v8::Integer>(flags_array_idx), Nan::New(iterator->second));
                        flags_array_idx++;
                    }
                }

                data_obj->Set(Nan::New(gap_ad_type_map[ad_type]), flags_array);
            }
            else if (ad_type == BLE_GAP_AD_TYPE_COMPLETE_LOCAL_NAME || ad_type == BLE_GAP_AD_TYPE_SHORT_LOCAL_NAME)
            {
                uint8_t name_len = ad_len - 1;
                uint8_t offset = pos + 1;
                data_obj->Set(Nan::New(gap_ad_type_map[ad_type]), ConversionUtility::toJsString((char *)&data[offset], name_len));
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
                    sprintf(uuid_as_text, UUID_128_BIT_SPRINTF, 0, uint16_decode((uint8_t*)data + sub_pos + i));
                    uuid_array->Set(Nan::New<v8::Integer>(array_pos), ConversionUtility::toJsString(uuid_as_text));
                    free(uuid_as_text);
                    array_pos++;
                }

                data_obj->Set(Nan::New(gap_ad_type_map[ad_type]), uuid_array);
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
                    sprintf(uuid_as_text, UUID_128_BIT_SPRINTF,
                            uint16_decode((uint8_t*)data + sub_pos + 2 + i),
                            uint16_decode((uint8_t*)data + sub_pos + 0 + i));
                    uuid_array->Set(Nan::New<v8::Integer>(array_pos), ConversionUtility::toJsString(uuid_as_text));
                    free(uuid_as_text);
                    array_pos++;
                }

                data_obj->Set(Nan::New(gap_ad_type_map[ad_type]), uuid_array);
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
                    uuid_array->Set(Nan::New<v8::Integer>(array_pos), ConversionUtility::toJsString(uuid_as_text));
                    free(uuid_as_text);
                    array_pos++;
                }

                data_obj->Set(Nan::New(gap_ad_type_map[ad_type]), uuid_array);
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
                    data_obj->Set(Nan::New(gap_ad_type_map[ad_type]), Nan::New<v8::Integer>(data[pos+1]));
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

    return obj;
}

//
// GapAdvReport -- END --
//

//
// GapScanReqReport -- START --
//
v8::Local<v8::Object> GapScanReqReport::ToJs()
{
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);
    Nan::Set(obj, Nan::New("rssi").ToLocalChecked(), ConversionUtility::toJsNumber(evt->rssi));
    Nan::Set(obj, Nan::New("peer_addr").ToLocalChecked(), GapAddr(&(this->evt->peer_addr)));

    return obj;
}

//
// GapScanReqReport -- END --
//

//
// GapConnected -- START --
//
v8::Local<v8::Object> GapConnected::ToJs()
{
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);

    Nan::Set(obj, Nan::New("own_addr").ToLocalChecked(), GapAddr(&(evt->own_addr)));
    Nan::Set(obj, Nan::New("peer_addr").ToLocalChecked(), GapAddr(&(evt->peer_addr)));
    Nan::Set(obj, Nan::New("role").ToLocalChecked(), ConversionUtility::valueToJsString(evt->role, gap_role_map));
    Nan::Set(obj, Nan::New("conn_params").ToLocalChecked(), GapConnParams(&(evt->conn_params)));
    Nan::Set(obj, Nan::New("irk_match").ToLocalChecked(), ConversionUtility::toJsBool(evt->irk_match));

    if (evt->irk_match == 1)
    {
        Nan::Set(obj, Nan::New("irk_idx").ToLocalChecked(), ConversionUtility::toJsNumber(evt->irk_match_idx));
    }

    return obj;
}

//
// GapConnected -- END --
//

//
// GapDisconnected -- START --
//
v8::Local<v8::Object> GapDisconnected::ToJs()
{
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);
    Nan::Set(obj, Nan::New("reason").ToLocalChecked(), ConversionUtility::toJsNumber(evt->reason));
    Nan::Set(obj, Nan::New("reason_name").ToLocalChecked(), HciStatus::getHciStatus(evt->reason));

    return obj;
}

//
// GapDisconnected -- END --
//

//
// GapTimeout -- START --
//
v8::Local<v8::Object> GapTimeout::ToJs()
{
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);
    Nan::Set(obj, Nan::New("src").ToLocalChecked(), ConversionUtility::toJsNumber(evt->src));
    Nan::Set(obj, Nan::New("src_name").ToLocalChecked(), ConversionUtility::valueToJsString(evt->src, gap_timeout_sources_map));

    return obj;
}

//
// GapTimeout -- END --
//

//
// GapRssiChanged -- START --
//
v8::Local<v8::Object> GapRssiChanged::ToJs()
{
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);
    Nan::Set(obj, Nan::New("rssi").ToLocalChecked(), ConversionUtility::toJsNumber(evt->rssi));

    return obj;
}

//
// GapRssiChanged -- END --
//

//
// GapConnParamUpdate -- START --
//
v8::Local<v8::Object> GapConnParamUpdate::ToJs()
{
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);
    Nan::Set(obj, Nan::New("conn_params").ToLocalChecked(), GapConnParams(&(this->evt->conn_params)));

    return obj;
}

//
// GapConnParamUpdate -- END --
//

//
// GapConnParamUpdateRequest -- START --
//
v8::Local<v8::Object> GapConnParamUpdateRequest::ToJs()
{
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverEvent::ToJs(obj);
    Nan::Set(obj, Nan::New("conn_params").ToLocalChecked(), GapConnParams(&(this->evt->conn_params)));
    return obj;
}

//
// GapConnParamUpdateRequest -- END --
//

//
// GapScanParams -- START --
//

v8::Local<v8::Object> GapScanParams::ToJs()
{
    // Scan parameters are never retrieved from driver.
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    return obj;
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

NAN_METHOD(GapSetAddress)
{
    NanScope();

    // CycleMode
    if (!args[0]->IsNumber())
    {
        NanThrowTypeError("First argument must be a number");
        NanReturnUndefined();
    }
    uint8_t address_cycle_mode = ConversionUtility::getNativeUint8(args[0]);

    // Address
    if (!args[1]->IsObject())
    {
        NanThrowTypeError("Second argument must be a object");
        NanReturnUndefined();
    }
    v8::Local<v8::Object> addressObject = args[1]->ToObject();

    // Callback
    if (!args[2]->IsFunction()) {
        NanThrowTypeError("Third argument must be a function");
        NanReturnUndefined();
    }
    v8::Local<v8::Function> callback = args[2].As<v8::Function>();

    ble_gap_addr_t *address = GapAddr(addressObject);

    GapAddressSetBaton *baton = new GapAddressSetBaton(callback);
    baton->addr_cycle_mode = address_cycle_mode;
    baton->address = address;

    uv_queue_work(uv_default_loop(), baton->req, GapSetAddress, (uv_after_work_cb)AfterGapSetAddress);

    NanReturnUndefined();
}

void GapSetAddress(uv_work_t *req) {
    GapAddressSetBaton *baton = static_cast<GapAddressSetBaton *>(req->data);
    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gap_address_set(baton->addr_cycle_mode, baton->address);
}

// This runs in Main Thread
void AfterGapSetAddress(uv_work_t *req) {
    NanScope();

    GapAddressSetBaton *baton = static_cast<GapAddressSetBaton *>(req->data);
    v8::Handle<v8::Value> argv[1];

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
    NanScope();

    // Callback
    if (!args[0]->IsFunction()) {
        NanThrowTypeError("First argument must be a function");
        NanReturnUndefined();
    }
    v8::Local<v8::Function> callback = args[0].As<v8::Function>();

    ble_gap_addr_t *address = new ble_gap_addr_t();

    GapAddressGetBaton *baton = new GapAddressGetBaton(callback);
    baton->address = address;

    uv_queue_work(uv_default_loop(), baton->req, GapGetAddress, (uv_after_work_cb)AfterGapGetAddress);

    NanReturnUndefined();
}


void GapGetAddress(uv_work_t *req) {
    GapAddressGetBaton *baton = static_cast<GapAddressGetBaton *>(req->data);
    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gap_address_get(baton->address);
}

// This runs in Main Thread
void AfterGapGetAddress(uv_work_t *req) {
    NanScope();
    GapAddressGetBaton *baton = static_cast<GapAddressGetBaton *>(req->data);
    v8::Handle<v8::Value> argv[2];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = Nan::Undefined();
        argv[1] = ErrorMessage::getErrorMessage(baton->result, "getting address.");
    }
    else
    {
        argv[0] = GapAddr(baton->address);
        argv[1] = Nan::Undefined();
    }

    baton->callback->Call(2, argv);
    delete baton;
}

NAN_METHOD(GapUpdateConnectionParameters)
{
    NanScope();

    // CycleMode
    if (!args[0]->IsNumber())
    {
        NanThrowTypeError("First argument must be a number");
        NanReturnUndefined();
    }
    uint16_t conn_handle = ConversionUtility::getNativeUint16(args[0]);

    // Parameters
    if (!args[1]->IsObject())
    {
        NanThrowTypeError("Second argument must be a object");
        NanReturnUndefined();
    }
    v8::Local<v8::Object> connParamsObject = args[1]->ToObject();

    if (!args[2]->IsFunction())
    {
        NanThrowTypeError("Third argument must be a function");
        NanReturnUndefined();
    }
    v8::Local<v8::Function> callback = args[2].As<v8::Function>();

    GapUpdateConnectionParametersBaton *baton = new GapUpdateConnectionParametersBaton(callback);
    baton->conn_handle = conn_handle;
    baton->connectionParameters = GapConnParams(connParamsObject);

    uv_queue_work(uv_default_loop(), baton->req, GapUpdateConnectionParameters, (uv_after_work_cb)AfterGapUpdateConnectionParameters);

    // TODO: generate a generic function to handle return code from the SD. If not NRF_SUCCESS, raise an exception.
    NanReturnUndefined();
}

// This runs in a worker thread (not Main Thread)
void GapUpdateConnectionParameters(uv_work_t *req) {
    // TODO: handle if .Close is called before this function is called.
    GapUpdateConnectionParametersBaton *baton = static_cast<GapUpdateConnectionParametersBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gap_conn_param_update(baton->conn_handle, baton->connectionParameters);
}

// This runs in Main Thread
void AfterGapUpdateConnectionParameters(uv_work_t *req) {
    NanScope();

    // TODO: handle if .Close is called before this function is called.
    GapUpdateConnectionParametersBaton *baton = static_cast<GapUpdateConnectionParametersBaton *>(req->data);
    v8::Handle<v8::Value> argv[1];

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
    NanScope();

    // CycleMode
    if (!args[0]->IsNumber())
    {
        NanThrowTypeError("First argument must be a number");
        NanReturnUndefined();
    }
    uint16_t conn_handle = ConversionUtility::getNativeUint16(args[0]);

    // CycleMode
    if (!args[1]->IsNumber())
    {
        NanThrowTypeError("Second argument must be a number");
        NanReturnUndefined();
    }
    uint8_t hci_status_code = ConversionUtility::getNativeUint8(args[1]);

    if (!args[2]->IsFunction())
    {
        NanThrowTypeError("Third argument must be a function");
        NanReturnUndefined();
    }
    v8::Local<v8::Function> callback = args[2].As<v8::Function>();

    GapDisconnectBaton *baton = new GapDisconnectBaton(callback);
    baton->conn_handle = conn_handle;
    baton->hci_status_code = hci_status_code;

    uv_queue_work(uv_default_loop(), baton->req, GapDisconnect, (uv_after_work_cb)AfterGapDisconnect);

    // TODO: generate a generic function to handle return code from the SD. If not NRF_SUCCESS, raise an exception.
    NanReturnUndefined();
}

// This runs in a worker thread (not Main Thread)
void GapDisconnect(uv_work_t *req) {
    // TODO: handle if .Close is called before this function is called.
    GapDisconnectBaton *baton = static_cast<GapDisconnectBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gap_disconnect(baton->conn_handle, baton->hci_status_code);
}

// This runs in Main Thread
void AfterGapDisconnect(uv_work_t *req) {
    NanScope();

    // TODO: handle if .Close is called before this function is called.
    GapDisconnectBaton *baton = static_cast<GapDisconnectBaton *>(req->data);
    v8::Handle<v8::Value> argv[1];

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
    NanScope();

    // TxPower
    if (!args[0]->IsNumber())
    {
        NanThrowTypeError("First argument must be a number");
        NanReturnUndefined();
    }
    int8_t tx_power = (int8_t)args[0]->ToInt32()->NumberValue();

    if (!args[1]->IsFunction())
    {
        NanThrowTypeError("Second argument must be a function");
        NanReturnUndefined();
    }
    v8::Local<v8::Function> callback = args[1].As<v8::Function>();

    TXPowerBaton *baton = new TXPowerBaton(callback);

    baton->tx_power = tx_power;

    uv_queue_work(uv_default_loop(), baton->req, GapSetTXPower, (uv_after_work_cb)AfterGapSetTXPower);

    // TODO: generate a generic function to handle return code from the SD. If not NRF_SUCCESS, raise an exception.
    NanReturnUndefined();
}

// This runs in a worker thread (not Main Thread)
void GapSetTXPower(uv_work_t *req) {
    // TODO: handle if .Close is called before this function is called.
    TXPowerBaton *baton = static_cast<TXPowerBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gap_tx_power_set(baton->tx_power);
}

// This runs in Main Thread
void AfterGapSetTXPower(uv_work_t *req) {
    NanScope();

    // TODO: handle if .Close is called before this function is called.
    TXPowerBaton *baton = static_cast<TXPowerBaton *>(req->data);
    v8::Handle<v8::Value> argv[1];

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
    NanScope();

    if (!args[0]->IsObject())
    {
        NanThrowTypeError("First argument must be a object");
        NanReturnUndefined();
    }
    v8::Local<v8::Object> conn_sec_mode = args[0]->ToObject();

    if (!args[1]->IsString())
    {
        NanThrowTypeError("Second argument must be a string");
        NanReturnUndefined();
    }
    v8::Local<v8::String> dev_name_string = args[1]->ToString();

    if (!args[2]->IsFunction())
    {
        NanThrowTypeError("Third argument must be a function");
        NanReturnUndefined();
    }
    v8::Local<v8::Function> callback = args[2].As<v8::Function>();

    size_t length = dev_name_string->Length();

    // Allocate enough space for null termination of string
    char *dev_name = (char*)malloc(length + 1);

    dev_name_string->WriteUtf8(dev_name, length);

    GapSetDeviceNameBaton *baton = new GapSetDeviceNameBaton(callback);
    baton->conn_sec_mode = GapConnSecMode(conn_sec_mode);

    baton->dev_name = (uint8_t*)dev_name;
    baton->length = length;

    uv_queue_work(uv_default_loop(), baton->req, GapSetDeviceName, (uv_after_work_cb)AfterGapSetDeviceName);

    // TODO: generate a generic function to handle return code from the SD. If not NRF_SUCCESS, raise an exception.
    NanReturnUndefined();
}

// This runs in a worker thread (not Main Thread)
void GapSetDeviceName(uv_work_t *req) {
    // TODO: handle if .Close is called before this function is called.
    GapSetDeviceNameBaton *baton = static_cast<GapSetDeviceNameBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gap_device_name_set(baton->conn_sec_mode, baton->dev_name, baton->length);
}

// This runs in Main Thread
void AfterGapSetDeviceName(uv_work_t *req) {
    NanScope();

    // TODO: handle if .Close is called before this function is called.
    GapSetDeviceNameBaton *baton = static_cast<GapSetDeviceNameBaton *>(req->data);
    v8::Handle<v8::Value> argv[1];

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
    NanScope();

    if (!args[0]->IsFunction())
    {
        NanThrowTypeError("First argument must be a function");
        NanReturnUndefined();
    }

    v8::Local<v8::Function> callback = args[0].As<v8::Function>();

    GapGetDeviceNameBaton *baton = new GapGetDeviceNameBaton(callback);

    baton->length = 248; // Max length of Device name characteristic
    baton->dev_name = (uint8_t*)malloc(baton->length);

    uv_queue_work(uv_default_loop(), baton->req, GapGetDeviceName, (uv_after_work_cb)AfterGapGetDeviceName);

    // TODO: generate a generic function to handle return code from the SD. If not NRF_SUCCESS, raise an exception.
    NanReturnUndefined();
}

// This runs in a worker thread (not Main Thread)
void GapGetDeviceName(uv_work_t *req) {
    // TODO: handle if .Close is called before this function is called.
    GapGetDeviceNameBaton *baton = static_cast<GapGetDeviceNameBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gap_device_name_get(baton->dev_name, &(baton->length));
}

// This runs in Main Thread
void AfterGapGetDeviceName(uv_work_t *req) {
    NanScope();

    // TODO: handle if .Close is called before this function is called.
    GapGetDeviceNameBaton *baton = static_cast<GapGetDeviceNameBaton *>(req->data);
    v8::Handle<v8::Value> argv[2];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = Nan::Undefined();
        argv[1] = ErrorMessage::getErrorMessage(baton->result, "getting device name.");
    }
    else
    {
        size_t length = baton->length;
        baton->dev_name[length] = 0;

        v8::Local<v8::String> dev_name = Nan::New<v8::String>(baton->dev_name);

        argv[0] = dev_name;
        argv[1] = Nan::Undefined();
    }

    baton->callback->Call(2, argv);
    free(baton->dev_name);
    delete baton;
}


NAN_METHOD(GapStartRSSI)
{
    NanScope();

    // Connection handle
    if (!args[0]->IsNumber())
    {
        NanThrowTypeError("First argument must be a number");
        NanReturnUndefined();
    }
    uint16_t conn_handle = ConversionUtility::getNativeUint16(args[0]);

    // dbm treshold
    if (!args[1]->IsNumber())
    {
        NanThrowTypeError("Second argument must be a number");
        NanReturnUndefined();
    }
    uint8_t treshold_dbm = ConversionUtility::getNativeUint8(args[1]);

    // Skip count
    if (!args[2]->IsNumber())
    {
        NanThrowTypeError("Third argument must be a number");
        NanReturnUndefined();
    }
    uint8_t skip_count = ConversionUtility::getNativeUint8(args[2]);

    if (!args[3]->IsFunction())
    {
        NanThrowTypeError("Forth argument must be a function");
        NanReturnUndefined();
    }
    v8::Local<v8::Function> callback = args[3].As<v8::Function>();

    GapStartRSSIBaton *baton = new GapStartRSSIBaton(callback);
    baton->conn_handle = conn_handle;
    baton->treshold_dbm = treshold_dbm;
    baton->skip_count = skip_count;

    uv_queue_work(uv_default_loop(), baton->req, GapStartRSSI, (uv_after_work_cb)AfterGapStartRSSI);

    // TODO: generate a generic function to handle return code from the SD. If not NRF_SUCCESS, raise an exception.
    NanReturnUndefined();
}

// This runs in a worker thread (not Main Thread)
void GapStartRSSI(uv_work_t *req) {
    // TODO: handle if .Close is called before this function is called.
    GapStartRSSIBaton *baton = static_cast<GapStartRSSIBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gap_rssi_start(baton->conn_handle, baton->treshold_dbm, baton->skip_count);
}

// This runs in Main Thread
void AfterGapStartRSSI(uv_work_t *req) {
    NanScope();

    // TODO: handle if .Close is called before this function is called.
    GapStartRSSIBaton *baton = static_cast<GapStartRSSIBaton *>(req->data);
    v8::Handle<v8::Value> argv[1];

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
    NanScope();

    // CycleMode
    if (!args[0]->IsNumber())
    {
        NanThrowTypeError("First argument must be a number");
        NanReturnUndefined();
    }
    uint16_t conn_handle = ConversionUtility::getNativeUint16(args[0]);

    if (!args[1]->IsFunction())
    {
        NanThrowTypeError("Second argument must be a function");
        NanReturnUndefined();
    }
    v8::Local<v8::Function> callback = args[1].As<v8::Function>();

    GapStopRSSIBaton *baton = new GapStopRSSIBaton(callback);
    baton->conn_handle = conn_handle;

    uv_queue_work(uv_default_loop(), baton->req, GapStopRSSI, (uv_after_work_cb)AfterGapStopRSSI);

    // TODO: generate a generic function to handle return code from the SD. If not NRF_SUCCESS, raise an exception.
    NanReturnUndefined();
}

// This runs in a worker thread (not Main Thread)
void GapStopRSSI(uv_work_t *req) {
    // TODO: handle if .Close is called before this function is called.
    GapStopRSSIBaton *baton = static_cast<GapStopRSSIBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gap_rssi_stop(baton->conn_handle);
}

// This runs in Main Thread
void AfterGapStopRSSI(uv_work_t *req) {
    NanScope();

    // TODO: handle if .Close is called before this function is called.
    GapStopRSSIBaton *baton = static_cast<GapStopRSSIBaton *>(req->data);
    v8::Handle<v8::Value> argv[1];

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
    NanScope();

    if (!args[0]->IsObject()) {
        NanThrowTypeError("First argument must be an object");
        NanReturnUndefined();
    }
    v8::Local<v8::Object> options = args[0]->ToObject();

    // Callback
    if (!args[1]->IsFunction()) {
        NanThrowTypeError("Second argument must be a function");
        NanReturnUndefined();
    }
    v8::Local<v8::Function> callback = args[1].As<v8::Function>();

    ble_gap_scan_params_t *params = GapScanParams(options);

    StartScanBaton *baton = new StartScanBaton(callback);
    baton->scan_params = params;

    uv_queue_work(uv_default_loop(), baton->req, StartScan, (uv_after_work_cb)AfterStartScan);

    // TODO: generate a generic function to handle return code from the SD. If not NRF_SUCCESS, raise an exception.
    NanReturnUndefined();
}

// This runs in a worker thread (not Main Thread)
void StartScan(uv_work_t *req) {
    // TODO: handle if .Close is called before this function is called.
    StartScanBaton *baton = static_cast<StartScanBaton *>(req->data);
    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gap_scan_start(baton->scan_params);
}

// This runs in Main Thread
void AfterStartScan(uv_work_t *req) {
    NanScope();

    // TODO: handle if .Close is called before this function is called.
    StartScanBaton *baton = static_cast<StartScanBaton *>(req->data);
    v8::Handle<v8::Value> argv[1];

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
    NanScope();

    if (!args[0]->IsFunction())
    {
        NanThrowTypeError("First argument must be a function");
        NanReturnUndefined();
    }
    v8::Local<v8::Function> callback = args[0].As<v8::Function>();

    StopScanBaton *baton = new StopScanBaton(callback);

    uv_queue_work(uv_default_loop(), baton->req, StopScan, (uv_after_work_cb)AfterStopScan);

    // TODO: generate a generic function to handle return code from the SD. If not NRF_SUCCESS, raise an exception.
    NanReturnUndefined();
}

// This runs in a worker thread (not Main Thread)
void StopScan(uv_work_t *req) {
    // TODO: handle if .Close is called before this function is called.
    StopScanBaton *baton = static_cast<StopScanBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gap_scan_stop();
}

// This runs in Main Thread
void AfterStopScan(uv_work_t *req) {
    NanScope();

    // TODO: handle if .Close is called before this function is called.
    StopScanBaton *baton = static_cast<StopScanBaton *>(req->data);
    v8::Handle<v8::Value> argv[1];

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
    NanScope();

    if (!args[0]->IsObject()) {
        NanThrowTypeError("First argument must be an object");
        NanReturnUndefined();
    }
    v8::Local<v8::Object> address = args[0]->ToObject();

    if (!args[1]->IsObject()) {
        NanThrowTypeError("Second argument must be an object");
        NanReturnUndefined();
    }
    v8::Local<v8::Object> scan_params = args[1]->ToObject();

    if (!args[2]->IsObject()) {
        NanThrowTypeError("Third argument must be an object");
        NanReturnUndefined();
    }
    v8::Local<v8::Object> conn_params = args[2]->ToObject();

    if (!args[3]->IsFunction())
    {
        NanThrowTypeError("Fourth argument must be a function");
        NanReturnUndefined();
    }
    v8::Local<v8::Function> callback = args[3].As<v8::Function>();

    GapConnectBaton *baton = new GapConnectBaton(callback);
    baton->req->data = (void *)baton;
    baton->address = GapAddr(address);
    baton->scan_params = GapScanParams(scan_params);
    baton->conn_params = GapConnParams(conn_params);

    uv_queue_work(uv_default_loop(), baton->req, GapConnect, (uv_after_work_cb)AfterGapConnect);

    // TODO: generate a generic function to handle return code from the SD. If not NRF_SUCCESS, raise an exception.
    NanReturnUndefined();
}

// This runs in a worker thread (not Main Thread)
void GapConnect(uv_work_t *req) {
    // TODO: handle if .Close is called before this function is called.
    GapConnectBaton *baton = static_cast<GapConnectBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gap_connect(baton->address, baton->scan_params, baton->conn_params);
}

// This runs in Main Thread
void AfterGapConnect(uv_work_t *req) {
    NanScope();

    // TODO: handle if .Close is called before this function is called.
    GapConnectBaton *baton = static_cast<GapConnectBaton *>(req->data);
    v8::Handle<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "connecting.");
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
    NanScope();

    if (!args[0]->IsFunction())
    {
        NanThrowTypeError("First argument must be a function");
        NanReturnUndefined();
    }
    v8::Local<v8::Function> callback = args[0].As<v8::Function>();

    GapConnectCancelBaton *baton = new GapConnectCancelBaton(callback);

    uv_queue_work(uv_default_loop(), baton->req, GapCancelConnect, (uv_after_work_cb)AfterGapCancelConnect);

    // TODO: generate a generic function to handle return code from the SD. If not NRF_SUCCESS, raise an exception.
    NanReturnUndefined();
}

// This runs in a worker thread (not Main Thread)
void GapCancelConnect(uv_work_t *req) {
    // TODO: handle if .Close is called before this function is called.
    GapConnectCancelBaton *baton = static_cast<GapConnectCancelBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gap_connect_cancel();
}

// This runs in Main Thread
void AfterGapCancelConnect(uv_work_t *req) {
    NanScope();

    // TODO: handle if .Close is called before this function is called.
    GapConnectCancelBaton *baton = static_cast<GapConnectCancelBaton *>(req->data);
    v8::Handle<v8::Value> argv[1];

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
    NanScope();

    // Connection handle
    if (!args[0]->IsNumber())
    {
        NanThrowTypeError("First argument must be a number");
        NanReturnUndefined();
    }
    uint16_t conn_handle = ConversionUtility::getNativeUint16(args[0]);

    if (!args[1]->IsFunction())
    {
        NanThrowTypeError("Second argument must be a function");
        NanReturnUndefined();
    }
    v8::Local<v8::Function> callback = args[1].As<v8::Function>();

    GapGetRSSIBaton *baton = new GapGetRSSIBaton(callback);
    baton->conn_handle = conn_handle;
    baton->rssi = 0;

    uv_queue_work(uv_default_loop(), baton->req, GapGetRSSI, (uv_after_work_cb)AfterGapGetRSSI);

    // TODO: generate a generic function to handle return code from the SD. If not NRF_SUCCESS, raise an exception.
    NanReturnUndefined();
}

// This runs in a worker thread (not Main Thread)
void GapGetRSSI(uv_work_t *req) {
    // TODO: handle if .Close is called before this function is called.
    GapGetRSSIBaton *baton = static_cast<GapGetRSSIBaton *>(req->data);

    std::cout << "GapGetRSSI Call" << std::endl;

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);

    std::cout << "GapGetRSSI After Lock" << baton->conn_handle << std::endl;
    //TODO: Does not return. Unsure if it is the serialization, my code, or SD which does not behave.
    baton->result = sd_ble_gap_rssi_get(baton->conn_handle, &(baton->rssi));

    std::cout << "GapGetRSSI After Call" << std::endl;
}

// This runs in Main Thread
void AfterGapGetRSSI(uv_work_t *req) {
    NanScope();

    // TODO: handle if .Close is called before this function is called.
    GapGetRSSIBaton *baton = static_cast<GapGetRSSIBaton *>(req->data);
    v8::Handle<v8::Value> argv[2];

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

extern "C" {
    void init_gap(v8::Handle<v8::Object> target)
    {
        NODE_SET_METHOD(target, "gap_set_address", GapSetAddress);
        NODE_SET_METHOD(target, "gap_get_address", GapGetAddress);
        NODE_SET_METHOD(target, "gap_update_connection_parameters", GapUpdateConnectionParameters);
        NODE_SET_METHOD(target, "gap_disconnect", GapDisconnect);
        NODE_SET_METHOD(target, "gap_set_tx_power", GapSetTXPower);
        NODE_SET_METHOD(target, "gap_set_device_name", GapSetDeviceName);
        NODE_SET_METHOD(target, "gap_get_device_name", GapGetDeviceName);
        NODE_SET_METHOD(target, "gap_start_rssi", GapStartRSSI);
        NODE_SET_METHOD(target, "gap_stop_rssi", GapStopRSSI);
        NODE_SET_METHOD(target, "start_scan", StartScan);
        NODE_SET_METHOD(target, "stop_scan", StopScan);
        NODE_SET_METHOD(target, "gap_connect", GapConnect);
        NODE_SET_METHOD(target, "gap_cancel_connect", GapCancelConnect);
        NODE_SET_METHOD(target, "gap_get_rssi", GapGetRSSI);

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
