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

#include <chrono>
#include <ctime>
#include <sstream>
#include <iostream>
#include <cassert>

#include "common.h"
#include "ble_hci.h"

#define RETURN_VALUE_OR_THROW_EXCEPTION(method) \
try \
{ \
    return (method); \
} \
catch(std::string error) \
{ \
    std::cout << "Exception: " << name << ":" << error << std::endl; \
    std::stringstream ex; \
    ex << "Failed to get property " << name << ": " << error; \
    throw ex.str(); \
}

static name_map_t error_message_name_map =
{
    // Generic errors
    NAME_MAP_ENTRY(NRF_SUCCESS),
    NAME_MAP_ENTRY(NRF_ERROR_SVC_HANDLER_MISSING),
    NAME_MAP_ENTRY(NRF_ERROR_SOFTDEVICE_NOT_ENABLED),
    NAME_MAP_ENTRY(NRF_ERROR_INTERNAL),
    NAME_MAP_ENTRY(NRF_ERROR_NO_MEM),
    NAME_MAP_ENTRY(NRF_ERROR_NOT_FOUND),
    NAME_MAP_ENTRY(NRF_ERROR_NOT_SUPPORTED),
    NAME_MAP_ENTRY(NRF_ERROR_INVALID_PARAM),
    NAME_MAP_ENTRY(NRF_ERROR_INVALID_STATE),
    NAME_MAP_ENTRY(NRF_ERROR_INVALID_LENGTH),
    NAME_MAP_ENTRY(NRF_ERROR_INVALID_FLAGS),
    NAME_MAP_ENTRY(NRF_ERROR_INVALID_DATA),
    NAME_MAP_ENTRY(NRF_ERROR_DATA_SIZE),
    NAME_MAP_ENTRY(NRF_ERROR_TIMEOUT),
    NAME_MAP_ENTRY(NRF_ERROR_NULL),
    NAME_MAP_ENTRY(NRF_ERROR_FORBIDDEN),
    NAME_MAP_ENTRY(NRF_ERROR_INVALID_ADDR),
    NAME_MAP_ENTRY(NRF_ERROR_BUSY),
    NAME_MAP_ENTRY(NRF_ERROR_CONN_COUNT),
    NAME_MAP_ENTRY(NRF_ERROR_RESOURCES),

    // BLE related errors
    NAME_MAP_ENTRY(BLE_ERROR_NOT_ENABLED),
    NAME_MAP_ENTRY(BLE_ERROR_INVALID_CONN_HANDLE),
    NAME_MAP_ENTRY(BLE_ERROR_INVALID_ATTR_HANDLE),
    NAME_MAP_ENTRY(BLE_ERROR_NO_TX_PACKETS),
    NAME_MAP_ENTRY(BLE_ERROR_INVALID_ROLE),

    // GAP related errors
    NAME_MAP_ENTRY(BLE_ERROR_GAP_UUID_LIST_MISMATCH),
    NAME_MAP_ENTRY(BLE_ERROR_GAP_DISCOVERABLE_WITH_WHITELIST),
    NAME_MAP_ENTRY(BLE_ERROR_GAP_INVALID_BLE_ADDR),
    NAME_MAP_ENTRY(BLE_ERROR_GAP_WHITELIST_IN_USE),

#ifdef BLE_ERROR_GAP_DEVICE_IDENTITIES_IN_USE
    NAME_MAP_ENTRY(BLE_ERROR_GAP_DEVICE_IDENTITIES_IN_USE),
#endif
#ifdef BLE_ERROR_GAP_DEVICE_IDENTITIES_DUPLICATE
    NAME_MAP_ENTRY(BLE_ERROR_GAP_DEVICE_IDENTITIES_DUPLICATE),
#endif

    // GATT related errors

    // GATTC related errors
    NAME_MAP_ENTRY(BLE_ERROR_GATTC_PROC_NOT_PERMITTED),

    // GATTS related errors
    NAME_MAP_ENTRY(BLE_ERROR_GATTS_INVALID_ATTR_TYPE),
    NAME_MAP_ENTRY(BLE_ERROR_GATTS_SYS_ATTR_MISSING),

    // L2CAP related errors
    NAME_MAP_ENTRY(BLE_ERROR_L2CAP_CID_IN_USE),
};

