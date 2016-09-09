/*
 * Copyright (c) 2016 Nordic Semiconductor ASA
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 *   1. Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 *
 *   2. Redistributions in binary form must reproduce the above copyright notice, this
 *   list of conditions and the following disclaimer in the documentation and/or
 *   other materials provided with the distribution.
 *
 *   3. Neither the name of Nordic Semiconductor ASA nor the names of other
 *   contributors to this software may be used to endorse or promote products
 *   derived from this software without specific prior written permission.
 *
 *   4. This software must only be used in or with a processor manufactured by Nordic
 *   Semiconductor ASA, or in or with a processor manufactured by a third party that
 *   is used in combination with a processor manufactured by Nordic Semiconductor.
 *
 *   5. Any software provided in binary or object form under this license must not be
 *   reverse engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
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
