#ifndef DRIVER_GATT_H
#define DRIVER_GATT_H

#include "common.h"
#include "ble_gatt.h"

class GattCharProps : public BleToJs<ble_gatt_char_props_t>
{
public:
    GattCharProps(ble_gatt_char_props_t *gap_addr) : BleToJs<ble_gatt_char_props_t>(gap_addr) {}
    GattCharProps(v8::Local<v8::Object> js) : BleToJs<ble_gatt_char_props_t>(js) {}
    v8::Local<v8::Object> ToJs();
    ble_gatt_char_props_t *ToNative();
};

class GattCharExtProps : public BleToJs<ble_gatt_char_ext_props_t>
{
public:
    GattCharExtProps(ble_gatt_char_ext_props_t *gap_addr) : BleToJs<ble_gatt_char_ext_props_t>(gap_addr) {}
    GattCharExtProps(v8::Local<v8::Object> js) : BleToJs<ble_gatt_char_ext_props_t>(js) {}
    v8::Local<v8::Object> ToJs();
    ble_gatt_char_ext_props_t *ToNative();
};

extern "C" {
    void init_gatt(v8::Handle<v8::Object> target);
}

#endif
