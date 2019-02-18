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

#include "driver_gatts.h"
#include "ble_err.h"

#include "driver.h"
#include "driver_gap.h"
#include "driver_gatt.h"

#include <iostream>

static name_map_t gatts_op_map =
{
	NAME_MAP_ENTRY(BLE_GATTS_OP_WRITE_REQ),
	NAME_MAP_ENTRY(BLE_GATTS_OP_WRITE_CMD),
	NAME_MAP_ENTRY(BLE_GATTS_OP_SIGN_WRITE_CMD),
	NAME_MAP_ENTRY(BLE_GATTS_OP_PREP_WRITE_REQ),
	NAME_MAP_ENTRY(BLE_GATTS_OP_EXEC_WRITE_REQ_CANCEL),
	NAME_MAP_ENTRY(BLE_GATTS_OP_EXEC_WRITE_REQ_NOW)
};

v8::Local<v8::Object> GattsEnableParameters::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();

    Utility::Set(obj, "service_changed", native->service_changed);
    Utility::Set(obj, "attr_tab_size", native->attr_tab_size);

    return scope.Escape(obj);
}

ble_gatts_enable_params_t *GattsEnableParameters::ToNative()
{
    auto enableParams = new ble_gatts_enable_params_t();

    enableParams->service_changed = ConversionUtility::getNativeBool(jsobj, "service_changed");
    enableParams->attr_tab_size = ConversionUtility::getNativeUint32(jsobj, "attr_tab_size");

    return enableParams;
}

ble_gatts_attr_md_t *GattsAttributeMetadata::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto attributeMetadata = new ble_gatts_attr_md_t();

    attributeMetadata->read_perm = GapConnSecMode(ConversionUtility::getJsObject(jsobj, "read_perm"));
    attributeMetadata->write_perm = GapConnSecMode(ConversionUtility::getJsObject(jsobj, "write_perm"));

    attributeMetadata->vlen = ConversionUtility::getNativeBool(jsobj, "vlen");
    attributeMetadata->vloc = ConversionUtility::getNativeUint8(jsobj, "vloc");
    attributeMetadata->rd_auth = ConversionUtility::getNativeBool(jsobj, "rd_auth");
    attributeMetadata->wr_auth = ConversionUtility::getNativeBool(jsobj, "wr_auth");

    return attributeMetadata;
}

ble_gatts_char_pf_t *GattsCharacteristicPresentationFormat::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto presentationformat = new ble_gatts_char_pf_t();

    presentationformat->format = ConversionUtility::getNativeUint8(jsobj, "format");
    presentationformat->exponent = ConversionUtility::getNativeInt8(jsobj, "exponent");
    presentationformat->unit = ConversionUtility::getNativeUint16(jsobj, "unit");
    presentationformat->name_space = ConversionUtility::getNativeUint8(jsobj, "name_space");
    presentationformat->desc = ConversionUtility::getNativeUint16(jsobj, "desc");

    return presentationformat;
}

ble_gatts_char_md_t *GattsCharacteristicMetadata::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto metadata = new ble_gatts_char_md_t();

    metadata->char_props = GattCharProps(ConversionUtility::getJsObject(jsobj, "char_props"));
    metadata->char_ext_props = GattCharExtProps(ConversionUtility::getJsObject(jsobj, "char_ext_props"));

    //TODO: metadata->p_char_user_desc
    metadata->char_user_desc_max_size = ConversionUtility::getNativeUint16(jsobj, "char_user_desc_max_size");
    metadata->char_user_desc_size = ConversionUtility::getNativeUint16(jsobj, "char_user_desc_size");

    metadata->p_char_pf = GattsCharacteristicPresentationFormat(ConversionUtility::getJsObjectOrNull(jsobj, "char_pf"));
    metadata->p_user_desc_md = GattsAttributeMetadata(ConversionUtility::getJsObjectOrNull(jsobj, "user_desc_md"));
    metadata->p_cccd_md = GattsAttributeMetadata(ConversionUtility::getJsObjectOrNull(jsobj, "cccd_md"));
    metadata->p_sccd_md = GattsAttributeMetadata(ConversionUtility::getJsObjectOrNull(jsobj, "sccd_md"));

    return metadata;
}