static name_map_t sd_rpc_app_status_map =
{
    NAME_MAP_ENTRY(PKT_SEND_MAX_RETRIES_REACHED),
    NAME_MAP_ENTRY(PKT_UNEXPECTED),
    NAME_MAP_ENTRY(PKT_ENCODE_ERROR),
    NAME_MAP_ENTRY(PKT_DECODE_ERROR),
    NAME_MAP_ENTRY(IO_RESOURCES_UNAVAILABLE),
    NAME_MAP_ENTRY(RESET_PERFORMED),
    NAME_MAP_ENTRY(CONNECTION_ACTIVE)
};

static name_map_t hci_status_map =
{
    NAME_MAP_ENTRY(BLE_HCI_STATUS_CODE_SUCCESS),
    NAME_MAP_ENTRY(BLE_HCI_STATUS_CODE_UNKNOWN_BTLE_COMMAND),
    NAME_MAP_ENTRY(BLE_HCI_STATUS_CODE_UNKNOWN_CONNECTION_IDENTIFIER),
    NAME_MAP_ENTRY(BLE_HCI_AUTHENTICATION_FAILURE),
    NAME_MAP_ENTRY(BLE_HCI_STATUS_CODE_PIN_OR_KEY_MISSING),
    NAME_MAP_ENTRY(BLE_HCI_MEMORY_CAPACITY_EXCEEDED),
    NAME_MAP_ENTRY(BLE_HCI_CONNECTION_TIMEOUT),
    NAME_MAP_ENTRY(BLE_HCI_STATUS_CODE_COMMAND_DISALLOWED),
    NAME_MAP_ENTRY(BLE_HCI_STATUS_CODE_INVALID_BTLE_COMMAND_PARAMETERS),
    NAME_MAP_ENTRY(BLE_HCI_REMOTE_USER_TERMINATED_CONNECTION),
    NAME_MAP_ENTRY(BLE_HCI_REMOTE_DEV_TERMINATION_DUE_TO_LOW_RESOURCES),
    NAME_MAP_ENTRY(BLE_HCI_REMOTE_DEV_TERMINATION_DUE_TO_POWER_OFF),
    NAME_MAP_ENTRY(BLE_HCI_LOCAL_HOST_TERMINATED_CONNECTION),
    NAME_MAP_ENTRY(BLE_HCI_UNSUPPORTED_REMOTE_FEATURE),
    NAME_MAP_ENTRY(BLE_HCI_STATUS_CODE_INVALID_LMP_PARAMETERS),
    NAME_MAP_ENTRY(BLE_HCI_STATUS_CODE_UNSPECIFIED_ERROR),
    NAME_MAP_ENTRY(BLE_HCI_STATUS_CODE_LMP_RESPONSE_TIMEOUT),
    NAME_MAP_ENTRY(BLE_HCI_STATUS_CODE_LMP_PDU_NOT_ALLOWED),
    NAME_MAP_ENTRY(BLE_HCI_INSTANT_PASSED),
    NAME_MAP_ENTRY(BLE_HCI_PAIRING_WITH_UNIT_KEY_UNSUPPORTED ),
    NAME_MAP_ENTRY(BLE_HCI_DIFFERENT_TRANSACTION_COLLISION),
    NAME_MAP_ENTRY(BLE_HCI_CONTROLLER_BUSY),
    NAME_MAP_ENTRY(BLE_HCI_CONN_INTERVAL_UNACCEPTABLE),
    NAME_MAP_ENTRY(BLE_HCI_DIRECTED_ADVERTISER_TIMEOUT),
    NAME_MAP_ENTRY(BLE_HCI_CONN_TERMINATED_DUE_TO_MIC_FAILURE),
    NAME_MAP_ENTRY(BLE_HCI_CONN_FAILED_TO_BE_ESTABLISHED)
};

