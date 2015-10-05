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
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Nan::Set(obj, Nan::New("start_handle").ToLocalChecked(), ConversionUtility::toJsNumber(native->start_handle));
    Nan::Set(obj, Nan::New("end_handle").ToLocalChecked(), ConversionUtility::toJsNumber(native->end_handle));

    return obj;
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
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Nan::Set(obj, Nan::New("uuid").ToLocalChecked(), BleUUID(&native->uuid));
    Nan::Set(obj, Nan::New("handle_range").ToLocalChecked(), GattcHandleRange(&native->handle_range));

    return obj;
}

//
// GattcService -- END --
//

//
// GattcIncludedService -- START --
//

v8::Local<v8::Object> GattcIncludedService::ToJs()
{
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Nan::Set(obj, Nan::New("handle").ToLocalChecked(), ConversionUtility::toJsNumber(native->handle));
    Nan::Set(obj, Nan::New("included_srvc").ToLocalChecked(), GattcService(&native->included_srvc));

    return obj;
}

//
// GattcIncludedService -- END --
//

//
// GattcCharacteristic -- START --
//

v8::Local<v8::Object> GattcCharacteristic::ToJs()
{
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Nan::Set(obj, Nan::New("uuid").ToLocalChecked(), BleUUID(&native->uuid));
    Nan::Set(obj, Nan::New("char_props").ToLocalChecked(), GattCharProps(&native->char_props));
    Nan::Set(obj, Nan::New("char_ext_props").ToLocalChecked(), ConversionUtility::toJsBool(native->char_ext_props));
    Nan::Set(obj, Nan::New("handle_decl").ToLocalChecked(), ConversionUtility::toJsNumber(native->handle_decl));
    Nan::Set(obj, Nan::New("handle_value").ToLocalChecked(), ConversionUtility::toJsNumber(native->handle_value));

    return obj;
}

//
// GattcCharacteristic -- END --
//

//
// GattcDescriptor -- START --
//

v8::Local<v8::Object> GattcDescriptor::ToJs()
{
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Nan::Set(obj, Nan::New("handle").ToLocalChecked(), ConversionUtility::toJsNumber(native->handle));
    Nan::Set(obj, Nan::New("uuid").ToLocalChecked(), BleUUID(&native->uuid));

    return obj;
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
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Nan::Set(obj, Nan::New("write_op").ToLocalChecked(), ConversionUtility::toJsNumber(native->write_op));
    Nan::Set(obj, Nan::New("flags").ToLocalChecked(), ConversionUtility::toJsNumber(native->flags));
    Nan::Set(obj, Nan::New("handle").ToLocalChecked(), ConversionUtility::toJsNumber(native->handle));
    Nan::Set(obj, Nan::New("offset").ToLocalChecked(), ConversionUtility::toJsNumber(native->offset));
    Nan::Set(obj, Nan::New("len").ToLocalChecked(), ConversionUtility::toJsNumber(native->len));
    Nan::Set(obj, Nan::New("p_value").ToLocalChecked(), ConversionUtility::toJsValueArray(native->p_value, native->len));

    return obj;
}

//
// GattcWriteParameters -- END --
//

v8::Local<v8::Object> GattcPrimaryServiceDiscoveryEvent::ToJs()
{
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverGattcEvent::ToJs(obj);

    Nan::Set(obj, Nan::New("count").ToLocalChecked(), ConversionUtility::toJsNumber(evt->count));

    v8::Local<v8::Array> service_array = Nan::New<v8::Array>();

    for (int i = 0; i < evt->count; ++i)
    {
        service_array->Set(Nan::New<v8::Integer>(i), GattcService(&evt->services[i]));
    }

    Nan::Set(obj, Nan::New("services").ToLocalChecked(), service_array);

    return obj;
}

v8::Local<v8::Object> GattcRelationshipDiscoveryEvent::ToJs()
{
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverGattcEvent::ToJs(obj);

    Nan::Set(obj, Nan::New("count").ToLocalChecked(), ConversionUtility::toJsNumber(evt->count));

    v8::Local<v8::Array> includes_array = Nan::New<v8::Array>();

    for (int i = 0; i < evt->count; ++i)
    {
        includes_array->Set(Nan::New<v8::Integer>(i), GattcIncludedService(&evt->includes[i]));
    }

    Nan::Set(obj, Nan::New("includes").ToLocalChecked(), includes_array);

    return obj;
}

