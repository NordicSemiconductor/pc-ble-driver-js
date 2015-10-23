#include "driver_gatts.h"
#include "ble_err.h"

#include "driver.h"
#include "driver_gap.h"
#include "driver_gatt.h"

ble_gatts_attr_md_t *GattsAttributeMetadata::ToNative()
{
    if (jsobj->IsNumber())
    {
        return 0;
    }

    ble_gatts_attr_md_t *attributeMetadata = new ble_gatts_attr_md_t();

    attributeMetadata->read_perm = GapConnSecMode(ConversionUtility::getJsObject(jsobj, "read_perm"));
    attributeMetadata->write_perm = GapConnSecMode(ConversionUtility::getJsObject(jsobj, "write_perm"));

    attributeMetadata->vlen = ConversionUtility::getNativeUint8(jsobj, "vlen");
    attributeMetadata->vloc = ConversionUtility::getNativeUint8(jsobj, "vloc");
    attributeMetadata->rd_auth = ConversionUtility::getNativeUint8(jsobj, "rd_auth");
    attributeMetadata->wr_auth = ConversionUtility::getNativeUint8(jsobj, "wr_auth");

    return attributeMetadata;
}

ble_gatts_char_pf_t *GattsCharacteristicPresentationFormat::ToNative()
{
    if (jsobj->IsNumber())
    {
        return 0;
    }

    ble_gatts_char_pf_t *presentationformat = new ble_gatts_char_pf_t();

    presentationformat->format = ConversionUtility::getNativeUint8(jsobj, "format");
    presentationformat->exponent = ConversionUtility::getNativeInt8(jsobj, "exponent");
    presentationformat->unit = ConversionUtility::getNativeUint16(jsobj, "unit");
    presentationformat->name_space = ConversionUtility::getNativeUint8(jsobj, "name_space");
    presentationformat->desc = ConversionUtility::getNativeUint16(jsobj, "desc");

    return presentationformat;
}

ble_gatts_char_md_t *GattsCharacteristicMetadata::ToNative()
{
    ble_gatts_char_md_t *metadata = new ble_gatts_char_md_t();

    metadata->char_props = GattCharProps(ConversionUtility::getJsObject(jsobj, "char_props"));
    metadata->char_ext_props = GattCharExtProps(ConversionUtility::getJsObject(jsobj, "char_ext_props"));

    //TODO: metadata->p_char_user_desc
    metadata->char_user_desc_max_size = ConversionUtility::getNativeUint16(jsobj, "char_user_desc_max_size");
    metadata->char_user_desc_size = ConversionUtility::getNativeUint16(jsobj, "char_user_desc_size");

    if (Utility::IsObject(jsobj, "p_char_pf"))
        metadata->p_char_pf = GattsCharacteristicPresentationFormat(ConversionUtility::getJsObject(jsobj, "p_char_pf"));
    else
        metadata->p_char_pf = 0;

    if (Utility::IsObject(jsobj, "p_user_desc_md"))
        metadata->p_user_desc_md = GattsAttributeMetadata(ConversionUtility::getJsObject(jsobj, "p_user_desc_md"));
    else
        metadata->p_user_desc_md = 0;

    if (Utility::IsObject(jsobj, "p_cccd_md"))
        metadata->p_cccd_md = GattsAttributeMetadata(ConversionUtility::getJsObject(jsobj, "p_cccd_md"));
    else
        metadata->p_cccd_md = 0;

    if (Utility::IsObject(jsobj, "p_sccd_md"))
        metadata->p_sccd_md = GattsAttributeMetadata(ConversionUtility::getJsObject(jsobj, "p_sccd_md"));
    else
        metadata->p_sccd_md = 0;

    return metadata;
}

