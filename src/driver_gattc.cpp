#include "driver_gattc.h"
#include "ble_err.h"

#include "driver.h"
#include "driver_gatt.h"

static name_map_t gattc_svcs_type_map = {
    NAME_MAP_ENTRY(SD_BLE_GATTC_PRIMARY_SERVICES_DISCOVER),
    NAME_MAP_ENTRY(SD_BLE_GATTC_RELATIONSHIPS_DISCOVER),
    NAME_MAP_ENTRY(SD_BLE_GATTC_CHARACTERISTICS_DISCOVER),
    NAME_MAP_ENTRY(SD_BLE_GATTC_DESCRIPTORS_DISCOVER),
    NAME_MAP_ENTRY(SD_BLE_GATTC_CHAR_VALUE_BY_UUID_READ),
    NAME_MAP_ENTRY(SD_BLE_GATTC_READ),
    NAME_MAP_ENTRY(SD_BLE_GATTC_CHAR_VALUES_READ),
    NAME_MAP_ENTRY(SD_BLE_GATTC_WRITE),
    NAME_MAP_ENTRY(SD_BLE_GATTC_HV_CONFIRM)
};

static name_map_t gattc_evts_type_map = {
    NAME_MAP_ENTRY(BLE_GATTC_EVT_PRIM_SRVC_DISC_RSP),
    NAME_MAP_ENTRY(BLE_GATTC_EVT_REL_DISC_RSP),
    NAME_MAP_ENTRY(BLE_GATTC_EVT_CHAR_DISC_RSP),
    NAME_MAP_ENTRY(BLE_GATTC_EVT_DESC_DISC_RSP),
    NAME_MAP_ENTRY(BLE_GATTC_EVT_CHAR_VAL_BY_UUID_READ_RSP),
    NAME_MAP_ENTRY(BLE_GATTC_EVT_READ_RSP),
    NAME_MAP_ENTRY(BLE_GATTC_EVT_CHAR_VALS_READ_RSP),
    NAME_MAP_ENTRY(BLE_GATTC_EVT_WRITE_RSP),
    NAME_MAP_ENTRY(BLE_GATTC_EVT_HVX),
    NAME_MAP_ENTRY(BLE_GATTC_EVT_TIMEOUT)
};

//
// GattcHandleRange -- START --
//

v8::Local<v8::Object> GattcHandleRange::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Utility::Set(obj, "start_handle", native->start_handle);
    Utility::Set(obj, "end_handle", native->end_handle);

    return scope.Escape(obj);
}

ble_gattc_handle_range_t *GattcHandleRange::ToNative()
{
    ble_gattc_handle_range_t *handleRange = new ble_gattc_handle_range_t();

    handleRange->start_handle = ConversionUtility::getNativeUint16(jsobj, "start_handle");
    handleRange->end_handle = ConversionUtility::getNativeUint16(jsobj, "end_handle");

    return handleRange;
}

//
// GattcHandleRange -- END --
//

//
// GattcService -- START --
//

v8::Local<v8::Object> GattcService::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Utility::Set(obj, "uuid", BleUUID(&native->uuid).ToJs());
    Utility::Set(obj, "handle_range", GattcHandleRange(&native->handle_range).ToJs());

    return scope.Escape(obj);
}

//
// GattcService -- END --
//

//
// GattcIncludedService -- START --
//

v8::Local<v8::Object> GattcIncludedService::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Utility::Set(obj, "handle", native->handle);
    Utility::Set(obj, "included_srvc", GattcService(&native->included_srvc).ToJs());

    return scope.Escape(obj);
}

//
// GattcIncludedService -- END --
//

//
// GattcCharacteristic -- START --
//

v8::Local<v8::Object> GattcCharacteristic::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Utility::Set(obj, "uuid", BleUUID(&native->uuid).ToJs());
    Utility::Set(obj, "char_props", GattCharProps(&native->char_props).ToJs());
    Utility::Set(obj, "char_ext_props", native->char_ext_props);
    Utility::Set(obj, "handle_decl", native->handle_decl);
    Utility::Set(obj, "handle_value", native->handle_value);

    return scope.Escape(obj);
}

//
// GattcCharacteristic -- END --
//

//
// GattcDescriptor -- START --
//

