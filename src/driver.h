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

    Adapter *mainObject;
};

struct CloseBaton : public Baton {
public:
    BATON_CONSTRUCTOR(CloseBaton)
    Adapter *mainObject;
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
