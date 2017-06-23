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

#if NRF_SD_BLE_API_VERSION >= 3
class GattEnableParameters : public BleToJs<ble_gatt_enable_params_t>
{
public:
    GattEnableParameters(ble_gatt_enable_params_t *enableParamters) : BleToJs<ble_gatt_enable_params_t>(enableParamters) {}
    GattEnableParameters(v8::Local<v8::Object> js) : BleToJs<ble_gatt_enable_params_t>(js) {}
    v8::Local<v8::Object> ToJs() override;
    ble_gatt_enable_params_t *ToNative() override;
};
#endif

extern "C" {
    void init_gatt(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target);
}

#endif