ble_gatts_attr_t *GattsAttribute::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto attribute = new ble_gatts_attr_t();

    attribute->p_uuid = BleUUID(ConversionUtility::getJsObject(jsobj, "uuid"));
    attribute->p_attr_md = GattsAttributeMetadata(ConversionUtility::getJsObject(jsobj, "attr_md"));

    attribute->init_len = ConversionUtility::getNativeUint16(jsobj, "init_len");
    attribute->init_offs = ConversionUtility::getNativeUint16(jsobj, "init_offs");
    attribute->max_len = ConversionUtility::getNativeUint16(jsobj, "max_len");
    attribute->p_value = ConversionUtility::getNativePointerToUint8(jsobj, "value");

    return attribute;
}

v8::Local<v8::Object> GattsCharacteristicDefinitionHandles::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();

    Utility::Set(obj, "value_handle", ConversionUtility::toJsNumber(native->value_handle));
    Utility::Set(obj, "user_desc_handle", ConversionUtility::toJsNumber(native->user_desc_handle));
    Utility::Set(obj, "cccd_handle", ConversionUtility::toJsNumber(native->cccd_handle));
    Utility::Set(obj, "sccd_handle", ConversionUtility::toJsNumber(native->sccd_handle));

    return scope.Escape(obj);
}

ble_gatts_hvx_params_t *GattsHVXParams::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto hvxparams = new ble_gatts_hvx_params_t();

    hvxparams->p_len = static_cast<uint16_t*>(malloc(sizeof(uint16_t)));

    hvxparams->handle = ConversionUtility::getNativeUint16(jsobj, "handle");
    hvxparams->type = ConversionUtility::getNativeUint8(jsobj, "type");
    hvxparams->offset = ConversionUtility::getNativeUint16(jsobj, "offset");
    *(hvxparams->p_len) = ConversionUtility::getNativeUint16(jsobj, "len");
    hvxparams->p_data = ConversionUtility::getNativePointerToUint8(jsobj, "data");

    return hvxparams;
}

ble_gatts_value_t *GattsValue::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto value = new ble_gatts_value_t();

    value->len = ConversionUtility::getNativeUint16(jsobj, "len");
    value->offset = ConversionUtility::getNativeUint16(jsobj, "offset");
    value->p_value = ConversionUtility::getNativePointerToUint8(jsobj, "value");

    return value;
}

v8::Local<v8::Object> GattsValue::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();

    Utility::Set(obj, "len", ConversionUtility::toJsNumber(native->len));
    Utility::Set(obj, "offset", ConversionUtility::toJsNumber(native->offset));
    Utility::Set(obj, "value", ConversionUtility::toJsValueArray(native->p_value, native->len));

    return scope.Escape(obj);
}

v8::Local<v8::Object> GattsAuthorizeParameters::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();

    Utility::Set(obj, "gatt_status", ConversionUtility::toJsNumber(native->gatt_status));
    Utility::Set(obj, "update", ConversionUtility::toJsNumber(native->update));
    Utility::Set(obj, "offset", ConversionUtility::toJsNumber(native->offset));
    Utility::Set(obj, "len", ConversionUtility::toJsNumber(native->len));
    Utility::Set(obj, "data", ConversionUtility::toJsValueArray(native->p_data, native->len));

    return scope.Escape(obj);
}

ble_gatts_authorize_params_t *GattsAuthorizeParameters::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto params = new ble_gatts_authorize_params_t();

    params->gatt_status = ConversionUtility::getNativeUint16(jsobj, "gatt_status");
    params->update = ConversionUtility::getNativeUint8(jsobj, "update");
    params->offset = ConversionUtility::getNativeUint16(jsobj, "offset");
    params->len = ConversionUtility::getNativeUint16(jsobj, "len");
    params->p_data = ConversionUtility::getNativePointerToUint8(jsobj, "data");

    return params;
}

