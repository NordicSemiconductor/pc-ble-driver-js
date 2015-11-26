#ifndef DRIVER_GATTS_H
#define DRIVER_GATTS_H

#include "common.h"
#include "ble_gatts.h"

static name_map_t gatts_event_name_map = {
    NAME_MAP_ENTRY(BLE_GATTS_EVT_WRITE),
    NAME_MAP_ENTRY(BLE_GATTS_EVT_RW_AUTHORIZE_REQUEST),
    NAME_MAP_ENTRY(BLE_GATTS_EVT_SYS_ATTR_MISSING),
    NAME_MAP_ENTRY(BLE_GATTS_EVT_HVC),
    NAME_MAP_ENTRY(BLE_GATTS_EVT_SC_CONFIRM),
    NAME_MAP_ENTRY(BLE_GATTS_EVT_TIMEOUT),
};

class GattsAttributeMetadata : public BleToJs<ble_gatts_attr_md_t>
{
public:
    GattsAttributeMetadata(ble_gatts_attr_md_t *attributeMetadata) : BleToJs<ble_gatts_attr_md_t>(attributeMetadata) {}
    GattsAttributeMetadata(v8::Local<v8::Object> js) : BleToJs<ble_gatts_attr_md_t>(js) {}
    ble_gatts_attr_md_t *ToNative();
};

class GattsCharacteristicPresentationFormat : public BleToJs<ble_gatts_char_pf_t>
{
public:
    GattsCharacteristicPresentationFormat(ble_gatts_char_pf_t *presentationformat) : BleToJs<ble_gatts_char_pf_t>(presentationformat) {}
    GattsCharacteristicPresentationFormat(v8::Local<v8::Object> js) : BleToJs<ble_gatts_char_pf_t>(js) {}
    ble_gatts_char_pf_t *ToNative();
};

class GattsCharacteristicMetadata : public BleToJs<ble_gatts_char_md_t>
{
public:
    GattsCharacteristicMetadata(ble_gatts_char_md_t *metadata) : BleToJs<ble_gatts_char_md_t>(metadata) {}
    GattsCharacteristicMetadata(v8::Local<v8::Object> js) : BleToJs<ble_gatts_char_md_t>(js) {}
    ble_gatts_char_md_t *ToNative();
};

class GattsAttribute : public BleToJs<ble_gatts_attr_t>
{
public:
    GattsAttribute(ble_gatts_attr_t *attribute) : BleToJs<ble_gatts_attr_t>(attribute) {}
    GattsAttribute(v8::Local<v8::Object> js) : BleToJs<ble_gatts_attr_t>(js) {}
    ble_gatts_attr_t *ToNative();
};

class GattsCharacteristicDefinitionHandles : public BleToJs<ble_gatts_char_handles_t>
{
public:
    GattsCharacteristicDefinitionHandles(ble_gatts_char_handles_t *attribute) : BleToJs<ble_gatts_char_handles_t>(attribute) {}
    GattsCharacteristicDefinitionHandles(v8::Local<v8::Object> js) : BleToJs<ble_gatts_char_handles_t>(js) {}
    v8::Local<v8::Object> ToJs();
};

class GattsHVXParams : public BleToJs<ble_gatts_hvx_params_t>
{
public:
    GattsHVXParams(ble_gatts_hvx_params_t *hvx_params) : BleToJs<ble_gatts_hvx_params_t>(hvx_params) {}
    GattsHVXParams(v8::Local<v8::Object> js) : BleToJs<ble_gatts_hvx_params_t>(js) {}
    ble_gatts_hvx_params_t *ToNative();
};

class GattsValue : public BleToJs<ble_gatts_value_t>
{
public:
    GattsValue(ble_gatts_value_t *value) : BleToJs<ble_gatts_value_t>(value) {}
    GattsValue(v8::Local<v8::Object> js) : BleToJs<ble_gatts_value_t>(js) {}
    v8::Local<v8::Object> ToJs();
    ble_gatts_value_t *ToNative();
};

class GattsAttributeContext : public BleToJs<ble_gatts_attr_context_t>
{
public:
    GattsAttributeContext(ble_gatts_attr_context_t *attributeContext) : BleToJs<ble_gatts_attr_context_t>(attributeContext) {}
    GattsAttributeContext(v8::Local<v8::Object> js) : BleToJs<ble_gatts_attr_context_t>(js) {}
    v8::Local<v8::Object> ToJs();
};