ble_gatts_attr_t *GattsAttribute::ToNative()
{
    ble_gatts_attr_t *attribute = new ble_gatts_attr_t();

    attribute->p_uuid = BleUUID(ConversionUtility::getJsObject(jsobj, "p_uuid"));
    attribute->p_attr_md = GattsAttributeMetadata(ConversionUtility::getJsObject(jsobj, "p_attr_md"));

    attribute->init_len = ConversionUtility::getNativeUint16(jsobj, "init_len");
    attribute->init_offs = ConversionUtility::getNativeUint16(jsobj, "init_offs");
    attribute->max_len = ConversionUtility::getNativeUint16(jsobj, "max_len");
    attribute->p_value = ConversionUtility::getNativePointerToUint8(jsobj, "p_value");

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
    ble_gatts_hvx_params_t *hvxparams = new ble_gatts_hvx_params_t();

    hvxparams->handle = ConversionUtility::getNativeUint16(jsobj, "handle");
    hvxparams->type = ConversionUtility::getNativeUint8(jsobj, "type");
    hvxparams->offset = ConversionUtility::getNativeUint16(jsobj, "offset");
    hvxparams->p_len = ConversionUtility::getNativePointerToUint16(jsobj, "p_len");
    hvxparams->p_data = ConversionUtility::getNativePointerToUint8(jsobj, "p_data");

    return hvxparams;
}

ble_gatts_value_t *GattsValue::ToNative()
{
    ble_gatts_value_t *value = new ble_gatts_value_t();

    value->len = ConversionUtility::getNativeUint16(jsobj, "len");
    value->offset = ConversionUtility::getNativeUint16(jsobj, "offset");
    value->p_value = ConversionUtility::getNativePointerToUint8(jsobj, "p_value");

    return value;
}

v8::Local<v8::Object> GattsValue::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();

    Utility::Set(obj, "len", ConversionUtility::toJsNumber(native->len));
    Utility::Set(obj, "offset", ConversionUtility::toJsNumber(native->offset));
    Utility::Set(obj, "p_value", ConversionUtility::toJsValueArray(native->p_value, native->len));
    
    return scope.Escape(obj);
}

v8::Local<v8::Object> GattsAttributeContext::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();

    Utility::Set(obj, "srvc_uuid", BleUUID(&native->srvc_uuid).ToJs());
    Utility::Set(obj, "char_uuid", BleUUID(&native->char_uuid).ToJs());
    Utility::Set(obj, "desc_uuid", BleUUID(&native->desc_uuid).ToJs());
    Utility::Set(obj, "srvc_handle", ConversionUtility::toJsNumber(native->srvc_handle));
    Utility::Set(obj, "value_handle", ConversionUtility::toJsNumber(native->value_handle));
    Utility::Set(obj, "type", ConversionUtility::toJsNumber(native->type));

    return scope.Escape(obj);
}

v8::Local<v8::Object> GattsReadAuthorizeParameters::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();

    Utility::Set(obj, "gatt_status", ConversionUtility::toJsNumber(native->gatt_status));
    Utility::Set(obj, "update", ConversionUtility::toJsNumber(native->update));
    Utility::Set(obj, "offset", ConversionUtility::toJsNumber(native->offset));
    Utility::Set(obj, "len", ConversionUtility::toJsNumber(native->len));
    Utility::Set(obj, "p_data", ConversionUtility::toJsValueArray(native->p_data, native->len));

    return scope.Escape(obj);
}

ble_gatts_read_authorize_params_t *GattsReadAuthorizeParameters::ToNative()
{
    ble_gatts_read_authorize_params_t *params = new ble_gatts_read_authorize_params_t();

    params->gatt_status = ConversionUtility::getNativeUint16(jsobj, "gatt_status");
    params->update = ConversionUtility::getNativeUint8(jsobj, "update");
    params->offset = ConversionUtility::getNativeUint16(jsobj, "offset");
    params->len = ConversionUtility::getNativeUint16(jsobj, "len");
    params->p_data = ConversionUtility::getNativePointerToUint8(jsobj, "update");

    return params;
}

v8::Local<v8::Object> GattsWriteAuthorizeParameters::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();

    Utility::Set(obj, "gatt_status", ConversionUtility::toJsNumber(native->gatt_status));

    return scope.Escape(obj);
}