v8::Local<v8::Object> GattcCharacteristicDiscoveryEvent::ToJs()
{
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverGattcEvent::ToJs(obj);

    Nan::Set(obj, Nan::New("count").ToLocalChecked(), ConversionUtility::toJsNumber(evt->count));

    v8::Local<v8::Array> chars_array = Nan::New<v8::Array>();

    for (int i = 0; i < evt->count; ++i)
    {
        chars_array->Set(Nan::New<v8::Integer>(i), GattcCharacteristic(&evt->chars[i]));
    }

    Nan::Set(obj, Nan::New("chars").ToLocalChecked(), chars_array);

    return obj;
}

v8::Local<v8::Object> GattcDescriptorDiscoveryEvent::ToJs()
{
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverGattcEvent::ToJs(obj);

    Nan::Set(obj, Nan::New("count").ToLocalChecked(), ConversionUtility::toJsNumber(evt->count));

    v8::Local<v8::Array> descs_array = Nan::New<v8::Array>();

    for (int i = 0; i < evt->count; ++i)
    {
        descs_array->Set(Nan::New<v8::Integer>(i), GattcDescriptor(&evt->descs[i]));
    }

    Nan::Set(obj, Nan::New("descs").ToLocalChecked(), descs_array);

    return obj;
}

v8::Local<v8::Object> GattcHandleValue::ToJs()
{
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Nan::Set(obj, Nan::New("handle").ToLocalChecked(), ConversionUtility::toJsNumber(native->handle));
    Nan::Set(obj, Nan::New("p_value").ToLocalChecked(), ConversionUtility::toJsValueArray(native->p_value, valueLength));

    return obj;
}

v8::Local<v8::Object> GattcCharacteristicValueReadByUUIDEvent::ToJs()
{
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverGattcEvent::ToJs(obj);

    Nan::Set(obj, Nan::New("count").ToLocalChecked(), ConversionUtility::toJsNumber(evt->count));
    Nan::Set(obj, Nan::New("value_len").ToLocalChecked(), ConversionUtility::toJsNumber(evt->value_len));

    v8::Local<v8::Array> handle_value_array = Nan::New<v8::Array>();

    for (int i = 0; i < evt->count; ++i)
    {
        handle_value_array->Set(Nan::New<v8::Integer>(i), GattcHandleValue(&evt->handle_value[i], evt->value_len));
    }

    Nan::Set(obj, Nan::New("handle_values").ToLocalChecked(), handle_value_array);

    return obj;
}

v8::Local<v8::Object> GattcReadEvent::ToJs()
{
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverGattcEvent::ToJs(obj);

    Nan::Set(obj, Nan::New("handle").ToLocalChecked(), ConversionUtility::toJsNumber(evt->handle));
    Nan::Set(obj, Nan::New("offset").ToLocalChecked(), ConversionUtility::toJsNumber(evt->offset));
    Nan::Set(obj, Nan::New("len").ToLocalChecked(), ConversionUtility::toJsNumber(evt->len));
    Nan::Set(obj, Nan::New("data").ToLocalChecked(), ConversionUtility::toJsValueArray(evt->data, evt->len));

    return obj;
}

v8::Local<v8::Object> GattcCharacteristicValueReadEvent::ToJs()
{
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverGattcEvent::ToJs(obj);

    Nan::Set(obj, Nan::New("len").ToLocalChecked(), ConversionUtility::toJsNumber(evt->len));
    Nan::Set(obj, Nan::New("values").ToLocalChecked(), ConversionUtility::toJsValueArray(evt->values, evt->len));

    return obj;
}

v8::Local<v8::Object> GattcWriteEvent::ToJs()
{
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverGattcEvent::ToJs(obj);

    Nan::Set(obj, Nan::New("handle").ToLocalChecked(), ConversionUtility::toJsNumber(evt->handle));
    Nan::Set(obj, Nan::New("write_op").ToLocalChecked(), ConversionUtility::toJsNumber(evt->write_op));
    Nan::Set(obj, Nan::New("offset").ToLocalChecked(), ConversionUtility::toJsNumber(evt->offset));
    Nan::Set(obj, Nan::New("len").ToLocalChecked(), ConversionUtility::toJsNumber(evt->len));
    Nan::Set(obj, Nan::New("data").ToLocalChecked(), ConversionUtility::toJsValueArray(evt->data, evt->len));

    return obj;
}

