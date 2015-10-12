#include <chrono>
#include <ctime>
#include <sstream>
#include <cassert>

#include "common.h"

static name_map_t error_message_name_map = {
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
    std::chrono::system_clock::time_point current_time = std::chrono::system_clock::now();
    time_t time = std::chrono::system_clock::to_time_t(current_time);
    std::chrono::milliseconds ms = std::chrono::duration_cast<std::chrono::milliseconds>(current_time.time_since_epoch());

    std::tm *ttm = gmtime(&time);

    char date_time_format[] = "%Y-%m-%dT%H:%M:%S";

    char time_str[20] = "";

    strftime(time_str, 20, date_time_format, ttm);

    std::string result(time_str);
    result.append(".");

    char millisecond_str[4];
    sprintf(millisecond_str, "%03s", std::to_string(ms.count() % 1000).c_str());
    result.append(millisecond_str);
    result.append("Z");

    return result;
}

uint16_t uint16_decode(const uint8_t *p_encoded_data)
{
        return ( (((uint16_t)((uint8_t *)p_encoded_data)[0])) |
                 (((uint16_t)((uint8_t *)p_encoded_data)[1]) << 8 ));
}

uint32_t uint32_decode(const uint8_t *p_encoded_data)
{
    return ((((uint32_t)((uint8_t *)p_encoded_data)[0]) << 0)  |
            (((uint32_t)((uint8_t *)p_encoded_data)[1]) << 8)  |
            (((uint32_t)((uint8_t *)p_encoded_data)[2]) << 16) |
            (((uint32_t)((uint8_t *)p_encoded_data)[3]) << 24));
}