v8::Local<v8::Object> GattcDescriptor::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Utility::Set(obj, "handle", native->handle);
    Utility::Set(obj, "uuid", BleUUID(&native->uuid).ToJs());

    return scope.Escape(obj);
}

//
// GattcDescriptor -- END --
//

//
// GattcWriteParameters -- START --
//

ble_gattc_write_params_t *GattcWriteParameters::ToNative()
{
    ble_gattc_write_params_t *writeparams = new ble_gattc_write_params_t();

    writeparams->write_op = ConversionUtility::getNativeUint8(jsobj, "write_op");
    writeparams->flags = ConversionUtility::getNativeUint8(jsobj, "flags");
    writeparams->handle = ConversionUtility::getNativeUint16(jsobj, "handle");
    writeparams->offset = ConversionUtility::getNativeUint16(jsobj, "offset");
    writeparams->len = ConversionUtility::getNativeUint16(jsobj, "len");
    writeparams->p_value = ConversionUtility::getNativePointerToUint8(jsobj, "p_value");

    return writeparams;
}

v8::Local<v8::Object> GattcWriteParameters::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Utility::Set(obj, "write_op", native->write_op);
    Utility::Set(obj, "flags", native->flags);
    Utility::Set(obj, "handle", native->handle);
    Utility::Set(obj, "offset", native->offset);
    Utility::Set(obj, "len", native->len);
    Utility::Set(obj, "p_value", ConversionUtility::toJsValueArray(native->p_value, native->len));

    return scope.Escape(obj);
}

//
// GattcWriteParameters -- END --
//

v8::Local<v8::Object> GattcPrimaryServiceDiscoveryEvent::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverGattcEvent::ToJs(obj);

    Utility::Set(obj, "count", evt->count);

    v8::Local<v8::Array> service_array = Nan::New<v8::Array>();

    for (int i = 0; i < evt->count; ++i)
    {
        service_array->Set(Nan::New<v8::Integer>(i), GattcService(&evt->services[i]));
    }

    Utility::Set(obj, "services", service_array);

    return scope.Escape(obj);
}

v8::Local<v8::Object> GattcRelationshipDiscoveryEvent::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverGattcEvent::ToJs(obj);

    Utility::Set(obj, "count", evt->count);

    v8::Local<v8::Array> includes_array = Nan::New<v8::Array>();

    for (int i = 0; i < evt->count; ++i)
    {
        includes_array->Set(Nan::New<v8::Integer>(i), GattcIncludedService(&evt->includes[i]));
    }

    Utility::Set(obj, "includes", includes_array);

    return scope.Escape(obj);
}

v8::Local<v8::Object> GattcCharacteristicDiscoveryEvent::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverGattcEvent::ToJs(obj);

    Utility::Set(obj, "count", evt->count);

    v8::Local<v8::Array> chars_array = Nan::New<v8::Array>();

    for (int i = 0; i < evt->count; ++i)
    {
        chars_array->Set(Nan::New<v8::Integer>(i), GattcCharacteristic(&evt->chars[i]));
    }

    Utility::Set(obj, "chars", chars_array);

    return scope.Escape(obj);
}

v8::Local<v8::Object> GattcDescriptorDiscoveryEvent::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverGattcEvent::ToJs(obj);

    Utility::Set(obj, "count", evt->count);

    v8::Local<v8::Array> descs_array = Nan::New<v8::Array>();

    for (int i = 0; i < evt->count; ++i)
    {
        descs_array->Set(Nan::New<v8::Integer>(i), GattcDescriptor(&evt->descs[i]));
    }

    Utility::Set(obj, "descs", descs_array);

    return scope.Escape(obj);
}

v8::Local<v8::Object> GattcHandleValue::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Utility::Set(obj, "handle", native->handle);
    Utility::Set(obj, "p_value", ConversionUtility::toJsValueArray(native->p_value, valueLength));

    return scope.Escape(obj);
}

v8::Local<v8::Object> GattcCharacteristicValueReadByUUIDEvent::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverGattcEvent::ToJs(obj);

    Utility::Set(obj, "count", evt->count);
    Utility::Set(obj, "value_len", evt->value_len);

    v8::Local<v8::Array> handle_value_array = Nan::New<v8::Array>();

    for (int i = 0; i < evt->count; ++i)
    {
        handle_value_array->Set(Nan::New<v8::Integer>(i), GattcHandleValue(&evt->handle_value[i], evt->value_len));
    }

    Utility::Set(obj, "handle_values", handle_value_array);

    return scope.Escape(obj);
}

