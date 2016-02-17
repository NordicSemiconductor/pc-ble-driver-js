/* Copyright (c) 2016 Nordic Semiconductor. All Rights Reserved.
 *
 * The information contained herein is property of Nordic Semiconductor ASA.
 * Terms and conditions of usage are described in detail in NORDIC
 * SEMICONDUCTOR STANDARD SOFTWARE LICENSE AGREEMENT.
 *
 * Licensees are granted free, non-transferable use of the information. NO
 * WARRANTY of ANY KIND is provided. This heading must NOT be removed from
 * the file.
 *
 */

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
    void init_gatt(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target);
}

#endif