const std::string getCurrentTimeInMilliseconds()
{
    auto current_time = std::chrono::system_clock::now();
    auto time = std::chrono::system_clock::to_time_t(current_time);
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(current_time.time_since_epoch());

    auto ttm = gmtime(&time);

    char date_time_format[] = "%Y-%m-%dT%H:%M:%S";
    char time_str[20] = "";

    strftime(time_str, 20, date_time_format, ttm);

    std::string result(time_str);
    result.append(".");

    auto millisecond_str = std::to_string(static_cast<int>(ms.count() % 1000));
    result.append(std::max(0, static_cast<int>(3 - millisecond_str.length())), '0');
    result.append(millisecond_str);
    result.append("Z");

    return result;
}

uint16_t uint16_decode(const uint8_t *p_encoded_data)
{
        return ( (static_cast<uint16_t>(const_cast<uint8_t *>(p_encoded_data)[0])) |
                 (static_cast<uint16_t>(const_cast<uint8_t *>(p_encoded_data)[1]) << 8 ));
}

uint32_t uint32_decode(const uint8_t *p_encoded_data)
{
    return ((static_cast<uint32_t>(const_cast<uint8_t *>(p_encoded_data)[0]) << 0)  |
            (static_cast<uint32_t>(const_cast<uint8_t *>(p_encoded_data)[1]) << 8)  |
            (static_cast<uint32_t>(const_cast<uint8_t *>(p_encoded_data)[2]) << 16) |
            (static_cast<uint32_t>(const_cast<uint8_t *>(p_encoded_data)[3]) << 24));
}

uint16_t fromNameToValue(name_map_t names, const char *name)
{
    name_map_it_t it;
    uint16_t key = -1;

    for (it = names.begin(); it != names.end(); ++it)
    {
        if (strcmp(it->second, name) == 0)
        {
            key = it->first;
            break;
        }
    }

    return key;
}


uint32_t ConversionUtility::getNativeUint32(v8::Local<v8::Object>js, const char *name)
{
    RETURN_VALUE_OR_THROW_EXCEPTION(ConvUtil<uint32_t>::getNativeUnsigned(js, name));
}

uint32_t ConversionUtility::getNativeUint32(v8::Local<v8::Value> js)
{
    return ConvUtil<uint32_t>::getNativeUnsigned(js);
}

uint16_t ConversionUtility::getNativeUint16(v8::Local<v8::Object>js, const char *name)
{
    RETURN_VALUE_OR_THROW_EXCEPTION(ConvUtil<uint16_t>::getNativeUnsigned(js, name));
}

uint16_t ConversionUtility::getNativeUint16(v8::Local<v8::Value> js)
{
    return ConvUtil<uint16_t>::getNativeUnsigned(js);
}

uint8_t ConversionUtility::getNativeUint8(v8::Local<v8::Object>js, const char *name)
{
    RETURN_VALUE_OR_THROW_EXCEPTION(ConvUtil<uint8_t>::getNativeUnsigned(js, name));
}

uint8_t ConversionUtility::getNativeUint8(v8::Local<v8::Value> js)
{
    return ConvUtil<uint8_t>::getNativeUnsigned(js);
}

int32_t ConversionUtility::getNativeInt32(v8::Local<v8::Object>js, const char *name)
{
    RETURN_VALUE_OR_THROW_EXCEPTION(ConvUtil<int32_t>::getNativeSigned(js, name));
}

int32_t ConversionUtility::getNativeInt32(v8::Local<v8::Value>js)
{
    return ConvUtil<int32_t>::getNativeSigned(js);
}

int16_t ConversionUtility::getNativeInt16(v8::Local<v8::Object>js, const char *name)
{
    RETURN_VALUE_OR_THROW_EXCEPTION(ConvUtil<int16_t>::getNativeSigned(js, name));
}

int16_t ConversionUtility::getNativeInt16(v8::Local<v8::Value>js)
{
    return ConvUtil<int16_t>::getNativeSigned(js);
}

int8_t ConversionUtility::getNativeInt8(v8::Local<v8::Object>js, const char *name)
{
    RETURN_VALUE_OR_THROW_EXCEPTION(ConvUtil<int8_t>::getNativeSigned(js, name));
}

int8_t ConversionUtility::getNativeInt8(v8::Local<v8::Value>js)
{
    return ConvUtil<int8_t>::getNativeSigned(js);
}