v8::Local<v8::Object> GattcReadEvent::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverGattcEvent::ToJs(obj);

    Utility::Set(obj, "handle", evt->handle);
    Utility::Set(obj, "offset", evt->offset);
    Utility::Set(obj, "len", evt->len);
    Utility::Set(obj, "data", ConversionUtility::toJsValueArray(evt->data, evt->len));

    return scope.Escape(obj);
}

v8::Local<v8::Object> GattcCharacteristicValueReadEvent::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverGattcEvent::ToJs(obj);

    Utility::Set(obj, "len", evt->len);
    Utility::Set(obj, "values", ConversionUtility::toJsValueArray(evt->values, evt->len));

    return scope.Escape(obj);
}

v8::Local<v8::Object> GattcWriteEvent::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverGattcEvent::ToJs(obj);

    Utility::Set(obj, "handle", evt->handle);
    Utility::Set(obj, "write_op", evt->write_op);
    Utility::Set(obj, "offset", evt->offset);
    Utility::Set(obj, "len", evt->len);
    Utility::Set(obj, "data", ConversionUtility::toJsValueArray(evt->data, evt->len));

    return scope.Escape(obj);
}

v8::Local<v8::Object> GattcHandleValueNotificationEvent::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverGattcEvent::ToJs(obj);

    Utility::Set(obj, "handle", evt->handle);
    Utility::Set(obj, "type", evt->type);
    Utility::Set(obj, "len", evt->len);
    Utility::Set(obj, "data", ConversionUtility::toJsValueArray(evt->data, evt->len));

    return scope.Escape(obj);
}

v8::Local<v8::Object> GattcTimeoutEvent::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverGattcEvent::ToJs(obj);

    Utility::Set(obj, "src", evt->src);

    return scope.Escape(obj);
}

NAN_METHOD(PrimaryServicesDiscover)
{
    bool has_service_uuid = false;
    v8::Local<v8::Object> service_uuid;

    if (!info[0]->IsNumber())
    {
        Nan::ThrowTypeError("First argument must be a number");
        return;
    }
    uint16_t conn_handle = ConversionUtility::getNativeUint16(info[0]);

    if (!info[1]->IsNumber())
    {
        Nan::ThrowTypeError("Second argument must be a number");
        return;
    }
    uint16_t start_handle = ConversionUtility::getNativeUint16(info[1]);

    if (info[2]->IsObject())
    {
        has_service_uuid = true;
        service_uuid = info[2]->ToObject();
    }
    else if (!info[2]->IsNumber())
    {
        Nan::ThrowTypeError("Third argument must be a object or number 0");
        return;
    }

    if (!info[3]->IsFunction())
    {
        Nan::ThrowTypeError("Forth argument must be a function");
        return;
    }
    v8::Local<v8::Function> callback = info[3].As<v8::Function>();

    GattcPrimaryServicesDiscoverBaton *baton = new GattcPrimaryServicesDiscoverBaton(callback);
    baton->conn_handle = conn_handle;
    baton->start_handle = start_handle;
    if (has_service_uuid)
    {
        baton->p_srvc_uuid = BleUUID(service_uuid);
    }
    else
    {
        baton->p_srvc_uuid = 0;
    }

    uv_queue_work(uv_default_loop(), baton->req, PrimaryServicesDiscover, (uv_after_work_cb)AfterPrimaryServicesDiscover);

    // TODO: generate a generic function to handle return code from the SD. If not NRF_SUCCESS, raise an exception.
    return;
}

// This runs in a worker thread (not Main Thread)
void PrimaryServicesDiscover(uv_work_t *req) {
    // TODO: handle if .Close is called before this function is called.
    GattcPrimaryServicesDiscoverBaton *baton = static_cast<GattcPrimaryServicesDiscoverBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gattc_primary_services_discover(baton->conn_handle, baton->start_handle, baton->p_srvc_uuid);
}