v8::Local<v8::Object> GattcHandleValueNotificationEvent::ToJs()
{
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverGattcEvent::ToJs(obj);

    Nan::Set(obj, Nan::New("handle").ToLocalChecked(), ConversionUtility::toJsNumber(evt->handle));
    Nan::Set(obj, Nan::New("type").ToLocalChecked(), ConversionUtility::toJsNumber(evt->type));
    Nan::Set(obj, Nan::New("len").ToLocalChecked(), ConversionUtility::toJsNumber(evt->len));
    Nan::Set(obj, Nan::New("data").ToLocalChecked(), ConversionUtility::toJsValueArray(evt->data, evt->len));

    return obj;
}

v8::Local<v8::Object> GattcTimeoutEvent::ToJs()
{
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverGattcEvent::ToJs(obj);

    Nan::Set(obj, Nan::New("src").ToLocalChecked(), ConversionUtility::toJsNumber(evt->src));

    return obj;
}

NAN_METHOD(PrimaryServicesDiscover)
{
    NanScope();

    bool has_service_uuid = false;
    v8::Local<v8::Object> service_uuid;

    if (!args[0]->IsNumber())
    {
        NanThrowTypeError("First argument must be a number");
        NanReturnUndefined();
    }
    uint16_t conn_handle = ConversionUtility::getNativeUint16(args[0]);

    if (!args[1]->IsNumber())
    {
        NanThrowTypeError("Second argument must be a number");
        NanReturnUndefined();
    }
    uint16_t start_handle = ConversionUtility::getNativeUint16(args[1]);

    if (args[2]->IsObject())
    {
        has_service_uuid = true;
        service_uuid = args[2]->ToObject();
    }
    else if (!args[2]->IsNumber())
    {
        NanThrowTypeError("Third argument must be a object or number 0");
        NanReturnUndefined();
    }

    if (!args[3]->IsFunction())
    {
        NanThrowTypeError("Forth argument must be a function");
        NanReturnUndefined();
    }
    v8::Local<v8::Function> callback = args[3].As<v8::Function>();

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
    NanReturnUndefined();
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
    NanScope();

    // TODO: handle if .Close is called before this function is called.
    GattcPrimaryServicesDiscoverBaton *baton = static_cast<GattcPrimaryServicesDiscoverBaton *>(req->data);
    v8::Handle<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "starting service discovery");
    }
    else
    {
        argv[0] = NanUndefined();
    }

    baton->callback->Call(1, argv);
    delete baton;
}


NAN_METHOD(RelationshipDiscover)
{
    NanScope();

    if (!args[0]->IsNumber())
    {
        NanThrowTypeError("First argument must be a number");
        NanReturnUndefined();
    }
    uint16_t conn_handle = ConversionUtility::getNativeUint16(args[0]);

    if (!args[1]->IsObject())
    {
        NanThrowTypeError("Second argument must be a object");
        NanReturnUndefined();
    }
    v8::Local<v8::Object> handle_range = args[1]->ToObject();

    if (!args[2]->IsFunction())
    {
        NanThrowTypeError("Third argument must be a function");
        NanReturnUndefined();
    }
    v8::Local<v8::Function> callback = args[2].As<v8::Function>();

    GattcRelationshipDiscoverBaton *baton = new GattcRelationshipDiscoverBaton(callback);
    baton->conn_handle = conn_handle;
    baton->p_handle_range = GattcHandleRange(handle_range);

    uv_queue_work(uv_default_loop(), baton->req, RelationshipDiscover, (uv_after_work_cb)AfterRelationshipDiscover);

    // TODO: generate a generic function to handle return code from the SD. If not NRF_SUCCESS, raise an exception.
    NanReturnUndefined();
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
    NanScope();

    // TODO: handle if .Close is called before this function is called.
    GattcRelationshipDiscoverBaton *baton = static_cast<GattcRelationshipDiscoverBaton *>(req->data);
    v8::Handle<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "starting relationship discovery");
    }
    else
    {
        argv[0] = NanUndefined();
    }

    baton->callback->Call(1, argv);
    delete baton;
}