ble_gatts_rw_authorize_reply_params_t *GattGattsReplyReadWriteAuthorizeParams::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto params = new ble_gatts_rw_authorize_reply_params_t();

    params->type = ConversionUtility::getNativeUint8(jsobj, "type");

    if (params->type == BLE_GATTS_AUTHORIZE_TYPE_READ)
    {
        params->params.read = GattsAuthorizeParameters(ConversionUtility::getJsObject(jsobj, "read"));
    }
    else if (params->type == BLE_GATTS_AUTHORIZE_TYPE_WRITE)
    {
        params->params.write = GattsAuthorizeParameters(ConversionUtility::getJsObject(jsobj, "write"));
    }

    return params;
}

v8::Local<v8::Object> GattsWriteEvent::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverGattsEvent::ToJs(obj);

    Utility::Set(obj, "handle", ConversionUtility::toJsNumber(evt->handle));
    Utility::Set(obj, "op", ConversionUtility::toJsNumber(evt->op));
	Utility::Set(obj, "op_name", ConversionUtility::valueToJsString(evt->op, gatts_op_map));
    Utility::Set(obj, "auth_required", ConversionUtility::toJsBool(evt->auth_required));
    Utility::Set(obj, "uuid", BleUUID(&evt->uuid).ToJs());
    Utility::Set(obj, "offset", ConversionUtility::toJsNumber(evt->offset));
    Utility::Set(obj, "len", ConversionUtility::toJsNumber(evt->len));
    Utility::Set(obj, "data", ConversionUtility::toJsValueArray(evt->data, evt->len));

    return scope.Escape(obj);
}

v8::Local<v8::Object> GattsReadEvent::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();

    Utility::Set(obj, "handle", ConversionUtility::toJsNumber(native->handle));
    Utility::Set(obj, "uuid", BleUUID(&native->uuid).ToJs());
    Utility::Set(obj, "offset", ConversionUtility::toJsNumber(native->offset));

    return scope.Escape(obj);
}

v8::Local<v8::Object> GattsRWAuthorizeRequestEvent::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverGattsEvent::ToJs(obj);

    Utility::Set(obj, "type", ConversionUtility::toJsNumber(evt->type));

    if (evt->type == BLE_GATTS_AUTHORIZE_TYPE_READ)
    {
        Utility::Set(obj, "read", GattsReadEvent(&evt->request.read).ToJs());
        Utility::Set(obj, "write", ConversionUtility::toJsNumber(0));
    }
    else if (evt->type == BLE_GATTS_AUTHORIZE_TYPE_WRITE)
    {
        Utility::Set(obj, "read", ConversionUtility::toJsNumber(0));
        Utility::Set(obj, "write", GattsWriteEvent(timestamp, conn_handle, &evt->request.write).ToJs());
    }
    else
    {
        Utility::Set(obj, "read", ConversionUtility::toJsNumber(0));
        Utility::Set(obj, "write", ConversionUtility::toJsNumber(0));
    }

    return scope.Escape(obj);
}

v8::Local<v8::Object> GattsSystemAttributeMissingEvent::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverGattsEvent::ToJs(obj);

    Utility::Set(obj, "hint", ConversionUtility::toJsNumber(evt->hint));

    return scope.Escape(obj);
}

v8::Local<v8::Object> GattsHVCEvent::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverGattsEvent::ToJs(obj);

    Utility::Set(obj, "handle", ConversionUtility::toJsNumber(evt->handle));

    return scope.Escape(obj);
}

v8::Local<v8::Object> GattsSCConfirmEvent::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverGattsEvent::ToJs(obj);

    return scope.Escape(obj);
}

v8::Local<v8::Object> GattsTimeoutEvent::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverGattsEvent::ToJs(obj);

    Utility::Set(obj, "src", ConversionUtility::toJsNumber(evt->src));

    return scope.Escape(obj);
}

#if NRF_SD_BLE_API_VERSION >= 3
v8::Local<v8::Object> GattsExchangeMtuRequestEvent::ToJs()
{
	Nan::EscapableHandleScope scope;
	v8::Local<v8::Object> obj = Nan::New<v8::Object>();
	BleDriverGattsEvent::ToJs(obj);

	Utility::Set(obj, "client_rx_mtu", ConversionUtility::toJsNumber(evt->client_rx_mtu));

	return scope.Escape(obj);
}
#endif

