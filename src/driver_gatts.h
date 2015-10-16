#ifndef DRIVER_GATTS_H
#define DRIVER_GATTS_H

#include "common.h"
#include "ble_gatts.h"

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

class GattxHVXParams : public BleToJs<ble_gatts_hvx_params_t>
{
public:
    GattxHVXParams(ble_gatts_hvx_params_t *hvx_params) : BleToJs<ble_gatts_hvx_params_t>(hvx_params) {}
    GattxHVXParams(v8::Local<v8::Object> js) : BleToJs<ble_gatts_hvx_params_t>(js) {}
    ble_gatts_hvx_params_t *ToNative();
};

template<typename EventType>
class BleDriverGattcEvent : public BleDriverEvent<EventType>
{
private:
    BleDriverGattcEvent() {}

public:
    BleDriverGattcEvent(uint16_t evt_id, std::string timestamp, uint16_t conn_handle, EventType *evt)
        : BleDriverEvent<EventType>(evt_id, timestamp, conn_handle, evt)
    {
    }

    virtual void ToJs(v8::Local<v8::Object> obj)
    {
        BleDriverEvent<EventType>::ToJs(obj);
    }

    virtual v8::Local<v8::Object> ToJs() = 0;
    virtual EventType *ToNative() { return new EventType(); }

    char *getEventName() { return gattc_event_name_map[this->evt_id]; }
};

class GattsWriteEvent : BleDriverGattcEvent<ble_gatts_evt_write_t>
{
public:
    GattsWriteEvent(std::string timestamp, uint16_t conn_handle, ble_gatts_evt_write_t *evt)
        : BleDriverGattcEvent<ble_gatts_evt_write_t>(BLE_GATTC_EVT_PRIM_SRVC_DISC_RSP, timestamp, conn_handle, evt) {}

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

struct GattsHVXBaton : public Baton {
public:
    BATON_CONSTRUCTOR(GattsHVXBaton);
    uint16_t conn_handle;
    ble_gatts_hvx_params_t *p_hvx_params;
};

METHOD_DEFINITIONS(AddService)
METHOD_DEFINITIONS(AddCharacteristic)
METHOD_DEFINITIONS(HVX)

extern "C" {
    void init_gatts(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target);
}

#endif