NAN_METHOD(CharacteristicsDiscover)
{
    NanScope();

    if (!args[0]->IsNumber())
    {
        NanThrowTypeError("First argument must be a number");
        NanReturnUndefined();
    }
    uint16_t conn_handle = ConversionUtility::getNativeUint16(args[0]);

    if (!args[1]->IsObject())
    {
        NanThrowTypeError("Second argument must be a object");
        NanReturnUndefined();
    }
    v8::Local<v8::Object> handle_range = args[1]->ToObject();

    if (!args[2]->IsFunction())
    {
        NanThrowTypeError("Third argument must be a function");
        NanReturnUndefined();
    }
    v8::Local<v8::Function> callback = args[2].As<v8::Function>();

    GattcCharacteristicsDiscoverBaton *baton = new GattcCharacteristicsDiscoverBaton(callback);
    baton->conn_handle = conn_handle;
    baton->p_handle_range = GattcHandleRange(handle_range);

    uv_queue_work(uv_default_loop(), baton->req, CharacteristicsDiscover, (uv_after_work_cb)AfterCharacteristicsDiscover);

    // TODO: generate a generic function to handle return code from the SD. If not NRF_SUCCESS, raise an exception.
    NanReturnUndefined();
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
    NanScope();

    // TODO: handle if .Close is called before this function is called.
    GattcCharacteristicsDiscoverBaton *baton = static_cast<GattcCharacteristicsDiscoverBaton *>(req->data);
    v8::Handle<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "starting characteristic discovery");
    }
    else
    {
        argv[0] = NanUndefined();
    }

    baton->callback->Call(1, argv);
    delete baton;
}


NAN_METHOD(DescriptorsDiscover)
{
    NanScope();

    if (!args[0]->IsNumber())
    {
        NanThrowTypeError("First argument must be a number");
        NanReturnUndefined();
    }
    uint16_t conn_handle = ConversionUtility::getNativeUint16(args[0]);

    if (!args[1]->IsObject())
    {
        NanThrowTypeError("Second argument must be a object");
        NanReturnUndefined();
    }
    v8::Local<v8::Object> handle_range = args[1]->ToObject();

    if (!args[2]->IsFunction())
    {
        NanThrowTypeError("Third argument must be a function");
        NanReturnUndefined();
    }
    v8::Local<v8::Function> callback = args[2].As<v8::Function>();

    GattcDescriptorsDiscoverBaton *baton = new GattcDescriptorsDiscoverBaton(callback);
    baton->conn_handle = conn_handle;
    baton->p_handle_range = GattcHandleRange(handle_range);

    uv_queue_work(uv_default_loop(), baton->req, DescriptorsDiscover, (uv_after_work_cb)AfterDescriptorsDiscover);

    // TODO: generate a generic function to handle return code from the SD. If not NRF_SUCCESS, raise an exception.
    NanReturnUndefined();
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
    NanScope();

    // TODO: handle if .Close is called before this function is called.
    GattcDescriptorsDiscoverBaton *baton = static_cast<GattcDescriptorsDiscoverBaton *>(req->data);
    v8::Handle<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "starting descriptor discovery");
    }
    else
    {
        argv[0] = NanUndefined();
    }

    baton->callback->Call(1, argv);
    delete baton;
}


NAN_METHOD(CharacteristicValueByUUIDRead)
{
    NanScope();

    if (!args[0]->IsNumber())
    {
        NanThrowTypeError("First argument must be a number");
        NanReturnUndefined();
    }
    uint16_t conn_handle = ConversionUtility::getNativeUint16(args[0]);

    if (!args[1]->IsObject())
    {
        NanThrowTypeError("Second argument must be a object");
        NanReturnUndefined();
    }
    v8::Local<v8::Object> uuid = args[1]->ToObject();

    if (!args[2]->IsObject())
    {
        NanThrowTypeError("Third argument must be a object");
        NanReturnUndefined();
    }
    v8::Local<v8::Object> handle_range = args[2]->ToObject();


    if (!args[3]->IsFunction())
    {
        NanThrowTypeError("Forth argument must be a function");
        NanReturnUndefined();
    }
    v8::Local<v8::Function> callback = args[3].As<v8::Function>();

    GattcCharacteristicByUUIDReadBaton *baton = new GattcCharacteristicByUUIDReadBaton(callback);
    baton->conn_handle = conn_handle;
    baton->p_uuid = BleUUID(uuid);
    baton->p_handle_range = GattcHandleRange(handle_range);

    uv_queue_work(uv_default_loop(), baton->req, CharacteristicValueByUUIDRead, (uv_after_work_cb)AfterCharacteristicValueByUUIDRead);

    // TODO: generate a generic function to handle return code from the SD. If not NRF_SUCCESS, raise an exception.
    NanReturnUndefined();
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
    NanScope();

    // TODO: handle if .Close is called before this function is called.
    GattcCharacteristicByUUIDReadBaton *baton = static_cast<GattcCharacteristicByUUIDReadBaton *>(req->data);
    v8::Handle<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "starting reading characteristics by UUID");
    }
    else
    {
        argv[0] = NanUndefined();
    }

    baton->callback->Call(1, argv);
    delete baton;
}