double ConversionUtility::getNativeDouble(v8::Local<v8::Object>js, const char *name)
{
    RETURN_VALUE_OR_THROW_EXCEPTION(ConvUtil<double>::getNativeFloat(js, name));
}

double ConversionUtility::getNativeDouble(v8::Local<v8::Value>js)
{
    return ConvUtil<double>::getNativeFloat(js);
}

uint8_t ConversionUtility::getNativeBool(v8::Local<v8::Object>js, const char *name)
{
    RETURN_VALUE_OR_THROW_EXCEPTION(ConvUtil<bool>::getNativeBool(js, name));
}

uint8_t ConversionUtility::getNativeBool(v8::Local<v8::Value>js)
{
    return ConvUtil<bool>::getNativeBool(js);
}

bool ConversionUtility::getBool(v8::Local<v8::Object>js, const char *name)
{
    RETURN_VALUE_OR_THROW_EXCEPTION(ConvUtil<bool>::getNativeBool(js, name));
}

bool ConversionUtility::getBool(v8::Local<v8::Value>js)
{
    return ConvUtil<bool>::getNativeBool(js);
}

uint8_t *ConversionUtility::getNativePointerToUint8(v8::Local<v8::Object>js, const char *name)
{
    v8::Local<v8::Value> value = Utility::Get(js, name);

    RETURN_VALUE_OR_THROW_EXCEPTION(ConversionUtility::getNativePointerToUint8(value));
}

uint8_t *ConversionUtility::getNativePointerToUint8(v8::Local<v8::Value> js)
{
    if (!js->IsArray())
    {
        throw std::string("array");
    }

    v8::Local<v8::Array> jsarray = v8::Local<v8::Array>::Cast(js);
    auto length = jsarray->Length();
    auto string = static_cast<uint8_t *>(malloc(sizeof(uint8_t) * length));

    assert(string != nullptr);

    for (uint32_t i = 0; i < length; ++i)
    {
        string[i] = static_cast<uint8_t>(jsarray->Get(Nan::New(i))->Uint32Value());
    }

    return string;
}

uint16_t *ConversionUtility::getNativePointerToUint16(v8::Local<v8::Object>js, const char *name)
{
    v8::Local<v8::Value> value = Utility::Get(js, name);

    RETURN_VALUE_OR_THROW_EXCEPTION(ConversionUtility::getNativePointerToUint16(value));
}

uint16_t *ConversionUtility::getNativePointerToUint16(v8::Local<v8::Value>js)
{
    v8::Local<v8::Array> jsarray = v8::Local<v8::Array>::Cast(js);
    auto length = jsarray->Length();
    auto string = static_cast<uint16_t *>(malloc(sizeof(uint16_t) * length));

    assert(string != nullptr);

    for (uint32_t i = 0; i < length; ++i)
    {
        string[i] = static_cast<uint16_t>(jsarray->Get(Nan::New(i))->Uint32Value());
    }

    return string;
}

v8::Local<v8::Object> ConversionUtility::getJsObject(v8::Local<v8::Value>js)
{
    if (!js->IsObject())
    {
        throw std::string("object");
    }

    return js->ToObject();
}

v8::Local<v8::Object> ConversionUtility::getJsObject(v8::Local<v8::Object> js, const char *name)
{
    v8::Local<v8::Value> obj = Utility::Get(js, name);

    RETURN_VALUE_OR_THROW_EXCEPTION(ConversionUtility::getJsObject(obj));
}

v8::Local<v8::Object> ConversionUtility::getJsObjectOrNull(v8::Local<v8::Value>js)
{
    if (js->IsNull())
    {
        Nan::EscapableHandleScope scope;
        v8::Local<v8::Object> newobj = Nan::New<v8::Object>();
        Utility::Set(newobj, "special_hack_null_object", true);
        return scope.Escape(newobj);
    }
    else if (js->IsObject())
    {
        return ConversionUtility::getJsObject(js);
    }

    throw std::string("object or null");
}

v8::Local<v8::Object> ConversionUtility::getJsObjectOrNull(v8::Local<v8::Object>js, const char *name)
{
    v8::Local<v8::Value> obj = Utility::Get(js, name);

    RETURN_VALUE_OR_THROW_EXCEPTION(ConversionUtility::getJsObjectOrNull(obj));
}

