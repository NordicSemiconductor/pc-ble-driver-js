#ifndef BLE_DRIVER_JS_DRIVER_H
#define BLE_DRIVER_JS_DRIVER_H

#define LOG_ENTRY_STRING_SIZE 1024
#define PATH_STRING_SIZE 1024

#include <string>
#include <sd_rpc.h>
#include "common.h"

// Async methods
METHOD_DEFINITIONS(Open);
METHOD_DEFINITIONS(GetVersion);

// Synchronous methods
NAN_METHOD(Close);
NAN_METHOD(GetStats);

NAN_INLINE sd_rpc_parity_t ToParityEnum(const v8::Handle<v8::String>& str);
NAN_INLINE sd_rpc_flow_control_t ToFlowControlEnum(const v8::Handle<v8::String>& str);
NAN_INLINE sd_rpc_log_severity_t ToLogSeverityEnum(const v8::Handle<v8::String>& str);

class Version : public BleToJs<ble_version_t>
{
public:
    Version(ble_version_t *version) : BleToJs<ble_version_t>(version) {}
    Version(v8::Local<v8::Object> js) : BleToJs<ble_version_t>(js) {}
    v8::Local<v8::Object> ToJs();
    ble_version_t *ToNative();
};

class BleUUID : public BleToJs<ble_uuid_t>
{
public:
    BleUUID(ble_uuid_t *uuid) : BleToJs<ble_uuid_t>(uuid) {}
    BleUUID(v8::Local<v8::Object> js) : BleToJs<ble_uuid_t>(js) {}
    v8::Local<v8::Object> ToJs();
    ble_uuid_t *ToNative();
};

class BleUUID128 : public BleToJs<ble_uuid128_t>
{
public:
    BleUUID128(ble_uuid128_t *uuid) : BleToJs<ble_uuid128_t>(uuid) {}
    BleUUID128(v8::Local<v8::Object> js) : BleToJs<ble_uuid128_t>(js) {}
    v8::Local<v8::Object> ToJs();
    ble_uuid128_t *ToNative();
};

///// Start Batons ////////////////////////////////////////

struct OpenBaton : public Baton {
public:
    BATON_CONSTRUCTOR(OpenBaton)
    char path[PATH_STRING_SIZE];
    Nan::Callback *event_callback; // Callback that is called for every event that is received from the SoftDevice
    Nan::Callback *log_callback;   // Callback that is called for every log entry that is received from the SoftDevice

    sd_rpc_log_severity_t log_level;
    sd_rpc_log_handler_t log_handler;
    sd_rpc_evt_handler_t event_handler;

    uint32_t baud_rate;
    sd_rpc_flow_control_t flow_control;
    sd_rpc_parity_t parity;

    uint32_t evt_interval; // The interval in ms that the event queue is sent to NodeJS
};

struct GetVersionBaton : public Baton {
public:
    BATON_CONSTRUCTOR(GetVersionBaton);
    ble_version_t *version;

};

///// Start Batons ////////////////////////////////////////

struct LogEntry {
public:
    sd_rpc_log_severity_t severity;
    char *message;
};

struct EventEntry {
public:
    ble_evt_t *event;
    std::string timestamp;
};

#endif //BLE_DRIVER_JS_DRIVER_H