ble_gatts_write_authorize_params_t *GattsWriteAuthorizeParameters::ToNative()
{
    ble_gatts_write_authorize_params_t *params = new ble_gatts_write_authorize_params_t();

    params->gatt_status = ConversionUtility::getNativeUint16(jsobj, "gatt_status");

    return params;
}

ble_gatts_rw_authorize_reply_params_t *GattRWAuthorizeReplyParams::ToNative()
{
    ble_gatts_rw_authorize_reply_params_t *params = new ble_gatts_rw_authorize_reply_params_t();

    params->type = ConversionUtility::getNativeUint8(jsobj, "type");
    
    if (params->type == BLE_GATTS_AUTHORIZE_TYPE_READ)
    {
        params->params.read = GattsReadAuthorizeParameters(ConversionUtility::getJsObject(jsobj, "read"));
    }
    else if (params->type == BLE_GATTS_AUTHORIZE_TYPE_WRITE)
    {
        params->params.write = GattsWriteAuthorizeParameters(ConversionUtility::getJsObject(jsobj, "write"));
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
    Utility::Set(obj, "context", GattsAttributeContext(&evt->context).ToJs());
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
    Utility::Set(obj, "context", GattsAttributeContext(&native->context).ToJs());
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

NAN_METHOD(AddService)
{
    uint8_t type;
    v8::Local<v8::Object> uuid;
    v8::Local<v8::Function> callback;

    int argumentcount = 0;

    try
    {
        type = ConversionUtility::getNativeUint8(info[argumentcount]);
        argumentcount++;

        uuid = ConversionUtility::getJsObject(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (char *error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    GattsAddServiceBaton *baton = new GattsAddServiceBaton(callback);
    baton->type = type;
    baton->p_uuid = BleUUID(uuid);

    uv_queue_work(uv_default_loop(), baton->req, AddService, (uv_after_work_cb)AfterAddService);
}

// This runs in a worker thread (not Main Thread)
void AddService(uv_work_t *req) {
    GattsAddServiceBaton *baton = static_cast<GattsAddServiceBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gatts_service_add(baton->type, baton->p_uuid, &baton->p_handle);
}

// This runs in Main Thread
void AfterAddService(uv_work_t *req) {
    Nan::HandleScope scope;

    GattsAddServiceBaton *baton = static_cast<GattsAddServiceBaton *>(req->data);
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

    baton->callback->Call(2, argv);
    delete baton;
}

NAN_METHOD(AddCharacteristic)
{
    uint16_t serviceHandle;
    v8::Local<v8::Object> metadata;
    v8::Local<v8::Object> attributeStructure;
    v8::Local<v8::Function> callback;
    int argumentcount = 0;

    try
    {
        serviceHandle = ConversionUtility::getNativeUint8(info[argumentcount]);
        argumentcount++;

        metadata = ConversionUtility::getJsObject(info[argumentcount]);
        argumentcount++;

        attributeStructure = ConversionUtility::getJsObject(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (char *error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    GattsAddCharacteristicBaton *baton = new GattsAddCharacteristicBaton(callback);
    baton->service_handle = serviceHandle;
    baton->p_char_md = GattsCharacteristicMetadata(metadata);
    baton->p_attr_char_value = GattsAttribute(attributeStructure);
    baton->p_handles = new ble_gatts_char_handles_t();

    uv_queue_work(uv_default_loop(), baton->req, AddCharacteristic, (uv_after_work_cb)AfterAddCharacteristic);
}

// This runs in a worker thread (not Main Thread)
void AddCharacteristic(uv_work_t *req) {
    GattsAddCharacteristicBaton *baton = static_cast<GattsAddCharacteristicBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gatts_characteristic_add(baton->service_handle, baton->p_char_md, baton->p_attr_char_value, baton->p_handles);
}

// This runs in Main Thread
void AfterAddCharacteristic(uv_work_t *req) {
    Nan::HandleScope scope;

    GattsAddCharacteristicBaton *baton = static_cast<GattsAddCharacteristicBaton *>(req->data);
    v8::Local<v8::Value> argv[2];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "adding service");
        argv[1] = Nan::Undefined();
    }
    else
    {
        argv[0] = Nan::Undefined();
        argv[1] = GattsCharacteristicDefinitionHandles(baton->p_handles).ToJs();
    }

    baton->callback->Call(2, argv);

    delete baton->p_handles;
    delete baton;
}

NAN_METHOD(HVX)
{
    uint16_t conn_handle;
    v8::Local<v8::Object> hvx_params;
    v8::Local<v8::Function> callback;
    int argumentcount = 0;

    try
    {
        conn_handle = ConversionUtility::getNativeUint8(info[argumentcount]);
        argumentcount++;

        hvx_params = ConversionUtility::getJsObject(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (char *error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    GattsHVXBaton *baton = new GattsHVXBaton(callback);
    baton->conn_handle = conn_handle;
    baton->p_hvx_params = GattsHVXParams(hvx_params);

    uv_queue_work(uv_default_loop(), baton->req, HVX, (uv_after_work_cb)AfterHVX);
}

// This runs in a worker thread (not Main Thread)
void HVX(uv_work_t *req) {
    GattsHVXBaton *baton = static_cast<GattsHVXBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gatts_hvx(baton->conn_handle, baton->p_hvx_params);
}

// This runs in Main Thread
void AfterHVX(uv_work_t *req) {
    Nan::HandleScope scope;

    GattsHVXBaton *baton = static_cast<GattsHVXBaton *>(req->data);
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

    baton->callback->Call(1, argv);

    delete baton->p_hvx_params;
    delete baton;
}

NAN_METHOD(SystemAttributeSet)
{
    uint16_t conn_handle;
    v8::Local<v8::Object> sys_attr_data;
    bool sys_attr_data_isNullPointer = false;
    uint16_t len;
    uint32_t flags;
    v8::Local<v8::Function> callback;
    int argumentcount = 0;

    try
    {
        conn_handle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        if (info[argumentcount]->IsNumber())
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
    catch (char *error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    GattsSystemAttributeSetBaton *baton = new GattsSystemAttributeSetBaton(callback);
    baton->conn_handle = conn_handle;

    if (!sys_attr_data_isNullPointer)
    {
        baton->p_sys_attr_data = ConversionUtility::getNativePointerToUint8(sys_attr_data);
    }
    else
    {
        baton->p_sys_attr_data = 0;
    }

    baton->len = len;
    baton->flags = flags;

    uv_queue_work(uv_default_loop(), baton->req, SystemAttributeSet, (uv_after_work_cb)AfterSystemAttributeSet);
}

// This runs in a worker thread (not Main Thread)
void SystemAttributeSet(uv_work_t *req) {
    GattsSystemAttributeSetBaton *baton = static_cast<GattsSystemAttributeSetBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gatts_sys_attr_set(baton->conn_handle, baton->p_sys_attr_data, baton->len, baton->flags);
}

// This runs in Main Thread
void AfterSystemAttributeSet(uv_work_t *req) {
    Nan::HandleScope scope;

    GattsSystemAttributeSetBaton *baton = static_cast<GattsSystemAttributeSetBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "setting system attributes");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    baton->callback->Call(1, argv);

    delete baton->p_sys_attr_data;
    delete baton;
}

NAN_METHOD(ValueSet)
{
    uint16_t conn_handle;
    uint16_t handle;
    v8::Local<v8::Object> value;
    v8::Local<v8::Function> callback;
    int argumentcount = 0;

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
    catch (char *error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    GattsValueSetBaton *baton = new GattsValueSetBaton(callback);
    baton->conn_handle = conn_handle;
    baton->handle = handle;
    baton->p_value = GattsValue(value);

    uv_queue_work(uv_default_loop(), baton->req, ValueSet, (uv_after_work_cb)AfterValueSet);
}

// This runs in a worker thread (not Main Thread)
void ValueSet(uv_work_t *req) {
    GattsValueSetBaton *baton = static_cast<GattsValueSetBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gatts_value_set(baton->conn_handle, baton->handle, baton->p_value);
}

// This runs in Main Thread
void AfterValueSet(uv_work_t *req) {
    Nan::HandleScope scope;

    GattsValueSetBaton *baton = static_cast<GattsValueSetBaton *>(req->data);
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

    baton->callback->Call(2, argv);

    delete baton->p_value;
    delete baton;
}

NAN_METHOD(ValueGet)
{
    uint16_t conn_handle;
    uint16_t handle;
    v8::Local<v8::Object> value;
    v8::Local<v8::Function> callback;
    int argumentcount = 0;

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
    catch (char *error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    GattsValueSetBaton *baton = new GattsValueSetBaton(callback);
    baton->conn_handle = conn_handle;
    baton->handle = handle;
    baton->p_value = GattsValue(value);

    uv_queue_work(uv_default_loop(), baton->req, ValueGet, (uv_after_work_cb)AfterValueGet);
}

// This runs in a worker thread (not Main Thread)
void ValueGet(uv_work_t *req) {
    GattsValueGetBaton *baton = static_cast<GattsValueGetBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gatts_value_get(baton->conn_handle, baton->handle, baton->p_value);
}

// This runs in Main Thread
void AfterValueGet(uv_work_t *req) {
    Nan::HandleScope scope;

    GattsValueGetBaton *baton = static_cast<GattsValueGetBaton *>(req->data);
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

    baton->callback->Call(2, argv);

    delete baton->p_value;
    delete baton;
}

NAN_METHOD(RWAuthorizeReply)
{
    uint16_t conn_handle;
    v8::Local<v8::Object> params;
    v8::Local<v8::Function> callback;
    int argumentcount = 0;

    try
    {
        conn_handle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        params = ConversionUtility::getJsObject(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (char *error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    GattsRWAuthorizeReplyBaton *baton = new GattsRWAuthorizeReplyBaton(callback);
    baton->conn_handle = conn_handle;
    baton->p_rw_authorize_reply_params = GattRWAuthorizeReplyParams(params);

    uv_queue_work(uv_default_loop(), baton->req, RWAuthorizeReply, (uv_after_work_cb)AfterRWAuthorizeReply);
}

// This runs in a worker thread (not Main Thread)
void RWAuthorizeReply(uv_work_t *req) {
    GattsRWAuthorizeReplyBaton *baton = static_cast<GattsRWAuthorizeReplyBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gatts_rw_authorize_reply(baton->conn_handle, baton->p_rw_authorize_reply_params);
}

// This runs in Main Thread
void AfterRWAuthorizeReply(uv_work_t *req) {
    Nan::HandleScope scope;

    GattsRWAuthorizeReplyBaton *baton = static_cast<GattsRWAuthorizeReplyBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "replying to authorize request");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    baton->callback->Call(2, argv);

    delete baton->p_rw_authorize_reply_params;
    delete baton;
}

extern "C" {
    void init_gatts(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target)
    {
        Utility::SetMethod(target, "gatts_add_service", AddService);
        Utility::SetMethod(target, "gatts_add_characteristic", AddCharacteristic);
        Utility::SetMethod(target, "gatts_hvx", HVX);
        Utility::SetMethod(target, "gatts_set_system_attribute", SystemAttributeSet);
        Utility::SetMethod(target, "gatts_set_value", ValueSet);
        Utility::SetMethod(target, "gatts_get_value", ValueGet);


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

        NODE_DEFINE_CONSTANT(target, BLE_GATTS_EVT_WRITE);                           /**< Write operation performed. @ref ble_gatts_evt_write_t */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_EVT_RW_AUTHORIZE_REQUEST);            /**< Read/Write Authorization request.@ref ble_gatts_evt_rw_authorize_request_t */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_EVT_SYS_ATTR_MISSING);                /**< A persistent system attribute access is pending, awaiting a sd_ble_gatts_sys_attr_set(). @ref ble_gatts_evt_sys_attr_missing_t */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_EVT_HVC);                             /**< Handle Value Confirmation. @ref ble_gatts_evt_hvc_t */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_EVT_SC_CONFIRM);                      /**< Service Changed Confirmation. No additional event structure applies. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_EVT_TIMEOUT);                         /**< Timeout. @ref ble_gatts_evt_timeout_t */

    }
}