class GattRWAuthorizeReplyParams : public BleToJs<ble_gatts_rw_authorize_reply_params_t>
{
public:
    GattRWAuthorizeReplyParams(ble_gatts_rw_authorize_reply_params_t *hvx_params) : BleToJs<ble_gatts_rw_authorize_reply_params_t>(hvx_params) {}
    GattRWAuthorizeReplyParams(v8::Local<v8::Object> js) : BleToJs<ble_gatts_rw_authorize_reply_params_t>(js) {}
    ble_gatts_rw_authorize_reply_params_t *ToNative();
};

class GattsReadAuthorizeParameters : public BleToJs<ble_gatts_read_authorize_params_t>
{
public:
    GattsReadAuthorizeParameters(ble_gatts_read_authorize_params_t *readAuthorizeParams) : BleToJs<ble_gatts_read_authorize_params_t>(readAuthorizeParams) {}
    GattsReadAuthorizeParameters(v8::Local<v8::Object> js) : BleToJs<ble_gatts_read_authorize_params_t>(js) {}
    v8::Local<v8::Object> ToJs();
    ble_gatts_read_authorize_params_t *ToNative();
};

class GattsWriteAuthorizeParameters : public BleToJs<ble_gatts_write_authorize_params_t>
{
public:
    GattsWriteAuthorizeParameters(ble_gatts_write_authorize_params_t *writeAuthorizeParams) : BleToJs<ble_gatts_write_authorize_params_t>(writeAuthorizeParams) {}
    GattsWriteAuthorizeParameters(v8::Local<v8::Object> js) : BleToJs<ble_gatts_write_authorize_params_t>(js) {}
    v8::Local<v8::Object> ToJs();
    ble_gatts_write_authorize_params_t *ToNative();
};

template<typename EventType>
class BleDriverGattsEvent : public BleDriverEvent<EventType>
{
private:
    BleDriverGattsEvent() {}

public:
    BleDriverGattsEvent(uint16_t evt_id, std::string timestamp, uint16_t conn_handle, EventType *evt)
        : BleDriverEvent<EventType>(evt_id, timestamp, conn_handle, evt)
    {
    }

    virtual void ToJs(v8::Local<v8::Object> obj)
    {
        BleDriverEvent<EventType>::ToJs(obj);
    }

    virtual v8::Local<v8::Object> ToJs() = 0;
    virtual EventType *ToNative() { return new EventType(); }

    const char *getEventName() { return ConversionUtility::valueToString(this->evt_id, gatts_event_name_map, "Unknown Gatts Event"); }
};

class GattsWriteEvent : BleDriverGattsEvent<ble_gatts_evt_write_t>
{
public:
    GattsWriteEvent(std::string timestamp, uint16_t conn_handle, ble_gatts_evt_write_t *evt)
        : BleDriverGattsEvent<ble_gatts_evt_write_t>(BLE_GATTS_EVT_WRITE, timestamp, conn_handle, evt) {}

    v8::Local<v8::Object> ToJs();
};

class GattsReadEvent : public BleToJs<ble_gatts_evt_read_t>
{
public:
    GattsReadEvent(ble_gatts_evt_read_t *read) : BleToJs<ble_gatts_evt_read_t>(read) {}
    GattsReadEvent(v8::Local<v8::Object> js) : BleToJs<ble_gatts_evt_read_t>(js) {}
    v8::Local<v8::Object> ToJs();
};

class GattsRWAuthorizeRequestEvent : BleDriverGattsEvent<ble_gatts_evt_rw_authorize_request_t>
{
public:
    GattsRWAuthorizeRequestEvent(std::string timestamp, uint16_t conn_handle, ble_gatts_evt_rw_authorize_request_t *evt)
        : BleDriverGattsEvent<ble_gatts_evt_rw_authorize_request_t>(BLE_GATTS_EVT_RW_AUTHORIZE_REQUEST, timestamp, conn_handle, evt) {}

    v8::Local<v8::Object> ToJs();
};