NAN_METHOD(Adapter::GattsAddService)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    uint8_t type;
    v8::Local<v8::Object> uuid;
    v8::Local<v8::Function> callback;

    auto argumentcount = 0;

    try
    {
        type = ConversionUtility::getNativeUint8(info[argumentcount]);
        argumentcount++;

        uuid = ConversionUtility::getJsObject(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new GattsAddServiceBaton(callback);
    baton->adapter = obj->adapter;
    baton->type = type;

    try
    {
        baton->p_uuid = BleUUID(uuid);
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getStructErrorMessage("uuid", error);
        Nan::ThrowTypeError(message);
        return;
    }

    uv_queue_work(uv_default_loop(), baton->req, GattsAddService, reinterpret_cast<uv_after_work_cb>(AfterGattsAddService));
}

// This runs in a worker thread (not Main Thread)
void Adapter::GattsAddService(uv_work_t *req)
{
    auto baton = static_cast<GattsAddServiceBaton *>(req->data);
    baton->result = sd_ble_gatts_service_add(baton->adapter, baton->type, baton->p_uuid, &baton->p_handle);
}

// This runs in Main Thread
void Adapter::AfterGattsAddService(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<GattsAddServiceBaton *>(req->data);
    v8::Local<v8::Value> argv[2];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "adding service");
        argv[1] = Nan::Undefined();
    }
    else
    {
        argv[0] = Nan::Undefined();
        argv[1] = ConversionUtility::toJsNumber(baton->p_handle);
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(2, argv, &resource);
    delete baton;
}

NAN_METHOD(Adapter::GattsAddCharacteristic)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    uint16_t serviceHandle;
    v8::Local<v8::Object> metadata;
    v8::Local<v8::Object> attributeStructure;
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        serviceHandle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        metadata = ConversionUtility::getJsObject(info[argumentcount]);
        argumentcount++;

        attributeStructure = ConversionUtility::getJsObject(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new GattsAddCharacteristicBaton(callback);
    baton->adapter = obj->adapter;
    baton->service_handle = serviceHandle;

    try
    {
        baton->p_char_md = GattsCharacteristicMetadata(metadata);
    }
    catch (std::string err)
    {
        Nan::ThrowTypeError(ErrorMessage::getStructErrorMessage("char_md", err));
        return;
    }

    try
    {
        baton->p_attr_char_value = GattsAttribute(attributeStructure);
    }
    catch (std::string err)
    {
        Nan::ThrowTypeError(ErrorMessage::getStructErrorMessage("attr_char_value", err));
        return;
    }

    baton->p_handles = new ble_gatts_char_handles_t();

    uv_queue_work(uv_default_loop(), baton->req, GattsAddCharacteristic, reinterpret_cast<uv_after_work_cb>(AfterGattsAddCharacteristic));
}

// This runs in a worker thread (not Main Thread)
void Adapter::GattsAddCharacteristic(uv_work_t *req)
{
    auto baton = static_cast<GattsAddCharacteristicBaton *>(req->data);
    baton->result = sd_ble_gatts_characteristic_add(baton->adapter, baton->service_handle, baton->p_char_md, baton->p_attr_char_value, baton->p_handles);
}

// This runs in Main Thread
void Adapter::AfterGattsAddCharacteristic(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<GattsAddCharacteristicBaton *>(req->data);
    v8::Local<v8::Value> argv[2];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "adding characteristic");
        argv[1] = Nan::Undefined();
    }
    else
    {
        argv[0] = Nan::Undefined();
        argv[1] = GattsCharacteristicDefinitionHandles(baton->p_handles).ToJs();
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(2, argv, &resource);
    delete baton;
}

NAN_METHOD(Adapter::GattsAddDescriptor)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    uint16_t characteristicHandle;
    v8::Local<v8::Object> attributeStructure;
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        characteristicHandle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        attributeStructure = ConversionUtility::getJsObject(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new GattsAddDescriptorBaton(callback);
    baton->adapter = obj->adapter;
    baton->char_handle = characteristicHandle;

    try
    {
        baton->p_attr = GattsAttribute(attributeStructure);
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getStructErrorMessage("attr", error);
        Nan::ThrowTypeError(message);
        return;
    }

    uv_queue_work(uv_default_loop(), baton->req, GattsAddDescriptor, reinterpret_cast<uv_after_work_cb>(AfterGattsAddDescriptor));
}