NAN_METHOD(Read)
{
    NanScope();

    if (!args[0]->IsNumber())
    {
        NanThrowTypeError("First argument must be a number");
        NanReturnUndefined();
    }
    uint16_t conn_handle = ConversionUtility::getNativeUint16(args[0]);

    if (!args[1]->IsNumber())
    {
        NanThrowTypeError("Second argument must be a number");
        NanReturnUndefined();
    }
    uint16_t handle = ConversionUtility::getNativeUint16(args[1]);

    if (!args[2]->IsNumber())
    {
        NanThrowTypeError("Third argument must be a number");
        NanReturnUndefined();
    }
    uint16_t offset = ConversionUtility::getNativeUint16(args[2]);


    if (!args[3]->IsFunction())
    {
        NanThrowTypeError("Forth argument must be a function");
        NanReturnUndefined();
    }
    v8::Local<v8::Function> callback = args[3].As<v8::Function>();

    GattcReadBaton *baton = new GattcReadBaton(callback);
    baton->conn_handle = conn_handle;
    baton->handle = handle;
    baton->offset = offset;

    uv_queue_work(uv_default_loop(), baton->req, Read, (uv_after_work_cb)AfterRead);

    // TODO: generate a generic function to handle return code from the SD. If not NRF_SUCCESS, raise an exception.
    NanReturnUndefined();
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
    NanScope();

    // TODO: handle if .Close is called before this function is called.
    GattcReadBaton *baton = static_cast<GattcReadBaton *>(req->data);
    v8::Handle<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "starting reading characteristics by UUID");
    }
    else
    {
        argv[0] = NanUndefined();
    }

    baton->callback->Call(1, argv);
    delete baton;
}

NAN_METHOD(CharacteristicValuesRead)
{
    NanScope();

    if (!args[0]->IsNumber())
    {
        NanThrowTypeError("First argument must be a number");
        NanReturnUndefined();
    }
    uint16_t conn_handle = ConversionUtility::getNativeUint16(args[0]);

    if (!args[1]->IsObject())
    {
        NanThrowTypeError("Second argument must be a object");
        NanReturnUndefined();
    }
    v8::Local<v8::Object> handles = args[1]->ToObject();

    if (!args[2]->IsNumber())
    {
        NanThrowTypeError("Third argument must be a number");
        NanReturnUndefined();
    }
    uint16_t handle_count = ConversionUtility::getNativeUint16(args[2]);

    if (!args[3]->IsFunction())
    {
        NanThrowTypeError("Forth argument must be a function");
        NanReturnUndefined();
    }
    v8::Local<v8::Function> callback = args[3].As<v8::Function>();

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
    NanReturnUndefined();
}

// This runs in a worker thread (not Main Thread)
void CharacteristicValuesRead(uv_work_t *req) {
    // TODO: handle if .Close is called before this function is called.
    GattcCharacteristicValuesReadBaton *baton = static_cast<GattcCharacteristicValuesReadBaton *>(req->data);

    std::lock_guard<std::mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_gattc_char_values_read(baton->conn_handle, baton->p_handles, baton->handle_count);

    free(baton->p_handles);
}

