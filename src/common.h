#ifndef COMMON_H
#define COMMON_H

#include <nan.h>
#include <map>
#include <mutex>
#include <string>
#include "ble.h"

#define NAME_MAP_ENTRY(EXP) { EXP, ""#EXP"" }
#define ERROR_STRING_SIZE 1024
#define BATON_CONSTRUCTOR(BatonType) BatonType(v8::Local<v8::Function> callback) : Baton(callback) {}
#define BATON_DESTRUCTOR(BatonType) ~BatonType()

#define METHOD_DEFINITIONS(MainName) \
    NAN_METHOD(MainName); \
    void MainName(uv_work_t *req); \
    void After##MainName(uv_work_t *req);

// Typedef of name to string with enum name, covers most cases
typedef std::map<uint16_t, char*> name_map_t;
typedef std::map<uint16_t, char*>::iterator name_map_it_t;

// Mutex used to assure that only one call is done to the BLE Driver API at a time.
// The BLE Driver API is not thread safe.
static std::mutex ble_driver_call_mutex;

class ConversionUtility;


template<typename NativeType>
class BleToJs
{
protected:
    v8::Local<v8::Object> jsobj;
    NativeType *native;
public:
    BleToJs(v8::Local<v8::Object> js) : jsobj(js) {}
    BleToJs(NativeType *native) : native(native) {}

    virtual v8::Local<v8::Object> ToJs() { /*TODO: ASSERT*/ return NanNew<v8::Object>(); }
    virtual NativeType *ToNative() { /*TODO: ASSERT*/ return new NativeType(); }

    operator NativeType*() { return ToNative(); }
    operator NativeType() { return *(ToNative()); }
    operator v8::Handle<v8::Value>() { return ToJs(); }
};

template<typename EventType>
class BleDriverEvent : public BleToJs<EventType>
{
private:
    BleDriverEvent() {}

protected:
    uint16_t evt_id;
    std::string timestamp;
    uint16_t conn_handle;
    EventType *evt;

public:
    BleDriverEvent(uint16_t evt_id, std::string timestamp, uint16_t conn_handle, EventType *evt)
        : BleToJs<EventType>(0),
        evt_id(evt_id),
        timestamp(timestamp),
        conn_handle(conn_handle),
        evt(evt)
    {
    }

    virtual void ToJs(v8::Local<v8::Object> obj)
    {
        obj->Set(NanNew("id"), NanNew(this->evt_id));
        obj->Set(NanNew("name"), NanNew(getEventName()));
        obj->Set(NanNew("time"), NanNew(timestamp));
        obj->Set(NanNew("conn_handle"), NanNew(this->conn_handle));
    }

    virtual v8::Local<v8::Object> ToJs() = 0;
    virtual EventType *ToNative() = 0;
    virtual char *getEventName() = 0;
};

struct Baton {
public:
    Baton(v8::Local<v8::Function> cb) {
        req = new uv_work_t();
        callback = new NanCallback(cb);
        req->data = (void*)this;
    }

    ~Baton()
    {
        delete callback;
    }

    uv_work_t *req;
    NanCallback *callback;

    int result;
    char errorString[ERROR_STRING_SIZE];
};

const std::string getCurrentTimeInMilliseconds();

uint16_t uint16_decode(const uint8_t *p_encoded_data);
uint32_t uint32_decode(const uint8_t *p_encoded_data);

uint16_t fromNameToValue(name_map_t names, char *name);

template<typename NativeType>
class ConvUtil
{
public:
    static NativeType getNativeUnsigned(v8::Local<v8::Value> js)
    {
        return (NativeType)js->ToUint32()->Uint32Value();
    }

    static NativeType getNativeSigned(v8::Local<v8::Value> js)
    {
        return (NativeType)js->ToInt32()->Int32Value();
    }

    static NativeType getNativeFloat(v8::Local<v8::Value> js)
    {
        return (NativeType)js->ToNumber()->NumberValue();
    }

    static NativeType getNativeBool(v8::Local<v8::Value> js)
    {
        return (NativeType)js->ToBoolean()->BooleanValue() ? 1 : 0;
    }