class GattsSystemAttributeMissingEvent : BleDriverGattsEvent<ble_gatts_evt_sys_attr_missing_t>
{
public:
    GattsSystemAttributeMissingEvent(std::string timestamp, uint16_t conn_handle, ble_gatts_evt_sys_attr_missing_t *evt)
        : BleDriverGattsEvent<ble_gatts_evt_sys_attr_missing_t>(BLE_GATTS_EVT_SYS_ATTR_MISSING, timestamp, conn_handle, evt) {}

    v8::Local<v8::Object> ToJs();
};

class GattsHVCEvent : BleDriverGattsEvent<ble_gatts_evt_hvc_t>
{
public:
    GattsHVCEvent(std::string timestamp, uint16_t conn_handle, ble_gatts_evt_hvc_t *evt)
        : BleDriverGattsEvent<ble_gatts_evt_hvc_t>(BLE_GATTS_EVT_HVC, timestamp, conn_handle, evt) {}

    v8::Local<v8::Object> ToJs();
};

class GattsSCConfirmEvent : BleDriverGattsEvent<ble_gatts_evt_timeout_t>
{
public:
    GattsSCConfirmEvent(std::string timestamp, uint16_t conn_handle, ble_gatts_evt_timeout_t *evt)
        : BleDriverGattsEvent<ble_gatts_evt_timeout_t>(BLE_GATTS_EVT_SC_CONFIRM, timestamp, conn_handle, evt) {}

    v8::Local<v8::Object> ToJs();
};

class GattsTimeoutEvent : BleDriverGattsEvent<ble_gatts_evt_timeout_t>
{
public:
    GattsTimeoutEvent(std::string timestamp, uint16_t conn_handle, ble_gatts_evt_timeout_t *evt)
        : BleDriverGattsEvent<ble_gatts_evt_timeout_t>(BLE_GATTS_EVT_TIMEOUT, timestamp, conn_handle, evt) {}

    v8::Local<v8::Object> ToJs();
};

struct GattsAddServiceBaton : public Baton {
public:
    BATON_CONSTRUCTOR(GattsAddServiceBaton);
    uint8_t type;
    ble_uuid_t *p_uuid;
    uint16_t p_handle;
};

struct GattsAddCharacteristicBaton : public Baton {
public:
    BATON_CONSTRUCTOR(GattsAddCharacteristicBaton);
    uint16_t service_handle;
    ble_gatts_char_md_t *p_char_md;
    ble_gatts_attr_t *p_attr_char_value;
    ble_gatts_char_handles_t *p_handles;
};

struct GattsAddDescriptorBaton : public Baton {
public:
    BATON_CONSTRUCTOR(GattsAddDescriptorBaton);
    uint16_t char_handle;
    ble_gatts_attr_t *p_attr;
    uint16_t p_handle;
};

struct GattsHVXBaton : public Baton {
public:
    BATON_CONSTRUCTOR(GattsHVXBaton);
    uint16_t conn_handle;
    ble_gatts_hvx_params_t *p_hvx_params;
};

struct GattsSystemAttributeSetBaton : public Baton {
public:
    BATON_CONSTRUCTOR(GattsSystemAttributeSetBaton);
    uint16_t conn_handle;
    uint8_t *p_sys_attr_data;
    uint16_t len;
    uint32_t flags;
};

struct GattsValueSetBaton : public Baton {
public:
    BATON_CONSTRUCTOR(GattsValueSetBaton);
    uint16_t conn_handle;
    uint16_t handle;
    ble_gatts_value_t *p_value;
};

struct GattsValueGetBaton : public Baton {
public:
    BATON_CONSTRUCTOR(GattsValueGetBaton);
    uint16_t conn_handle;
    uint16_t handle;
    ble_gatts_value_t *p_value;
};

struct GattsRWAuthorizeReplyBaton : public Baton {
public:
    BATON_CONSTRUCTOR(GattsRWAuthorizeReplyBaton);
    uint16_t conn_handle;
    ble_gatts_rw_authorize_reply_params_t *p_rw_authorize_reply_params;
};

METHOD_DEFINITIONS(AddService)
METHOD_DEFINITIONS(AddCharacteristic)
METHOD_DEFINITIONS(AddDescriptor)
METHOD_DEFINITIONS(HVX)
METHOD_DEFINITIONS(SystemAttributeSet)
METHOD_DEFINITIONS(ValueSet)
METHOD_DEFINITIONS(ValueGet)
METHOD_DEFINITIONS(RWAuthorizeReply)

extern "C" {
    void init_gatts(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target);
}

#endif