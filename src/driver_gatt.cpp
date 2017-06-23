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

#include "driver_gatt.h"

name_map_t gatt_status_map = {
    NAME_MAP_ENTRY(BLE_GATT_STATUS_SUCCESS),
    NAME_MAP_ENTRY(BLE_GATT_STATUS_UNKNOWN),
    NAME_MAP_ENTRY(BLE_GATT_STATUS_ATTERR_INVALID),
    NAME_MAP_ENTRY(BLE_GATT_STATUS_ATTERR_INVALID_HANDLE),
    NAME_MAP_ENTRY(BLE_GATT_STATUS_ATTERR_READ_NOT_PERMITTED),
    NAME_MAP_ENTRY(BLE_GATT_STATUS_ATTERR_WRITE_NOT_PERMITTED),
    NAME_MAP_ENTRY(BLE_GATT_STATUS_ATTERR_INVALID_PDU),
    NAME_MAP_ENTRY(BLE_GATT_STATUS_ATTERR_INSUF_AUTHENTICATION),
    NAME_MAP_ENTRY(BLE_GATT_STATUS_ATTERR_REQUEST_NOT_SUPPORTED),
    NAME_MAP_ENTRY(BLE_GATT_STATUS_ATTERR_INVALID_OFFSET),
    NAME_MAP_ENTRY(BLE_GATT_STATUS_ATTERR_INSUF_AUTHORIZATION),
    NAME_MAP_ENTRY(BLE_GATT_STATUS_ATTERR_PREPARE_QUEUE_FULL),
    NAME_MAP_ENTRY(BLE_GATT_STATUS_ATTERR_ATTRIBUTE_NOT_FOUND),
    NAME_MAP_ENTRY(BLE_GATT_STATUS_ATTERR_ATTRIBUTE_NOT_LONG),
    NAME_MAP_ENTRY(BLE_GATT_STATUS_ATTERR_INSUF_ENC_KEY_SIZE),
    NAME_MAP_ENTRY(BLE_GATT_STATUS_ATTERR_INVALID_ATT_VAL_LENGTH),
    NAME_MAP_ENTRY(BLE_GATT_STATUS_ATTERR_UNLIKELY_ERROR),
    NAME_MAP_ENTRY(BLE_GATT_STATUS_ATTERR_INSUF_ENCRYPTION),
    NAME_MAP_ENTRY(BLE_GATT_STATUS_ATTERR_UNSUPPORTED_GROUP_TYPE),
    NAME_MAP_ENTRY(BLE_GATT_STATUS_ATTERR_INSUF_RESOURCES),
    NAME_MAP_ENTRY(BLE_GATT_STATUS_ATTERR_RFU_RANGE1_BEGIN),
    NAME_MAP_ENTRY(BLE_GATT_STATUS_ATTERR_RFU_RANGE1_END),
    NAME_MAP_ENTRY(BLE_GATT_STATUS_ATTERR_APP_BEGIN),
    NAME_MAP_ENTRY(BLE_GATT_STATUS_ATTERR_APP_END),
    NAME_MAP_ENTRY(BLE_GATT_STATUS_ATTERR_RFU_RANGE2_BEGIN),
    NAME_MAP_ENTRY(BLE_GATT_STATUS_ATTERR_RFU_RANGE2_END),
    NAME_MAP_ENTRY(BLE_GATT_STATUS_ATTERR_RFU_RANGE3_BEGIN),
    NAME_MAP_ENTRY(BLE_GATT_STATUS_ATTERR_RFU_RANGE3_END),
    NAME_MAP_ENTRY(BLE_GATT_STATUS_ATTERR_CPS_CCCD_CONFIG_ERROR),
    NAME_MAP_ENTRY(BLE_GATT_STATUS_ATTERR_CPS_PROC_ALR_IN_PROG),
    NAME_MAP_ENTRY(BLE_GATT_STATUS_ATTERR_CPS_OUT_OF_RANGE)
};