    static NativeType getNativeUnsigned(v8::Local<v8::Object> js, char *name)
    {
        return getNativeUnsigned(js->Get(NanNew(name)));
    }

    static NativeType getNativeSigned(v8::Local<v8::Object> js, char *name)
    {
        return getNativeSigned(js->Get(NanNew(name)));
    }

    static NativeType getNativeFloat(v8::Local<v8::Object> js, char *name)
    {
        return getNativeFloat(js->Get(NanNew(name)));
    }

    static NativeType getNativeBool(v8::Local<v8::Object> js, char *name)
    {
        return getNativeBool(js->Get(NanNew(name)));
    }
};

class ConversionUtility
{
public:
    enum ConversionUnits {
        ConversionUnit625ms = 625,
        ConversionUnit1250ms = 1250,
        ConversionUnit10000ms = 10000,
        ConversionUnit10s = ConversionUnit10000ms
    };

    static uint32_t     getNativeUint32(v8::Local<v8::Object>js, char *name);
    static uint32_t     getNativeUint32(v8::Local<v8::Value> js);
    static uint16_t     getNativeUint16(v8::Local<v8::Object>js, char *name);
    static uint16_t     getNativeUint16(v8::Local<v8::Value> js);
    static uint8_t      getNativeUint8(v8::Local<v8::Object>js, char *name);
    static uint8_t      getNativeUint8(v8::Local<v8::Value> js);
    static int32_t      getNativeInt32(v8::Local<v8::Object>js, char *name);
    static int32_t      getNativeInt32(v8::Local<v8::Value> js);
    static int16_t      getNativeInt16(v8::Local<v8::Object>js, char *name);
    static int16_t      getNativeInt16(v8::Local<v8::Value> js);
    static int8_t       getNativeInt8(v8::Local<v8::Object>js, char *name);
    static int8_t       getNativeInt8(v8::Local<v8::Value> js);
    static double       getNativeDouble(v8::Local<v8::Object>js, char *name);
    static double       getNativeDouble(v8::Local<v8::Value> js);
    static uint8_t      getNativeBool(v8::Local<v8::Object>js, char *name);
    static uint8_t      getNativeBool(v8::Local<v8::Value>js);
    static uint8_t *    getNativePointerToUint8(v8::Local<v8::Object>js, char *name);
    static v8::Local<v8::Object> getJsObject(v8::Local<v8::Object>js, char *name);

    static uint16_t msecsToUnitsUint16(v8::Local<v8::Object>js, char *name, enum ConversionUnits unit);
    static uint16_t msecsToUnitsUint16(uint16_t msecs, enum ConversionUnits unit);
    static uint8_t  msecsToUnitsUint8(v8::Local<v8::Object>js, char *name, enum ConversionUnits unit);
    static uint8_t  msecsToUnitsUint8(uint8_t msecs, enum ConversionUnits unit);
    static v8::Handle<v8::Value> unitsToMsecs(uint16_t units, enum ConversionUnits unit);
    
    static v8::Handle<v8::Value> toJsNumber(int32_t nativeValue);
    static v8::Handle<v8::Value> toJsNumber(uint32_t nativeValue);
    static v8::Handle<v8::Value> toJsNumber(uint16_t nativeValue);
    static v8::Handle<v8::Value> toJsNumber(uint8_t nativeValue);
    static v8::Handle<v8::Value> toJsNumber(double nativeValue);
    static v8::Handle<v8::Value> toJsBool(uint8_t nativeValue);
    static v8::Handle<v8::Value> toJsValueArray(uint8_t *nativeValue, uint16_t length);
    static v8::Handle<v8::Value> toJsString(char *cString);
    static v8::Handle<v8::Value> toJsString(char *cString, uint16_t length);
    static char *                valueToString(uint16_t value, name_map_t name_map, char *defaultValue = "Unknown value");
    static v8::Handle<v8::Value> valueToJsString(uint16_t, name_map_t name_map, v8::Handle<v8::Value> defaultValue = NanNew<v8::String>("Unknown value"));
};

class ErrorMessage
{
public:
    static v8::Local<v8::Value> getErrorMessage(int errorCode, char *customMessage);
};

#endif