// This runs in Main Thread
void AfterPrimaryServicesDiscover(uv_work_t *req) {
	Nan::HandleScope scope;

    GattcPrimaryServicesDiscoverBaton *baton = static_cast<GattcPrimaryServicesDiscoverBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "starting service discovery");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    baton->callback->Call(1, argv);
    LOGLINE_START("delete baton");

   //delete baton;

    LOGLINE_END("delete baton");
}


NAN_METHOD(RelationshipDiscover)
{
    if (!info[0]->IsNumber())
    {
        Nan::ThrowTypeError("First argument must be a number");
        return;
    }
    uint16_t conn_handle = ConversionUtility::getNativeUint16(info[0]);

    if (!info[1]->IsObject())
    {
        Nan::ThrowTypeError("Second argument must be a object");
        return;
    }
    v8::Local<v8::Object> handle_range = info[1]->ToObject();

    if (!info[2]->IsFunction())
    {
        Nan::ThrowTypeError("Third argument must be a function");
        return;
    }
    v8::Local<v8::Function> callback = info[2].As<v8::Function>();

    GattcRelationshipDiscoverBaton *baton = new GattcRelationshipDiscoverBaton(callback);
    baton->conn_handle = conn_handle;
    baton->p_handle_range = GattcHandleRange(handle_range);

    uv_queue_work(uv_default_loop(), baton->req, RelationshipDiscover, (uv_after_work_cb)AfterRelationshipDiscover);

    // TODO: generate a generic function to handle return code from the SD. If not NRF_SUCCESS, raise an exception.
    return;
}

// This runs in a worker thread (not Main Thread)
void RelationshipDiscover(uv_work_t *req) {
    // TODO: handle if .Close is called before this function is called.
    GattcRelationshipDiscoverBaton *baton = static_cast<GattcRelationshipDiscoverBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gattc_relationships_discover(baton->conn_handle, baton->p_handle_range);
}

// This runs in Main Thread
void AfterRelationshipDiscover(uv_work_t *req) {
	Nan::HandleScope scope;

    GattcRelationshipDiscoverBaton *baton = static_cast<GattcRelationshipDiscoverBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "starting relationship discovery");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    baton->callback->Call(1, argv);
    LOGLINE_START("delete baton");

   //delete baton;

    LOGLINE_END("delete baton");
}


NAN_METHOD(CharacteristicsDiscover)
{
    if (!info[0]->IsNumber())
    {
        Nan::ThrowTypeError("First argument must be a number");
        return;
    }
    uint16_t conn_handle = ConversionUtility::getNativeUint16(info[0]);

    if (!info[1]->IsObject())
    {
        Nan::ThrowTypeError("Second argument must be a object");
        return;
    }
    v8::Local<v8::Object> handle_range = info[1]->ToObject();

    if (!info[2]->IsFunction())
    {
        Nan::ThrowTypeError("Third argument must be a function");
        return;
    }
    v8::Local<v8::Function> callback = info[2].As<v8::Function>();

    GattcCharacteristicsDiscoverBaton *baton = new GattcCharacteristicsDiscoverBaton(callback);
    baton->conn_handle = conn_handle;
    baton->p_handle_range = GattcHandleRange(handle_range);

    uv_queue_work(uv_default_loop(), baton->req, CharacteristicsDiscover, (uv_after_work_cb)AfterCharacteristicsDiscover);

    // TODO: generate a generic function to handle return code from the SD. If not NRF_SUCCESS, raise an exception.
    return;
}

// This runs in a worker thread (not Main Thread)
void CharacteristicsDiscover(uv_work_t *req) {
    // TODO: handle if .Close is called before this function is called.
    GattcCharacteristicsDiscoverBaton *baton = static_cast<GattcCharacteristicsDiscoverBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gattc_characteristics_discover(baton->conn_handle, baton->p_handle_range);
}

// This runs in Main Thread
void AfterCharacteristicsDiscover(uv_work_t *req) {
	Nan::HandleScope scope;

    GattcCharacteristicsDiscoverBaton *baton = static_cast<GattcCharacteristicsDiscoverBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "starting characteristic discovery");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    baton->callback->Call(1, argv);
    LOGLINE_START("delete baton");

   //delete baton;

    LOGLINE_END("delete baton");
}