//
// GattCharProps -- START --
//

v8::Local<v8::Object> GattCharProps::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();

    Utility::Set(obj, "broadcast", ConversionUtility::toJsBool(native->broadcast));
    Utility::Set(obj, "read", ConversionUtility::toJsBool(native->read));
    Utility::Set(obj, "write_wo_resp", ConversionUtility::toJsBool(native->write_wo_resp));
    Utility::Set(obj, "write", ConversionUtility::toJsBool(native->write));
    Utility::Set(obj, "notify", ConversionUtility::toJsBool(native->notify));
    Utility::Set(obj, "indicate", ConversionUtility::toJsBool(native->indicate));
    Utility::Set(obj, "auth_signed_wr", ConversionUtility::toJsBool(native->auth_signed_wr));

    return scope.Escape(obj);
}

ble_gatt_char_props_t *GattCharProps::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto char_props = new ble_gatt_char_props_t();

    char_props->broadcast = ConversionUtility::getNativeBool(jsobj, "broadcast");
    char_props->read = ConversionUtility::getNativeBool(jsobj, "read");
    char_props->write_wo_resp = ConversionUtility::getNativeBool(jsobj, "write_wo_resp");
    char_props->write = ConversionUtility::getNativeBool(jsobj, "write");
    char_props->notify = ConversionUtility::getNativeBool(jsobj, "notify");
    char_props->indicate = ConversionUtility::getNativeBool(jsobj, "indicate");
    char_props->auth_signed_wr = ConversionUtility::getNativeBool(jsobj, "auth_signed_wr");

    return char_props;
}

//
// GattCharProps -- END --
//

//
// GattCharExtProps -- START --
//

v8::Local<v8::Object> GattCharExtProps::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();

    Utility::Set(obj, "reliable_wr", ConversionUtility::toJsBool(native->reliable_wr));
    Utility::Set(obj, "wr_aux", ConversionUtility::toJsBool(native->wr_aux));

    return scope.Escape(obj);
}

ble_gatt_char_ext_props_t *GattCharExtProps::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto char_ext_props = new ble_gatt_char_ext_props_t();

    char_ext_props->reliable_wr = ConversionUtility::getNativeBool(jsobj, "reliable_wr");
    char_ext_props->wr_aux = ConversionUtility::getNativeBool(jsobj, "wr_aux");

    return char_ext_props;
}

//
// GattCharExtProps -- END --
//

#if NRF_SD_BLE_API_VERSION >= 3
//
// GattEnableParams -- START --
//

v8::Local<v8::Object> GattEnableParameters::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();

    Utility::Set(obj, "att_mtu", native->att_mtu);

    return scope.Escape(obj);
}

ble_gatt_enable_params_t *GattEnableParameters::ToNative()
{
    auto enableParams = new ble_gatt_enable_params_t();

    enableParams->att_mtu = ConversionUtility::getNativeUint16(jsobj, "att_mtu");

    return enableParams;
}

//
// GattEnableParams -- END --
//
#endif