uint16_t ConversionUtility::stringToValue(name_map_t name_map, v8::Local<v8::Object> string, uint16_t defaultValue)
{
    name_map_it_t it;
    auto key = defaultValue;

    auto name = reinterpret_cast<const char *>(ConversionUtility::getNativePointerToUint8(string));

    for (it = name_map.begin(); it != name_map.end(); ++it)
    {
        if (strcmp(it->second, name) == 0)
        {
            key = it->first;
            break;
        }
    }

    return key;
}

std::string ConversionUtility::getNativeString(v8::Local<v8::Object>js, const char *name)
{
    v8::Local<v8::Value> obj = Utility::Get(js, name);

    RETURN_VALUE_OR_THROW_EXCEPTION(ConversionUtility::getNativeString(obj));
}

std::string ConversionUtility::getNativeString(v8::Local<v8::Value> js)
{
    if (!js->IsString())
    {
        throw std::string("string");
    }

    return std::string(*Nan::Utf8String(js));
}

uint16_t ConversionUtility::msecsToUnitsUint16(v8::Local<v8::Object>js, const char *name, enum ConversionUtility::ConversionUnits unit)
{
    auto msecs = getNativeDouble(js, name);
    return msecsToUnitsUint16(msecs, unit);
}

uint16_t ConversionUtility::msecsToUnitsUint16(double msecs, enum ConversionUtility::ConversionUnits unit)
{
    return static_cast<uint16_t>(msecs * 1000 / unit);
}

uint8_t ConversionUtility::msecsToUnitsUint8(v8::Local<v8::Object>js, const char *name, enum ConversionUtility::ConversionUnits unit)
{
    auto msecs = getNativeDouble(js, name);
    return msecsToUnitsUint8(msecs, unit);
}

uint8_t ConversionUtility::msecsToUnitsUint8(double msecs, enum ConversionUtility::ConversionUnits unit)
{
    return static_cast<uint8_t>(msecs * 1000 / unit);
}

v8::Handle<v8::Value> ConversionUtility::unitsToMsecs(uint16_t units, enum ConversionUtility::ConversionUnits unit)
{
    auto _unit = units * unit / 1000.0;
    return toJsNumber(_unit);
}

v8::Handle<v8::Value> ConversionUtility::toJsNumber(int32_t nativeValue)
{
    Nan::EscapableHandleScope scope;
    return scope.Escape(Nan::New<v8::Integer>(nativeValue));
}

v8::Handle<v8::Value> ConversionUtility::toJsNumber(uint32_t nativeValue)
{
    Nan::EscapableHandleScope scope;
    return scope.Escape(Nan::New<v8::Integer>(nativeValue));
}

v8::Handle<v8::Value> ConversionUtility::toJsNumber(uint16_t nativeValue)
{
    Nan::EscapableHandleScope scope;
    return scope.Escape(Nan::New<v8::Integer>(nativeValue));
}

v8::Handle<v8::Value> ConversionUtility::toJsNumber(uint8_t nativeValue)
{
    Nan::EscapableHandleScope scope;
    return scope.Escape(Nan::New<v8::Integer>(nativeValue));
}

v8::Handle<v8::Value> ConversionUtility::toJsNumber(double nativeValue)
{
    Nan::EscapableHandleScope scope;
    return scope.Escape(Nan::New<v8::Number>(nativeValue));
}

v8::Handle<v8::Value> ConversionUtility::toJsBool(uint8_t nativeValue)
{
    Nan::EscapableHandleScope scope;
    return scope.Escape(Nan::New<v8::Boolean>(nativeValue ? true : false));
}

v8::Handle<v8::Value> ConversionUtility::toJsValueArray(uint8_t *nativeData, uint16_t length)
{
    Nan::EscapableHandleScope scope;

    v8::Local<v8::Array> valueArray = Nan::New<v8::Array>(length);

    for (int i = 0; i < length; ++i)
    {
        valueArray->Set(i, ConversionUtility::toJsNumber(nativeData[i]));
    }

    return scope.Escape(valueArray);
}