// This runs in a worker thread (not Main Thread)
void Adapter::GattsAddDescriptor(uv_work_t *req)
{
    auto baton = static_cast<GattsAddDescriptorBaton *>(req->data);
    baton->result = sd_ble_gatts_descriptor_add(baton->adapter, baton->char_handle, baton->p_attr, &baton->p_handle);
}

// This runs in Main Thread
void Adapter::AfterGattsAddDescriptor(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<GattsAddDescriptorBaton *>(req->data);
    v8::Local<v8::Value> argv[2];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "adding descriptor");
        argv[1] = Nan::Undefined();
    }
    else
    {
        argv[0] = Nan::Undefined();
        argv[1] = ConversionUtility::toJsNumber(baton->p_handle);
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(2, argv, &resource);
    delete baton;
}

NAN_METHOD(Adapter::GattsHVX)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    uint16_t conn_handle;
    v8::Local<v8::Object> hvx_params;
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        conn_handle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        hvx_params = ConversionUtility::getJsObject(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new GattsHVXBaton(callback);
    baton->adapter = obj->adapter;
    baton->conn_handle = conn_handle;

    try
    {
        baton->p_hvx_params = GattsHVXParams(hvx_params);
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getStructErrorMessage("hvx_params", error);
        Nan::ThrowTypeError(message);
        return;
    }

    uv_queue_work(uv_default_loop(), baton->req, GattsHVX, reinterpret_cast<uv_after_work_cb>(AfterGattsHVX));
}

// This runs in a worker thread (not Main Thread)
void Adapter::GattsHVX(uv_work_t *req)
{
    auto baton = static_cast<GattsHVXBaton *>(req->data);
    baton->result = sd_ble_gatts_hvx(baton->adapter, baton->conn_handle, baton->p_hvx_params);
}

// This runs in Main Thread
void Adapter::AfterGattsHVX(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<GattsHVXBaton *>(req->data);
    v8::Local<v8::Value> argv[2];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "hvx");
        argv[1] = Nan::Undefined();
    }
    else
    {
        argv[0] = Nan::Undefined();
        argv[1] = ConversionUtility::toJsNumber(*baton->p_hvx_params->p_len);
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(1, argv, &resource);
    delete baton;
}

NAN_METHOD(Adapter::GattsSystemAttributeSet)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    uint16_t conn_handle;
    v8::Local<v8::Object> sys_attr_data;
    auto  sys_attr_data_isNullPointer = false;
    uint16_t len;
    uint32_t flags;
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        conn_handle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        if (info[argumentcount]->IsNull())
        {
            sys_attr_data_isNullPointer = true;
        }
        else
        {
            sys_attr_data = ConversionUtility::getJsObject(info[argumentcount]);
        }
        argumentcount++;

        len = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        flags = ConversionUtility::getNativeUint32(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new GattsSystemAttributeSetBaton(callback);
    baton->adapter = obj->adapter;
    baton->conn_handle = conn_handle;

    if (!sys_attr_data_isNullPointer)
    {
        baton->p_sys_attr_data = ConversionUtility::getNativePointerToUint8(sys_attr_data);
    }
    else
    {
        baton->p_sys_attr_data = nullptr;
    }

    baton->len = len;
    baton->flags = flags;

    uv_queue_work(uv_default_loop(), baton->req, GattsSystemAttributeSet, reinterpret_cast<uv_after_work_cb>(AfterGattsSystemAttributeSet));
}

// This runs in a worker thread (not Main Thread)
void Adapter::GattsSystemAttributeSet(uv_work_t *req)
{
    auto baton = static_cast<GattsSystemAttributeSetBaton *>(req->data);
    baton->result = sd_ble_gatts_sys_attr_set(baton->adapter, baton->conn_handle, baton->p_sys_attr_data, baton->len, baton->flags);
}

// This runs in Main Thread
void Adapter::AfterGattsSystemAttributeSet(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<GattsSystemAttributeSetBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "setting system attributes");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(1, argv, &resource);
    delete baton;
}