extern "C" {
    void init_gatt(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target)
    {
        /* Default MTU size. */
        NODE_DEFINE_CONSTANT(target, GATT_MTU_SIZE_DEFAULT);

#if NRF_SD_BLE_API_VERSION <= 2
		/* Only the default MTU size of 23 is currently supported. */
        NODE_DEFINE_CONSTANT(target, GATT_RX_MTU);
#endif

        /* Invalid Attribute Handle. */
        NODE_DEFINE_CONSTANT(target, BLE_GATT_HANDLE_INVALID);

        /* BLE_GATT_TIMEOUT_SOURCES GATT Timeout sources */
        NODE_DEFINE_CONSTANT(target, BLE_GATT_TIMEOUT_SRC_PROTOCOL); //ATT Protocol timeout.

        /* BLE_GATT_WRITE_OPS GATT Write operations */
        NODE_DEFINE_CONSTANT(target, BLE_GATT_OP_INVALID); //Invalid Operation.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_OP_WRITE_REQ); //Write Request.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_OP_WRITE_CMD); //Write Command.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_OP_SIGN_WRITE_CMD); //Signed Write Command.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_OP_PREP_WRITE_REQ); //Prepare Write Request.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_OP_EXEC_WRITE_REQ); //Execute Write Request.

        /* BLE_GATT_EXEC_WRITE_FLAGS GATT Execute Write flags */
        NODE_DEFINE_CONSTANT(target, BLE_GATT_EXEC_WRITE_FLAG_PREPARED_CANCEL);
        NODE_DEFINE_CONSTANT(target, BLE_GATT_EXEC_WRITE_FLAG_PREPARED_WRITE);

        /* BLE_GATT_HVX_TYPES GATT Handle Value operations */
        NODE_DEFINE_CONSTANT(target, BLE_GATT_HVX_INVALID); //Invalid Operation.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_HVX_NOTIFICATION); //Handle Value Notification.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_HVX_INDICATION); //Handle Value Indication.

        /* BLE_GATT_STATUS_CODES GATT Status Codes */
        NODE_DEFINE_CONSTANT(target, BLE_GATT_STATUS_SUCCESS); //Success.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_STATUS_UNKNOWN); //Unknown or not applicable status.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_STATUS_ATTERR_INVALID); //ATT Error: Invalid Error Code.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_STATUS_ATTERR_INVALID_HANDLE); //ATT Error: Invalid Attribute Handle.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_STATUS_ATTERR_READ_NOT_PERMITTED); //ATT Error: Read not permitted.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_STATUS_ATTERR_WRITE_NOT_PERMITTED); //ATT Error: Write not permitted.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_STATUS_ATTERR_INVALID_PDU); //ATT Error: Used in ATT as Invalid PDU.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_STATUS_ATTERR_INSUF_AUTHENTICATION); //ATT Error: Authenticated link required.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_STATUS_ATTERR_REQUEST_NOT_SUPPORTED); //ATT Error: Used in ATT as Request Not Supported.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_STATUS_ATTERR_INVALID_OFFSET); //ATT Error: Offset specified was past the end of the attribute.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_STATUS_ATTERR_INSUF_AUTHORIZATION); //ATT Error: Used in ATT as Insufficient Authorisation.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_STATUS_ATTERR_PREPARE_QUEUE_FULL); //ATT Error: Used in ATT as Prepare Queue Full.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_STATUS_ATTERR_ATTRIBUTE_NOT_FOUND); //ATT Error: Used in ATT as Attribute not found.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_STATUS_ATTERR_ATTRIBUTE_NOT_LONG); //ATT Error: Attribute cannot be read or written using read/write blob requests.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_STATUS_ATTERR_INSUF_ENC_KEY_SIZE); //ATT Error: Encryption key size used is insufficient.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_STATUS_ATTERR_INVALID_ATT_VAL_LENGTH); //ATT Error: Invalid value size.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_STATUS_ATTERR_UNLIKELY_ERROR); //ATT Error: Very unlikely error.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_STATUS_ATTERR_INSUF_ENCRYPTION); //ATT Error: Encrypted link required.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_STATUS_ATTERR_UNSUPPORTED_GROUP_TYPE); //ATT Error: Attribute type is not a supported grouping attribute.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_STATUS_ATTERR_INSUF_RESOURCES); //ATT Error: Encrypted link required.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_STATUS_ATTERR_RFU_RANGE1_BEGIN); //ATT Error: Reserved for Future Use range #1 begin.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_STATUS_ATTERR_RFU_RANGE1_END); //ATT Error: Reserved for Future Use range #1 end.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_STATUS_ATTERR_APP_BEGIN); //ATT Error: Application range begin.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_STATUS_ATTERR_APP_END); //ATT Error: Application range end.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_STATUS_ATTERR_RFU_RANGE2_BEGIN); //ATT Error: Reserved for Future Use range #2 begin.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_STATUS_ATTERR_RFU_RANGE2_END); //ATT Error: Reserved for Future Use range #2 end.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_STATUS_ATTERR_RFU_RANGE3_BEGIN); //ATT Error: Reserved for Future Use range #3 begin.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_STATUS_ATTERR_RFU_RANGE3_END); //ATT Error: Reserved for Future Use range #3 end.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_STATUS_ATTERR_CPS_CCCD_CONFIG_ERROR); //ATT Common Profile and Service Error: Client Characteristic Configuration Descriptor improperly configured.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_STATUS_ATTERR_CPS_PROC_ALR_IN_PROG); //ATT Common Profile and Service Error: Procedure Already in Progress.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_STATUS_ATTERR_CPS_OUT_OF_RANGE); //ATT Common Profile and Service Error: Out Of Range.

        /* BLE_GATT_CPF_FORMATS Characteristic Presentation Formats
        * @note Found at http://developer.bluetooth.org/gatt/descriptors/Pages/DescriptorViewer.aspx?u=org.bluetooth.descriptor.gatt.characteristic_presentation_format.xml
        */
        NODE_DEFINE_CONSTANT(target, BLE_GATT_CPF_FORMAT_RFU); //Reserved For Future Use.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_CPF_FORMAT_BOOLEAN); //Boolean.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_CPF_FORMAT_2BIT); //Unsigned 2-bit integer.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_CPF_FORMAT_NIBBLE); //Unsigned 4-bit integer.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_CPF_FORMAT_UINT8); //Unsigned 8-bit integer.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_CPF_FORMAT_UINT12); //Unsigned 12-bit integer.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_CPF_FORMAT_UINT16); //Unsigned 16-bit integer.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_CPF_FORMAT_UINT24); //Unsigned 24-bit integer.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_CPF_FORMAT_UINT32); //Unsigned 32-bit integer.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_CPF_FORMAT_UINT48); //Unsigned 48-bit integer.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_CPF_FORMAT_UINT64); //Unsigned 64-bit integer.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_CPF_FORMAT_UINT128); //Unsigned 128-bit integer.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_CPF_FORMAT_SINT8); //Signed 2-bit integer.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_CPF_FORMAT_SINT12); //Signed 12-bit integer.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_CPF_FORMAT_SINT16); //Signed 16-bit integer.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_CPF_FORMAT_SINT24); //Signed 24-bit integer.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_CPF_FORMAT_SINT32); //Signed 32-bit integer.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_CPF_FORMAT_SINT48); //Signed 48-bit integer.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_CPF_FORMAT_SINT64); //Signed 64-bit integer.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_CPF_FORMAT_SINT128); //Signed 128-bit integer.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_CPF_FORMAT_FLOAT32); //IEEE-754 32-bit floating point.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_CPF_FORMAT_FLOAT64); //IEEE-754 64-bit floating point.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_CPF_FORMAT_SFLOAT); //IEEE-11073 16-bit SFLOAT.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_CPF_FORMAT_FLOAT); //IEEE-11073 32-bit FLOAT.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_CPF_FORMAT_DUINT16); //IEEE-20601 format.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_CPF_FORMAT_UTF8S); //UTF-8 string.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_CPF_FORMAT_UTF16S); //UTF-16 string.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_CPF_FORMAT_STRUCT); //Opaque Structure.

        /* BLE_GATT_CPF_NAMESPACES GATT Bluetooth Namespaces */
        NODE_DEFINE_CONSTANT(target, BLE_GATT_CPF_NAMESPACE_BTSIG); //Bluetooth SIG defined Namespace.
        NODE_DEFINE_CONSTANT(target, BLE_GATT_CPF_NAMESPACE_DESCRIPTION_UNKNOWN); //Namespace Description Unknown.
    }
}