v8::Handle<v8::Value> ConversionUtility::toJsValueArray(const uint8_t *nativeData, uint16_t length)
{
	return ConversionUtility::toJsValueArray(const_cast<uint8_t *>(nativeData), length);
}

v8::Handle<v8::Value> ConversionUtility::toJsString(const char *cString)
{
    return ConversionUtility::toJsString(cString, static_cast<uint16_t>(strlen(cString)));
}

v8::Handle<v8::Value> ConversionUtility::toJsString(const char *cString, uint16_t length)
{
    Nan::EscapableHandleScope scope;
    auto name = static_cast<char*>(malloc(length + 1));
	assert(name != nullptr);

    memset(name, 0, length + 1); // Zero terminate the name
    memcpy(name, cString, length);

    v8::Local<v8::String> _name = Nan::New(name).ToLocalChecked();

    free(name);

    return scope.Escape(_name);
}

v8::Handle<v8::Value> ConversionUtility::toJsString(uint8_t *cString, uint16_t length)
{
    return ConversionUtility::toJsString(reinterpret_cast<const char *>(cString), length);
}


v8::Handle<v8::Value> ConversionUtility::toJsString(std::string string)
{
    Nan::EscapableHandleScope scope;
    return scope.Escape(Nan::New<v8::String>(string).ToLocalChecked());
}

const char * ConversionUtility::valueToString(uint16_t value, name_map_t name_map, const char *defaultValue)
{
    name_map_it_t it = name_map.find(value);

    if (it == name_map.end())
    {
        return defaultValue;
    }

    return it->second;
}

v8::Handle<v8::Value> ConversionUtility::valueToJsString(uint16_t value, name_map_t name_map, v8::Handle<v8::Value> defaultValue)
{
    Nan::EscapableHandleScope scope;
    name_map_it_t it = name_map.find(value);

    if (it == name_map.end())
    {
        return defaultValue;
    }

    return scope.Escape(Nan::New<v8::String>(it->second).ToLocalChecked());
}

v8::Local<v8::Function> ConversionUtility::getCallbackFunction(v8::Local<v8::Object> js, const char *name)
{
    v8::Local<v8::Value> obj = Utility::Get(js, name);

    return ConversionUtility::getCallbackFunction(obj);
}

v8::Local<v8::Function> ConversionUtility::getCallbackFunction(v8::Local<v8::Value> js)
{
    Nan::EscapableHandleScope scope;
    if (!js->IsFunction())
    {
        throw std::string("function");
    }
    return scope.Escape(js.As<v8::Function>());
}

uint8_t ConversionUtility::extractHexHelper(char text)
{
    if (text >= '0' && text <= '9')
    {
        return text - '0';
    }

    if (text >= 'a' && text <= 'f')
    {
        return text - 'a' + 10;
    }

    if (text >= 'A' && text <= 'F')
    {
        return text - 'A' + 10;
    }

    return 0xFF;
}

uint8_t *ConversionUtility::extractHex(v8::Local<v8::Value> js)
{
    v8::Local<v8::String> jsString = v8::Local<v8::String>::Cast(js);
    auto length = jsString->Length();
    auto cString = static_cast<char *>(malloc(sizeof(char) * (length + 1)));
    memset(cString, 0, length + 1);

    jsString->WriteUtf8(cString, length);

    auto size = (length / 2);

    auto retArray = static_cast<uint8_t *>(malloc(sizeof(uint8_t) * size));
    memset(retArray, 0, size);

    for (auto i = 0, j = size - 1; i < length; i += 2, j--)
    {
        auto first = extractHexHelper(cString[i]);
        auto second = extractHexHelper(cString[i + 1]);

        if (first == 0xFF || second == 0xFF)
        {
            continue;
        }

        retArray[j] = (first << 4) + second;
    }

    return retArray;
}

v8::Handle<v8::Value> ConversionUtility::encodeHex(const char *text, int length)
{
    std::ostringstream encoded;
    encoded.flags(std::ios::uppercase);
    encoded.width(2);
    encoded.fill('0');

    for (auto i = length - 1; i >= 0; --i)
    {
        encoded << std::hex << (static_cast<int>(text[i]) & 0xFF);
    }

    return ConversionUtility::toJsString(encoded.str());
}