NAN_METHOD(DescriptorsDiscover)
{
    if (!info[0]->IsNumber())
    {
        Nan::ThrowTypeError("First argument must be a number");
        return;
    }
    uint16_t conn_handle = ConversionUtility::getNativeUint16(info[0]);

    if (!info[1]->IsObject())
    {
        Nan::ThrowTypeError("Second argument must be a object");
        return;
    }
    v8::Local<v8::Object> handle_range = info[1]->ToObject();

    if (!info[2]->IsFunction())
    {
        Nan::ThrowTypeError("Third argument must be a function");
        return;
    }
    v8::Local<v8::Function> callback = info[2].As<v8::Function>();

    GattcDescriptorsDiscoverBaton *baton = new GattcDescriptorsDiscoverBaton(callback);
    baton->conn_handle = conn_handle;
    baton->p_handle_range = GattcHandleRange(handle_range);

    uv_queue_work(uv_default_loop(), baton->req, DescriptorsDiscover, (uv_after_work_cb)AfterDescriptorsDiscover);

    // TODO: generate a generic function to handle return code from the SD. If not NRF_SUCCESS, raise an exception.
    return;
}

// This runs in a worker thread (not Main Thread)
void DescriptorsDiscover(uv_work_t *req) {
    // TODO: handle if .Close is called before this function is called.
    GattcDescriptorsDiscoverBaton *baton = static_cast<GattcDescriptorsDiscoverBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gattc_descriptors_discover(baton->conn_handle, baton->p_handle_range);
}

// This runs in Main Thread
void AfterDescriptorsDiscover(uv_work_t *req) {
	Nan::HandleScope scope;

    GattcDescriptorsDiscoverBaton *baton = static_cast<GattcDescriptorsDiscoverBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "starting descriptor discovery");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    baton->callback->Call(1, argv);
    LOGLINE_START("delete baton");

   //delete baton;

    LOGLINE_END("delete baton");
}


NAN_METHOD(CharacteristicValueByUUIDRead)
{
    if (!info[0]->IsNumber())
    {
        Nan::ThrowTypeError("First argument must be a number");
        return;
    }
    uint16_t conn_handle = ConversionUtility::getNativeUint16(info[0]);

    if (!info[1]->IsObject())
    {
        Nan::ThrowTypeError("Second argument must be a object");
        return;
    }
    v8::Local<v8::Object> uuid = info[1]->ToObject();

    if (!info[2]->IsObject())
    {
        Nan::ThrowTypeError("Third argument must be a object");
        return;
    }
    v8::Local<v8::Object> handle_range = info[2]->ToObject();


    if (!info[3]->IsFunction())
    {
        Nan::ThrowTypeError("Forth argument must be a function");
        return;
    }
    v8::Local<v8::Function> callback = info[3].As<v8::Function>();

    GattcCharacteristicByUUIDReadBaton *baton = new GattcCharacteristicByUUIDReadBaton(callback);
    baton->conn_handle = conn_handle;
    baton->p_uuid = BleUUID(uuid);
    baton->p_handle_range = GattcHandleRange(handle_range);

    uv_queue_work(uv_default_loop(), baton->req, CharacteristicValueByUUIDRead, (uv_after_work_cb)AfterCharacteristicValueByUUIDRead);

    // TODO: generate a generic function to handle return code from the SD. If not NRF_SUCCESS, raise an exception.
    return;
}

// This runs in a worker thread (not Main Thread)
void CharacteristicValueByUUIDRead(uv_work_t *req) {
    // TODO: handle if .Close is called before this function is called.
    GattcCharacteristicByUUIDReadBaton *baton = static_cast<GattcCharacteristicByUUIDReadBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gattc_char_value_by_uuid_read(baton->conn_handle, baton->p_uuid, baton->p_handle_range);
}

// This runs in Main Thread
void AfterCharacteristicValueByUUIDRead(uv_work_t *req) {
	Nan::HandleScope scope;

    GattcCharacteristicByUUIDReadBaton *baton = static_cast<GattcCharacteristicByUUIDReadBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "starting reading characteristics by UUID");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    baton->callback->Call(1, argv);
    LOGLINE_START("delete baton");

   //delete baton;

    LOGLINE_END("delete baton");
}


