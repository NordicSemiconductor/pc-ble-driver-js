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
        argv[0] = Nan::Undefined();
        argv[1] = ErrorMessage::getErrorMessage(baton->result, "adding service");
    }
    else
    {
        argv[0] = ConversionUtility::toJsNumber(baton->p_handle);
        argv[1] = Nan::Undefined();
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
        argv[0] = Nan::Undefined();
        argv[1] = ErrorMessage::getErrorMessage(baton->result, "adding service");
    }
    else
    {
        argv[0] = GattsCharacteristicDefinitionHandles(baton->p_handles).ToJs();
        argv[1] = Nan::Undefined();
    }

    baton->callback->Call(2, argv);

    delete baton->p_handles;
    delete baton;
}

extern "C" {
    void init_gatts(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target)
    {
        Utility::SetMethod(target, "gatts_add_service", AddService);
        Utility::SetMethod(target, "gatts_add_characteristic", AddCharacteristic);

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