v8::Local<v8::Value> Utility::Get(v8::Local<v8::Object> jsobj, const char *name)
{
    Nan::EscapableHandleScope scope;
    return scope.Escape(Nan::Get(jsobj, Nan::New(name).ToLocalChecked()).ToLocalChecked());
}

v8::Local<v8::Value> Utility::Get(v8::Local<v8::Object> jsobj, const int index)
{
    Nan::EscapableHandleScope scope;
    return scope.Escape(Nan::Get(jsobj, index).ToLocalChecked());
}

void Utility::SetMethod(v8::Handle<v8::Object> target, const char *exportName, Nan::FunctionCallback function)
{
    Utility::Set(target,
        exportName,
        Nan::GetFunction(Nan::New<v8::FunctionTemplate>(function)).ToLocalChecked());
}

bool Utility::Set(v8::Handle<v8::Object> target, const char *name, int32_t value)
{
    return Utility::Set(target, name, ConversionUtility::toJsNumber(value));
}

bool Utility::Set(v8::Handle<v8::Object> target, const char *name, uint32_t value)
{
    return Utility::Set(target, name, ConversionUtility::toJsNumber(value));
}

bool Utility::Set(v8::Handle<v8::Object> target, const char *name, int16_t value)
{
    return Utility::Set(target, name, ConversionUtility::toJsNumber(value));
}

bool Utility::Set(v8::Handle<v8::Object> target, const char *name, uint16_t value)
{
    return Utility::Set(target, name, ConversionUtility::toJsNumber(value));
}

bool Utility::Set(v8::Handle<v8::Object> target, const char *name, int8_t value)
{
    return Utility::Set(target, name, ConversionUtility::toJsNumber(value));
}

bool Utility::Set(v8::Handle<v8::Object> target, const char *name, uint8_t value)
{
    return Utility::Set(target, name, ConversionUtility::toJsNumber(value));
}

bool Utility::Set(v8::Handle<v8::Object> target, const char *name, bool value)
{
    return Utility::Set(target, name, ConversionUtility::toJsBool(value));
}

bool Utility::Set(v8::Handle<v8::Object> target, const char *name, double value)
{
    return Utility::Set(target, name, ConversionUtility::toJsNumber(value));
}

bool Utility::Set(v8::Handle<v8::Object> target, const char *name, const char *value)
{
    return Utility::Set(target, name, ConversionUtility::toJsString(value));
}

bool Utility::Set(v8::Handle<v8::Object> target, const char *name, std::string value)
{
    return Utility::Set(target, name, ConversionUtility::toJsString(value));
}

bool Utility::Set(v8::Handle<v8::Object> target, const char *name, v8::Local<v8::Value> value)
{
    return Nan::Set(target, Nan::New(name).ToLocalChecked(), value).FromMaybe(false);
}

bool Utility::Has(v8::Handle<v8::Object> target, const char *name)
{
    return target->Has(Nan::New(name).ToLocalChecked());
}

void Utility::SetReturnValue(Nan::NAN_METHOD_ARGS_TYPE info, v8::Local<v8::Object> value)
{
    info.GetReturnValue().Set(value);
}

bool Utility::IsObject(v8::Local<v8::Object> jsobj, const char *name)
{
    return Utility::Get(jsobj, name)->IsObject();
}

bool Utility::IsNull(v8::Local<v8::Object> jsobj, const char *name)
{
    return Utility::Get(jsobj, name)->IsNull();
}

bool Utility::IsNull(v8::Local<v8::Object> jsobj)
{
    if (Utility::Has(jsobj, "special_hack_null_object"))
    {
        return true;
    }
    if (!jsobj->IsObject())
    {
        return true;
    }
    return jsobj->IsNull();
}

bool Utility::IsBetween(const uint8_t value, const uint8_t min, const uint8_t max)
{
    if (value < min || value > max)
    {
        return false;
    }

    return true;
}

bool Utility::EnsureAsciiNumbers(uint8_t *value, const int length)
{
    for (int i = 0; i < length; ++i)
    {
        if (IsBetween(value[i], 0, 9))
        {
            value[i] = value[i] + '0';
        }
        else if (!IsBetween(value[i], '0', '9'))
        {
            return false;
        }
    }

    return true;
}