uint16_t fromNameToValue(name_map_t names, char *name)
{
    std::map<uint16_t, char*>::const_iterator it;
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

uint32_t ConversionUtility::getNativeUint32(v8::Local<v8::Object>js, char *name)
{
    return ConvUtil<uint32_t>::getNativeUnsigned(js, name);
}

uint32_t ConversionUtility::getNativeUint32(v8::Local<v8::Value> js)
{
    return ConvUtil<uint32_t>::getNativeUnsigned(js->ToObject());
}

uint16_t ConversionUtility::getNativeUint16(v8::Local<v8::Object>js, char *name)
{
    return ConvUtil<uint16_t>::getNativeUnsigned(js, name);
}

uint16_t ConversionUtility::getNativeUint16(v8::Local<v8::Value> js)
{
    return ConvUtil<uint16_t>::getNativeUnsigned(js->ToObject());
}

uint8_t ConversionUtility::getNativeUint8(v8::Local<v8::Object>js, char *name)
{
    return ConvUtil<uint8_t>::getNativeUnsigned(js, name);
}

uint8_t ConversionUtility::getNativeUint8(v8::Local<v8::Value> js)
{
    return ConvUtil<uint8_t>::getNativeUnsigned(js->ToObject());
}

int32_t ConversionUtility::getNativeInt32(v8::Local<v8::Object>js, char *name)
{
    return ConvUtil<int32_t>::getNativeSigned(js, name);
}

int32_t ConversionUtility::getNativeInt32(v8::Local<v8::Value>js)
{
    return ConvUtil<int32_t>::getNativeSigned(js->ToObject());
}

int16_t ConversionUtility::getNativeInt16(v8::Local<v8::Object>js, char *name)
{
    return ConvUtil<int16_t>::getNativeSigned(js, name);
}

int16_t ConversionUtility::getNativeInt16(v8::Local<v8::Value>js)
{
    return ConvUtil<int16_t>::getNativeSigned(js->ToObject());
}

int8_t ConversionUtility::getNativeInt8(v8::Local<v8::Object>js, char *name)
{
    return ConvUtil<int8_t>::getNativeSigned(js, name);
}

int8_t ConversionUtility::getNativeInt8(v8::Local<v8::Value>js)
{
    return ConvUtil<int8_t>::getNativeSigned(js->ToObject());
}

double ConversionUtility::getNativeDouble(v8::Local<v8::Object>js, char *name)
{
    return ConvUtil<double>::getNativeFloat(js, name);
}

double ConversionUtility::getNativeDouble(v8::Local<v8::Value>js)
{
    return ConvUtil<double>::getNativeFloat(js->ToObject());
}

uint8_t ConversionUtility::getNativeBool(v8::Local<v8::Object>js, char *name)
{
    return ConvUtil<uint8_t>::getNativeFloat(js, name);
}

uint8_t ConversionUtility::getNativeBool(v8::Local<v8::Value>js)
{
    return ConvUtil<uint8_t>::getNativeFloat(js->ToObject());
}

uint8_t *ConversionUtility::getNativePointerToUint8(v8::Local<v8::Object>js, char *name)
{
    v8::Local<v8::Array> jsarray = v8::Local<v8::Array>::Cast(Utility::Get(js, name));

    uint8_t *string = (uint8_t *)malloc(sizeof(uint8_t) * jsarray->Length());
    
	assert(string != NULL);

    for (uint32_t i = 0; i < jsarray->Length(); ++i)
    {
        string[i] = (uint8_t)jsarray->Get(Nan::New(i))->Uint32Value();
    }

    return string;
}

v8::Local<v8::Object> ConversionUtility::getJsObject(v8::Local<v8::Object>js, char *name)
{
    return Utility::Get(js, name)->ToObject();
}

uint16_t ConversionUtility::msecsToUnitsUint16(v8::Local<v8::Object>js, char *name, enum ConversionUtility::ConversionUnits unit)
{
    double msecs = getNativeDouble(js, name);
    return msecsToUnitsUint16(msecs, unit);
}

uint16_t ConversionUtility::msecsToUnitsUint16(double msecs, enum ConversionUtility::ConversionUnits unit)
{
    return (uint16_t)(msecs * 1000 / unit);
}

uint8_t ConversionUtility::msecsToUnitsUint8(v8::Local<v8::Object>js, char *name, enum ConversionUtility::ConversionUnits unit)
{
    double msecs = getNativeDouble(js, name);
    return msecsToUnitsUint8(msecs, unit);
}

uint8_t ConversionUtility::msecsToUnitsUint8(double msecs, enum ConversionUtility::ConversionUnits unit)
{
    return (uint8_t)(msecs * 1000 / unit);
}

v8::Handle<v8::Value> ConversionUtility::unitsToMsecs(uint16_t units, enum ConversionUtility::ConversionUnits unit)
{
    double _unit = units * unit / 1000.0;
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
    v8::Local<v8::Value> valueArray = Nan::NewBuffer((char *)nativeData, length).ToLocalChecked();

    return scope.Escape(valueArray);
}

v8::Handle<v8::Value> ConversionUtility::toJsString(char *cString)
{
    return ConversionUtility::toJsString(cString, strlen(cString));
}

v8::Handle<v8::Value> ConversionUtility::toJsString(char *cString, uint16_t length)
{
    Nan::EscapableHandleScope scope;
    char *name = (char*)malloc(length + 1);
	assert(name != NULL);

    memset(name, 0, length + 1); // Zero terminate the name
    memcpy(name, cString, length);

    v8::Local<v8::String> _name = Nan::New(name).ToLocalChecked();

    free(name);

    return scope.Escape(_name);
}

v8::Handle<v8::Value> ConversionUtility::toJsString(std::string string)
{
    Nan::EscapableHandleScope scope;
    return scope.Escape(Nan::New<v8::String>(string).ToLocalChecked());
}

char * ConversionUtility::valueToString(uint16_t value, name_map_t name_map, char *defaultValue)
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

v8::Local<v8::Value> Utility::Get(v8::Local<v8::Object> jsobj, char *name)
{
    Nan::EscapableHandleScope scope;
    return scope.Escape(Nan::Get(jsobj, Nan::New(name).ToLocalChecked()).ToLocalChecked());
}

void Utility::SetMethod(v8::Handle<v8::Object> target, char *exportName, Nan::FunctionCallback function)
{
    Utility::Set(target,
        exportName,
        Nan::GetFunction(Nan::New<v8::FunctionTemplate>(function)).ToLocalChecked());
}

bool Utility::Set(v8::Handle<v8::Object> target, char *name, int32_t value)
{
    return Utility::Set(target, name, ConversionUtility::toJsNumber(value));
}

bool Utility::Set(v8::Handle<v8::Object> target, char *name, uint32_t value)
{
    return Utility::Set(target, name, ConversionUtility::toJsNumber(value));
}

bool Utility::Set(v8::Handle<v8::Object> target, char *name, int16_t value)
{
    return Utility::Set(target, name, ConversionUtility::toJsNumber(value));
}

bool Utility::Set(v8::Handle<v8::Object> target, char *name, uint16_t value)
{
    return Utility::Set(target, name, ConversionUtility::toJsNumber(value));
}

bool Utility::Set(v8::Handle<v8::Object> target, char *name, int8_t value)
{
    return Utility::Set(target, name, ConversionUtility::toJsNumber(value));
}

bool Utility::Set(v8::Handle<v8::Object> target, char *name, uint8_t value)
{
    return Utility::Set(target, name, ConversionUtility::toJsNumber(value));
}

bool Utility::Set(v8::Handle<v8::Object> target, char *name, bool value)
{
    return Utility::Set(target, name, ConversionUtility::toJsBool(value));
}

bool Utility::Set(v8::Handle<v8::Object> target, char *name, double value)
{
    return Utility::Set(target, name, ConversionUtility::toJsNumber(value));
}

bool Utility::Set(v8::Handle<v8::Object> target, char *name, char *value)
{
    return Utility::Set(target, name, ConversionUtility::toJsString(value));
}

bool Utility::Set(v8::Handle<v8::Object> target, char *name, std::string value)
{
    return Utility::Set(target, name, ConversionUtility::toJsString(value));
}

bool Utility::Set(v8::Handle<v8::Object> target, char *name, v8::Local<v8::Value> value)
{
    return Nan::Set(target, Nan::New(name).ToLocalChecked(), value).FromMaybe(false);
}

void Utility::SetReturnValue(Nan::NAN_METHOD_ARGS_TYPE info, v8::Local<v8::Object> value)
{
    info.GetReturnValue().Set(value);
}

v8::Local<v8::Value> ErrorMessage::getErrorMessage(int errorCode, char *customMessage)
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
        default:
        {
            std::ostringstream errorStringStream;
            errorStringStream << "Error occured when " << customMessage << ". "
                << "Errorcode: " << ConversionUtility::valueToString(errorCode, error_message_name_map) << " (" << errorCode << ")" << std::endl;

            return scope.Escape(v8::Exception::Error(Nan::New<v8::String>(errorStringStream.str()).ToLocalChecked()));
        }
    }
}

v8::Local<v8::Value> HciStatus::getHciStatus(int statusCode)
{
    Nan::EscapableHandleScope scope;
    return scope.Escape(Nan::New<v8::String>(ConversionUtility::valueToString(statusCode, hci_status_map)).ToLocalChecked());
}