NAN_METHOD(Adapter::GattsSetValue)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    uint16_t conn_handle;
    uint16_t handle;
    v8::Local<v8::Object> value;
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        conn_handle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        handle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        value = ConversionUtility::getJsObject(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new GattsSetValueBaton(callback);
    baton->adapter = obj->adapter;
    baton->conn_handle = conn_handle;
    baton->handle = handle;

    try
    {
        baton->p_value = GattsValue(value);
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getStructErrorMessage("value", error);
        Nan::ThrowTypeError(message);
        return;
    }

    uv_queue_work(uv_default_loop(), baton->req, GattsSetValue, reinterpret_cast<uv_after_work_cb>(AfterGattsSetValue));
}

// This runs in a worker thread (not Main Thread)
void Adapter::GattsSetValue(uv_work_t *req)
{
    auto baton = static_cast<GattsSetValueBaton *>(req->data);
    baton->result = sd_ble_gatts_value_set(baton->adapter, baton->conn_handle, baton->handle, baton->p_value);
}

// This runs in Main Thread
void Adapter::AfterGattsSetValue(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<GattsSetValueBaton *>(req->data);
    v8::Local<v8::Value> argv[2];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "setting value");
        argv[1] = Nan::Undefined();
    }
    else
    {
        argv[0] = Nan::Undefined();
        argv[1] = GattsValue(baton->p_value);
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(2, argv, &resource);
    delete baton;
}

NAN_METHOD(Adapter::GattsGetValue)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    uint16_t conn_handle;
    uint16_t handle;
    v8::Local<v8::Object> value;
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        conn_handle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        handle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        value = ConversionUtility::getJsObject(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new GattsSetValueBaton(callback);
    baton->adapter = obj->adapter;
    baton->conn_handle = conn_handle;
    baton->handle = handle;

    try
    {
        baton->p_value = GattsValue(value);
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getStructErrorMessage("value", error);
        Nan::ThrowTypeError(message);
        return;
    }

    uv_queue_work(uv_default_loop(), baton->req, GattsGetValue, reinterpret_cast<uv_after_work_cb>(AfterGattsGetValue));
}

// This runs in a worker thread (not Main Thread)
void Adapter::GattsGetValue(uv_work_t *req)
{
    auto baton = static_cast<GattsGetValueBaton *>(req->data);
    baton->result = sd_ble_gatts_value_get(baton->adapter, baton->conn_handle, baton->handle, baton->p_value);
}

// This runs in Main Thread
void Adapter::AfterGattsGetValue(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<GattsGetValueBaton *>(req->data);
    v8::Local<v8::Value> argv[2];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "getting value");
        argv[1] = Nan::Undefined();
    }
    else
    {
        argv[0] = Nan::Undefined();
        argv[1] = GattsValue(baton->p_value);
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(2, argv, &resource);
    delete baton;
}

NAN_METHOD(Adapter::GattsReplyReadWriteAuthorize)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    uint16_t conn_handle;
    v8::Local<v8::Object> params;
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        conn_handle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        params = ConversionUtility::getJsObject(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new GattsReplyReadWriteAuthorizeBaton(callback);
    baton->adapter = obj->adapter;
    baton->conn_handle = conn_handle;

    try
    {
        baton->p_rw_authorize_reply_params = GattGattsReplyReadWriteAuthorizeParams(params);
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getStructErrorMessage("rw_authorize_reply_params", error);
        Nan::ThrowTypeError(message);
        return;
    }

    uv_queue_work(uv_default_loop(), baton->req, GattsReplyReadWriteAuthorize, reinterpret_cast<uv_after_work_cb>(AfterGattsReplyReadWriteAuthorize));
}

// This runs in a worker thread (not Main Thread)
void Adapter::GattsReplyReadWriteAuthorize(uv_work_t *req)
{
    auto baton = static_cast<GattsReplyReadWriteAuthorizeBaton *>(req->data);
    baton->result = sd_ble_gatts_rw_authorize_reply(baton->adapter, baton->conn_handle, baton->p_rw_authorize_reply_params);
}

// This runs in Main Thread
void Adapter::AfterGattsReplyReadWriteAuthorize(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<GattsReplyReadWriteAuthorizeBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "replying to authorize request");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(1, argv, &resource);
    delete baton;
}