NAN_METHOD(Read)
{
    if (!info[0]->IsNumber())
    {
        Nan::ThrowTypeError("First argument must be a number");
        return;
    }
    uint16_t conn_handle = ConversionUtility::getNativeUint16(info[0]);

    if (!info[1]->IsNumber())
    {
        Nan::ThrowTypeError("Second argument must be a number");
        return;
    }
    uint16_t handle = ConversionUtility::getNativeUint16(info[1]);

    if (!info[2]->IsNumber())
    {
        Nan::ThrowTypeError("Third argument must be a number");
        return;
    }
    uint16_t offset = ConversionUtility::getNativeUint16(info[2]);


    if (!info[3]->IsFunction())
    {
        Nan::ThrowTypeError("Forth argument must be a function");
        return;
    }
    v8::Local<v8::Function> callback = info[3].As<v8::Function>();

    GattcReadBaton *baton = new GattcReadBaton(callback);
    baton->conn_handle = conn_handle;
    baton->handle = handle;
    baton->offset = offset;

    uv_queue_work(uv_default_loop(), baton->req, Read, (uv_after_work_cb)AfterRead);

    // TODO: generate a generic function to handle return code from the SD. If not NRF_SUCCESS, raise an exception.
    return;
}

// This runs in a worker thread (not Main Thread)
void Read(uv_work_t *req) {
    // TODO: handle if .Close is called before this function is called.
    GattcReadBaton *baton = static_cast<GattcReadBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gattc_read(baton->conn_handle, baton->handle, baton->offset);
}

// This runs in Main Thread
void AfterRead(uv_work_t *req) {
	Nan::HandleScope scope;

    GattcReadBaton *baton = static_cast<GattcReadBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "starting reading characteristics by UUID");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    baton->callback->Call(1, argv);
    LOGLINE_START("delete baton");

   //delete baton;

    LOGLINE_END("delete baton");
}

NAN_METHOD(CharacteristicValuesRead)
{
    if (!info[0]->IsNumber())
    {
        Nan::ThrowTypeError("First argument must be a number");
        return;
    }
    uint16_t conn_handle = ConversionUtility::getNativeUint16(info[0]);

    if (!info[1]->IsObject())
    {
        Nan::ThrowTypeError("Second argument must be a object");
        return;
    }
    v8::Local<v8::Object> handles = info[1]->ToObject();

    if (!info[2]->IsNumber())
    {
        Nan::ThrowTypeError("Third argument must be a number");
        return;
    }
    uint16_t handle_count = ConversionUtility::getNativeUint16(info[2]);

    if (!info[3]->IsFunction())
    {
        Nan::ThrowTypeError("Forth argument must be a function");
        return;
    }
    v8::Local<v8::Function> callback = info[3].As<v8::Function>();

    uint16_t *p_handles = (uint16_t *)malloc(sizeof(uint16_t) * handle_count);

    for (int i = 0; i < handle_count; ++i)
    {
        p_handles[i] = ConversionUtility::getNativeUint16(handles->Get(Nan::New<v8::Number>(i)));
    }

    GattcCharacteristicValuesReadBaton *baton = new GattcCharacteristicValuesReadBaton(callback);
    baton->conn_handle = conn_handle;
    baton->p_handles = p_handles;
    baton->handle_count = handle_count;

    uv_queue_work(uv_default_loop(), baton->req, CharacteristicValuesRead, (uv_after_work_cb)AfterCharacteristicValuesRead);

    // TODO: generate a generic function to handle return code from the SD. If not NRF_SUCCESS, raise an exception.
    return;
}

// This runs in a worker thread (not Main Thread)
void CharacteristicValuesRead(uv_work_t *req) {
    // TODO: handle if .Close is called before this function is called.
    GattcCharacteristicValuesReadBaton *baton = static_cast<GattcCharacteristicValuesReadBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gattc_char_values_read(baton->conn_handle, baton->p_handles, baton->handle_count);

    LOGLINE_START("baton->p_handles");
    //free(baton->p_handles);
    LOGLINE_END("baton->p_handles");
}

// This runs in Main Thread
void AfterCharacteristicValuesRead(uv_work_t *req) {
	Nan::HandleScope scope;

    GattcCharacteristicValuesReadBaton *baton = static_cast<GattcCharacteristicValuesReadBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "starting reading characteristics values");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    baton->callback->Call(1, argv);
    LOGLINE_START("delete baton");

   //delete baton;

    LOGLINE_END("delete baton");
}