// This runs in Main Thread
void AfterCharacteristicValuesRead(uv_work_t *req) {
    NanScope();

    // TODO: handle if .Close is called before this function is called.
    GattcCharacteristicValuesReadBaton *baton = static_cast<GattcCharacteristicValuesReadBaton *>(req->data);
    v8::Handle<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "starting reading characteristics values");
    }
    else
    {
        argv[0] = NanUndefined();
    }

    baton->callback->Call(1, argv);
    delete baton;
}


NAN_METHOD(Write)
{
    NanScope();

    if (!args[0]->IsNumber())
    {
        NanThrowTypeError("First argument must be a number");
        NanReturnUndefined();
    }
    uint16_t conn_handle = ConversionUtility::getNativeUint16(args[0]);

    if (!args[1]->IsObject())
    {
        NanThrowTypeError("Second argument must be a object");
        NanReturnUndefined();
    }
    v8::Local<v8::Object> p_write_params = args[1]->ToObject();

    if (!args[2]->IsFunction())
    {
        NanThrowTypeError("Third argument must be a function");
        NanReturnUndefined();
    }
    v8::Local<v8::Function> callback = args[2].As<v8::Function>();

    GattcWriteBaton *baton = new GattcWriteBaton(callback);
    baton->conn_handle = conn_handle;
    baton->p_write_params = GattcWriteParameters(p_write_params);

    uv_queue_work(uv_default_loop(), baton->req, Write, (uv_after_work_cb)AfterWrite);

    // TODO: generate a generic function to handle return code from the SD. If not NRF_SUCCESS, raise an exception.
    NanReturnUndefined();
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
    NanScope();

    // TODO: handle if .Close is called before this function is called.
    GattcWriteBaton *baton = static_cast<GattcWriteBaton *>(req->data);
    v8::Handle<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "writing");
    }
    else
    {
        argv[0] = NanUndefined();
    }

    baton->callback->Call(1, argv);
    delete baton;
}


NAN_METHOD(HandleValueConfirm)
{
    NanScope();

    if (!args[0]->IsNumber())
    {
        NanThrowTypeError("First argument must be a number");
        NanReturnUndefined();
    }
    uint16_t conn_handle = ConversionUtility::getNativeUint16(args[0]);

    if (!args[1]->IsNumber())
    {
        NanThrowTypeError("Second argument must be a number");
        NanReturnUndefined();
    }
    uint16_t handle = ConversionUtility::getNativeUint16(args[1]);

    if (!args[2]->IsFunction())
    {
        NanThrowTypeError("Third argument must be a function");
        NanReturnUndefined();
    }
    v8::Local<v8::Function> callback = args[2].As<v8::Function>();

    GattcHandleValueConfirmBaton *baton = new GattcHandleValueConfirmBaton(callback);
    baton->conn_handle = conn_handle;
    baton->handle = handle;

    uv_queue_work(uv_default_loop(), baton->req, HandleValueConfirm, (uv_after_work_cb)AfterHandleValueConfirm);

    // TODO: generate a generic function to handle return code from the SD. If not NRF_SUCCESS, raise an exception.
    NanReturnUndefined();
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
    NanScope();

    // TODO: handle if .Close is called before this function is called.
    GattcHandleValueConfirmBaton *baton = static_cast<GattcHandleValueConfirmBaton *>(req->data);
    v8::Handle<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "confirming handle value");
    }
    else
    {
        argv[0] = NanUndefined();
    }

    baton->callback->Call(1, argv);
    delete baton;
}

extern "C" {
    void init_gattc(v8::Handle<v8::Object> target)
    {
        NODE_SET_METHOD(target, "gattc_primary_services_discover", PrimaryServicesDiscover);
        NODE_SET_METHOD(target, "gattc_releationships_discover", RelationshipDiscover);
        NODE_SET_METHOD(target, "gattc_characteristic_discover", CharacteristicsDiscover);
        NODE_SET_METHOD(target, "gattc_descriptor_discover", DescriptorsDiscover);
        NODE_SET_METHOD(target, "gattc_read_characteriscicvalue_by_uuid", CharacteristicValueByUUIDRead);
        NODE_SET_METHOD(target, "gattc_read", Read);
        NODE_SET_METHOD(target, "gattc_read_characteriscicvalue", CharacteristicValuesRead);
        NODE_SET_METHOD(target, "gattc_write", Write);
        NODE_SET_METHOD(target, "gattc_confirm_handle_value", HandleValueConfirm);

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