#if NRF_SD_BLE_API_VERSION >= 3
NAN_METHOD(Adapter::GattsExchangeMtuReply)
{
    uint16_t conn_handle;
    uint16_t server_rx_mtu;
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        conn_handle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        server_rx_mtu = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    auto baton = new GattsExchangeMtuReplyBaton(callback);
    baton->adapter = obj->adapter;
    baton->conn_handle = conn_handle;
    baton->server_rx_mtu = server_rx_mtu;

    uv_queue_work(uv_default_loop(), baton->req, GattsExchangeMtuReply, reinterpret_cast<uv_after_work_cb>(AfterGattsExchangeMtuReply));
}

// This runs in a worker thread (not Main Thread)
void Adapter::GattsExchangeMtuReply(uv_work_t *req)
{
    auto baton = static_cast<GattsExchangeMtuReplyBaton *>(req->data);
    baton->result = sd_ble_gatts_exchange_mtu_reply(baton->adapter, baton->conn_handle, baton->server_rx_mtu);
}

// This runs in Main Thread
void Adapter::AfterGattsExchangeMtuReply(uv_work_t *req)
{
    Nan::HandleScope scope;

    auto baton = static_cast<GattsExchangeMtuReplyBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "replying MTU exchange");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(1, argv, &resource);
    delete baton;
}
#endif

extern "C" {
    void init_gatts(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target)
    {
        /* BLE_ERRORS_GATTS SVC return values specific to GATTS */
        NODE_DEFINE_CONSTANT(target, BLE_ERROR_GATTS_INVALID_ATTR_TYPE); /* Invalid attribute type. */
        NODE_DEFINE_CONSTANT(target, BLE_ERROR_GATTS_SYS_ATTR_MISSING); /* System Attributes missing. */

        /* BLE_GATTS_ATTR_LENS_MAX Maximum attribute lengths */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_FIX_ATTR_LEN_MAX); /* Maximum length for fixed length Attribute Values. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_VAR_ATTR_LEN_MAX); /* Maximum length for variable length Attribute Values. */

        /* BLE_GATTS_SRVC_TYPES GATT Server Service Types */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_SRVC_TYPE_INVALID); /* Invalid Service Type. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_SRVC_TYPE_PRIMARY); /* Primary Service. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_SRVC_TYPE_SECONDARY); /* Secondary Type. */

        /* BLE_GATTS_ATTR_TYPES GATT Server Attribute Types */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_ATTR_TYPE_INVALID); /* Invalid Attribute Type. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_ATTR_TYPE_PRIM_SRVC_DECL); /* Primary Service Declaration. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_ATTR_TYPE_SEC_SRVC_DECL); /* Secondary Service Declaration. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_ATTR_TYPE_INC_DECL); /* Include Declaration. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_ATTR_TYPE_CHAR_DECL); /* Characteristic Declaration. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_ATTR_TYPE_CHAR_VAL); /* Characteristic Value. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_ATTR_TYPE_DESC); /* Descriptor. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_ATTR_TYPE_OTHER); /* Other, non-GATT specific type. */

        /* BLE_GATTS_OPS GATT Server Operations */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_OP_INVALID); /* Invalid Operation. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_OP_WRITE_REQ); /* Write Request. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_OP_WRITE_CMD); /* Write Command. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_OP_SIGN_WRITE_CMD); /* Signed Write Command. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_OP_PREP_WRITE_REQ); /* Prepare Write Request. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_OP_EXEC_WRITE_REQ_CANCEL); /* Execute Write Request: Cancel all prepared writes. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_OP_EXEC_WRITE_REQ_NOW); /* Execute Write Request: Immediately execute all prepared writes. */

        /* BLE_GATTS_VLOCS GATT Value Locations */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_VLOC_INVALID); /* Invalid Location. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_VLOC_STACK); /* Attribute Value is located in stack memory, no user memory is required. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_VLOC_USER); /**< Attribute Value is located in user memory. This requires the user to maintain a valid buffer through the lifetime of the attribute, since the stack
                                                           will read and write directly to the memory using the pointer provided in the APIs. There are no alignment requirements for the buffer. */

        /* BLE_GATTS_AUTHORIZE_TYPES GATT Server Authorization Types */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_AUTHORIZE_TYPE_INVALID); /* Invalid Type. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_AUTHORIZE_TYPE_READ); /* Authorize a Read Operation. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_AUTHORIZE_TYPE_WRITE); /* Authorize a Write Request Operation. */

        /* BLE_GATTS_SYS_ATTR_FLAGS System Attribute Flags */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_SYS_ATTR_FLAG_SYS_SRVCS); /* Restrict system attributes to system services only. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_SYS_ATTR_FLAG_USR_SRVCS); /* Restrict system attributes to user services only. */

        /* BLE_GATTS_ATTR_TAB_SIZE Attribute Table size */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_ATTR_TAB_SIZE_MIN); /* Minimum Attribute Table size */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_ATTR_TAB_SIZE_DEFAULT); /* Default Attribute Table size (0x600 bytes for this version of the SoftDevice). */

        NODE_DEFINE_CONSTANT(target, SD_BLE_GATTS_SERVICE_ADD);                      /**< Add a service. */
        NODE_DEFINE_CONSTANT(target, SD_BLE_GATTS_INCLUDE_ADD);                      /**< Add an included service. */
        NODE_DEFINE_CONSTANT(target, SD_BLE_GATTS_CHARACTERISTIC_ADD);               /**< Add a characteristic. */
        NODE_DEFINE_CONSTANT(target, SD_BLE_GATTS_DESCRIPTOR_ADD);                   /**< Add a generic attribute. */
        NODE_DEFINE_CONSTANT(target, SD_BLE_GATTS_VALUE_SET);                        /**< Set an attribute value. */
        NODE_DEFINE_CONSTANT(target, SD_BLE_GATTS_VALUE_GET);                        /**< Get an attribute value. */
        NODE_DEFINE_CONSTANT(target, SD_BLE_GATTS_HVX);                              /**< Handle Value Notification or Indication. */
        NODE_DEFINE_CONSTANT(target, SD_BLE_GATTS_SERVICE_CHANGED);                  /**< Perform a Service Changed Indication to one or more peers. */
        NODE_DEFINE_CONSTANT(target, SD_BLE_GATTS_RW_AUTHORIZE_REPLY);               /**< Reply to an authorization request for a read or write operation on one or more attributes. */
        NODE_DEFINE_CONSTANT(target, SD_BLE_GATTS_SYS_ATTR_SET);                     /**< Set the persistent system attributes for a connection. */
        NODE_DEFINE_CONSTANT(target, SD_BLE_GATTS_SYS_ATTR_GET);                     /**< Retrieve the persistent system attributes. */