NAN_METHOD(Write)
{
    if (!info[0]->IsNumber())
    {
        Nan::ThrowTypeError("First argument must be a number");
        return;
    }
    uint16_t conn_handle = ConversionUtility::getNativeUint16(info[0]);

    if (!info[1]->IsObject())
    {
        Nan::ThrowTypeError("Second argument must be a object");
        return;
    }
    v8::Local<v8::Object> p_write_params = info[1]->ToObject();

    if (!info[2]->IsFunction())
    {
        Nan::ThrowTypeError("Third argument must be a function");
        return;
    }
    v8::Local<v8::Function> callback = info[2].As<v8::Function>();

    GattcWriteBaton *baton = new GattcWriteBaton(callback);
    baton->conn_handle = conn_handle;
    baton->p_write_params = GattcWriteParameters(p_write_params);

    uv_queue_work(uv_default_loop(), baton->req, Write, (uv_after_work_cb)AfterWrite);

    // TODO: generate a generic function to handle return code from the SD. If not NRF_SUCCESS, raise an exception.
    return;
}

// This runs in a worker thread (not Main Thread)
void Write(uv_work_t *req) {
    // TODO: handle if .Close is called before this function is called.
    GattcWriteBaton *baton = static_cast<GattcWriteBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gattc_write(baton->conn_handle, baton->p_write_params);
}

// This runs in Main Thread
void AfterWrite(uv_work_t *req) {
	Nan::HandleScope scope;

    GattcWriteBaton *baton = static_cast<GattcWriteBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "writing");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    baton->callback->Call(1, argv);
    LOGLINE_START("delete baton");

   //delete baton;

    LOGLINE_END("delete baton");
}


NAN_METHOD(HandleValueConfirm)
{
    if (!info[0]->IsNumber())
    {
        Nan::ThrowTypeError("First argument must be a number");
        return;
    }
    uint16_t conn_handle = ConversionUtility::getNativeUint16(info[0]);

    if (!info[1]->IsNumber())
    {
        Nan::ThrowTypeError("Second argument must be a number");
        return;
    }
    uint16_t handle = ConversionUtility::getNativeUint16(info[1]);

    if (!info[2]->IsFunction())
    {
        Nan::ThrowTypeError("Third argument must be a function");
        return;
    }
    v8::Local<v8::Function> callback = info[2].As<v8::Function>();

    GattcHandleValueConfirmBaton *baton = new GattcHandleValueConfirmBaton(callback);
    baton->conn_handle = conn_handle;
    baton->handle = handle;

    uv_queue_work(uv_default_loop(), baton->req, HandleValueConfirm, (uv_after_work_cb)AfterHandleValueConfirm);

    // TODO: generate a generic function to handle return code from the SD. If not NRF_SUCCESS, raise an exception.
    return;
}

// This runs in a worker thread (not Main Thread)
void HandleValueConfirm(uv_work_t *req) {
    // TODO: handle if .Close is called before this function is called.
    GattcHandleValueConfirmBaton *baton = static_cast<GattcHandleValueConfirmBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gattc_hv_confirm(baton->conn_handle, baton->handle);
}

// This runs in Main Thread
void AfterHandleValueConfirm(uv_work_t *req) {
	Nan::HandleScope scope;

    GattcHandleValueConfirmBaton *baton = static_cast<GattcHandleValueConfirmBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "confirming handle value");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    baton->callback->Call(1, argv);
    LOGLINE_START("delete baton");

   //delete baton;

    LOGLINE_END("delete baton");
}