v8::Local<v8::Value> ErrorMessage::getErrorMessage(const int errorCode, const std::string customMessage)
{
    Nan::EscapableHandleScope scope;

    switch (errorCode)
    {
        case NRF_SUCCESS:
            return scope.Escape(Nan::Undefined());

        case NRF_ERROR_SVC_HANDLER_MISSING:
        case NRF_ERROR_SOFTDEVICE_NOT_ENABLED:
        case NRF_ERROR_INTERNAL:
        case NRF_ERROR_NO_MEM:
        case NRF_ERROR_NOT_FOUND:
        case NRF_ERROR_NOT_SUPPORTED:
        case NRF_ERROR_INVALID_PARAM:
        case NRF_ERROR_INVALID_STATE:
        case NRF_ERROR_INVALID_LENGTH:
        case NRF_ERROR_INVALID_FLAGS:
        case NRF_ERROR_INVALID_DATA:
        case NRF_ERROR_DATA_SIZE:
        case NRF_ERROR_TIMEOUT:
        case NRF_ERROR_NULL:
        case NRF_ERROR_FORBIDDEN:
        case NRF_ERROR_INVALID_ADDR:
        case NRF_ERROR_BUSY:
        case NRF_ERROR_CONN_COUNT:
        case NRF_ERROR_RESOURCES:
        default:
        {
            std::ostringstream errorStringStream;
            errorStringStream << "Error occured when " << customMessage << ". "
                << "Errorcode: " << ConversionUtility::valueToString(errorCode, error_message_name_map) << " (0x" << std::hex << errorCode << ")" << std::endl;

            v8::Local<v8::Value> error = Nan::Error(ConversionUtility::toJsString(errorStringStream.str())->ToString());
            v8::Local<v8::Object> errorObject = error.As<v8::Object>();

            Utility::Set(errorObject, "errno", errorCode);
            Utility::Set(errorObject, "errcode", ConversionUtility::valueToString(errorCode, error_message_name_map));
            Utility::Set(errorObject, "erroperation", ConversionUtility::toJsString(customMessage));
            Utility::Set(errorObject, "errmsg", ConversionUtility::toJsString(errorStringStream.str()));

            return scope.Escape(error);
        }
    }
}


v8::Local<v8::Value> StatusMessage::getStatus(const int status, const std::string message, const std::string timestamp)
{
    Nan::EscapableHandleScope scope;

    v8::Local<v8::Object> obj = Nan::New<v8::Object>();

    Utility::Set(obj, "id", ConversionUtility::toJsNumber(status));
    Utility::Set(obj, "name", ConversionUtility::valueToJsString(status, sd_rpc_app_status_map));
    Utility::Set(obj, "message", ConversionUtility::toJsString(message));
    Utility::Set(obj, "time", ConversionUtility::toJsString(timestamp));

    return scope.Escape(obj);
}

v8::Local<v8::String> ErrorMessage::getTypeErrorMessage(const int argumentNumber, const std::string message)
{
    std::ostringstream stream;

    switch (argumentNumber)
    {
        case 0:
            stream << "First";
            break;
        case 1:
            stream << "Second";
            break;
        case 2:
            stream << "Third";
            break;
        case 3:
            stream << "Fourth";
            break;
        case 4:
            stream << "Fifth";
            break;
        case 5:
            stream << "Sixth";
            break;
        case 6:
            stream << "Seventh";
            break;
        default:
            stream << "Unknown";
            break;
    }

    stream << " argument must be a " << message;

    return ConversionUtility::toJsString(stream.str())->ToString();
}

v8::Local<v8::String> ErrorMessage::getStructErrorMessage(const std::string name, const std::string message)
{
    std::ostringstream stream;

    stream << "Property: " << name << " Message: " << message;

    return ConversionUtility::toJsString(stream.str())->ToString();
}

v8::Local<v8::Value> HciStatus::getHciStatus(int statusCode)
{
    Nan::EscapableHandleScope scope;
    return scope.Escape(Nan::New<v8::String>(ConversionUtility::valueToString(statusCode, hci_status_map)).ToLocalChecked());
}