#if NRF_SD_BLE_API_VERSION >= 3
        NODE_DEFINE_CONSTANT(target, SD_BLE_GATTS_EXCHANGE_MTU_REPLY);               /**< Reply to an ATT_MTU exchange request by sending an Exchange MTU Response to the client. */
#endif

        NODE_DEFINE_CONSTANT(target, BLE_GATTS_EVT_WRITE);                           /**< Write operation performed. @ref ble_gatts_evt_write_t */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_EVT_RW_AUTHORIZE_REQUEST);            /**< Read/Write Authorization request.@ref ble_gatts_evt_rw_authorize_request_t */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_EVT_SYS_ATTR_MISSING);                /**< A persistent system attribute access is pending, awaiting a sd_ble_gatts_sys_attr_set(). @ref ble_gatts_evt_sys_attr_missing_t */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_EVT_HVC);                             /**< Handle Value Confirmation. @ref ble_gatts_evt_hvc_t */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_EVT_SC_CONFIRM);                      /**< Service Changed Confirmation. No additional event structure applies. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_EVT_TIMEOUT);                         /**< Timeout. @ref ble_gatts_evt_timeout_t */
#if NRF_SD_BLE_API_VERSION >= 3
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_EVT_EXCHANGE_MTU_REQUEST);            /**< Exchange MTU Request. Reply with @ref sd_ble_gatts_exchange_mtu_reply. @ref ble_gatts_evt_exchange_mtu_request_t. */
#endif
    }
}