extern "C" {
    void init_gattc(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target)
    {
        Utility::SetMethod(target, "gattc_primary_services_discover", PrimaryServicesDiscover);
        Utility::SetMethod(target, "gattc_releationships_discover", RelationshipDiscover);
        Utility::SetMethod(target, "gattc_characteristic_discover", CharacteristicsDiscover);
        Utility::SetMethod(target, "gattc_descriptor_discover", DescriptorsDiscover);
        Utility::SetMethod(target, "gattc_read_characteriscicvalue_by_uuid", CharacteristicValueByUUIDRead);
        Utility::SetMethod(target, "gattc_read", Read);
        Utility::SetMethod(target, "gattc_read_characteriscicvalue", CharacteristicValuesRead);
        Utility::SetMethod(target, "gattc_write", Write);
        Utility::SetMethod(target, "gattc_confirm_handle_value", HandleValueConfirm);

        /* BLE_ERRORS_GATTC SVC return values specific to GATTC */
        NODE_DEFINE_CONSTANT(target, BLE_ERROR_GATTC_PROC_NOT_PERMITTED);

        /* Last Attribute Handle. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTC_HANDLE_END);

        NODE_DEFINE_CONSTANT(target, SD_BLE_GATTC_PRIMARY_SERVICES_DISCOVER);                      /**< Primary Service Discovery. */
        NODE_DEFINE_CONSTANT(target, SD_BLE_GATTC_RELATIONSHIPS_DISCOVER);                         /**< Relationship Discovery. */
        NODE_DEFINE_CONSTANT(target, SD_BLE_GATTC_CHARACTERISTICS_DISCOVER);                       /**< Characteristic Discovery. */
        NODE_DEFINE_CONSTANT(target, SD_BLE_GATTC_DESCRIPTORS_DISCOVER);                           /**< Characteristic Descriptor Discovery. */
        NODE_DEFINE_CONSTANT(target, SD_BLE_GATTC_CHAR_VALUE_BY_UUID_READ);                        /**< Read Characteristic Value by UUID. */
        NODE_DEFINE_CONSTANT(target, SD_BLE_GATTC_READ);                                           /**< Generic read. */
        NODE_DEFINE_CONSTANT(target, SD_BLE_GATTC_CHAR_VALUES_READ);                               /**< Read multiple Characteristic Values. */
        NODE_DEFINE_CONSTANT(target, SD_BLE_GATTC_WRITE);                                          /**< Generic write. */
        NODE_DEFINE_CONSTANT(target, SD_BLE_GATTC_HV_CONFIRM);                                     /**< Handle Value Confirmation. */

        NODE_DEFINE_CONSTANT(target, BLE_GATTC_EVT_PRIM_SRVC_DISC_RSP);                       /**< Primary Service Discovery Response event. @ref ble_gattc_evt_prim_srvc_disc_rsp_t */
        NODE_DEFINE_CONSTANT(target, BLE_GATTC_EVT_REL_DISC_RSP);                             /**< Relationship Discovery Response event. @ref ble_gattc_evt_rel_disc_rsp_t */
        NODE_DEFINE_CONSTANT(target, BLE_GATTC_EVT_CHAR_DISC_RSP);                            /**< Characteristic Discovery Response event. @ref ble_gattc_evt_char_disc_rsp_t */
        NODE_DEFINE_CONSTANT(target, BLE_GATTC_EVT_DESC_DISC_RSP);                            /**< Descriptor Discovery Response event. @ref ble_gattc_evt_desc_disc_rsp_t */
        NODE_DEFINE_CONSTANT(target, BLE_GATTC_EVT_CHAR_VAL_BY_UUID_READ_RSP);                /**< Read By UUID Response event. @ref ble_gattc_evt_char_val_by_uuid_read_rsp_t */
        NODE_DEFINE_CONSTANT(target, BLE_GATTC_EVT_READ_RSP);                                 /**< Read Response event. @ref ble_gattc_evt_read_rsp_t */
        NODE_DEFINE_CONSTANT(target, BLE_GATTC_EVT_CHAR_VALS_READ_RSP);                       /**< Read multiple Response event. @ref ble_gattc_evt_char_vals_read_rsp_t */
        NODE_DEFINE_CONSTANT(target, BLE_GATTC_EVT_WRITE_RSP);                                /**< Write Response event. @ref ble_gattc_evt_write_rsp_t */
        NODE_DEFINE_CONSTANT(target, BLE_GATTC_EVT_HVX);                                      /**< Handle Value Notification or Indication event. @ref ble_gattc_evt_hvx_t */
        NODE_DEFINE_CONSTANT(target, BLE_GATTC_EVT_TIMEOUT);                                  /**< Timeout event. @ref ble_gattc_evt_timeout_t */
    }
}
