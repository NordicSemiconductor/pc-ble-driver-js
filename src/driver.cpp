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

#include <iostream>
#include <mutex>
#include <sstream>
#include <algorithm>

#include "sd_rpc.h"
#include "adapter.h"

#include "serialadapter.h"
#include "driver.h"
#include "driver_gap.h"
#include "driver_gatt.h"
#include "driver_gattc.h"
#include "driver_gatts.h"
#include "driver_uecc.h"

using namespace std;

// Variable to use to handle callbacks while device is opened and the corresponding callbacks is not fully operational
Adapter *adapterBeingOpened = nullptr;

// Macro for keeping sanity in event switch case below
#define COMMON_EVT_CASE(evt_enum, evt_to_js, params_name, event_array, event_array_idx, eventEntry) \
    case BLE_EVT_##evt_enum:                                                                                         \
    {                                                                                                                \
        ble_common_evt_t common_event = eventEntry->event->evt.common_evt;                                           \
        std::string timestamp = eventEntry->timestamp;                                                               \
        v8::Local<v8::Value> js_event =                                                                              \
            Common##evt_to_js##Event(timestamp, common_event.conn_handle, &(common_event.params.params_name)).ToJs();\
        Nan::Set(event_array, event_array_idx, js_event);                                                            \
        break;                                                                                                       \
    }


// Macro for keeping sanity in event switch case below
#define GAP_EVT_CASE(evt_enum, evt_to_js, params_name, event_array, event_array_idx, eventEntry) \
    case BLE_GAP_EVT_##evt_enum:                                                                                     \
    {                                                                                                                \
        ble_gap_evt_t gap_event = eventEntry->event->evt.gap_evt;                                                    \
        std::string timestamp = eventEntry->timestamp;                                                               \
        v8::Local<v8::Object> js_event =                                                                             \
            Gap##evt_to_js(timestamp, gap_event.conn_handle, &(gap_event.params.params_name)).ToJs();                \
        Nan::Set(event_array, event_array_idx, js_event);                                                            \
        break;                                                                                                       \
    }

// Macro for keeping sanity in event switch case below
#define GATTC_EVT_CASE(evt_enum, evt_to_js, params_name, event_array, event_array_idx, eventEntry) \
    case BLE_GATTC_EVT_##evt_enum:                                                                                   \
    {                                                                                                                \
        ble_gattc_evt_t *gattc_event = &(eventEntry->event->evt.gattc_evt);                                          \
        std::string timestamp = eventEntry->timestamp;                                                               \
        v8::Local<v8::Value> js_event =                                                                              \
            Gattc##evt_to_js##Event(timestamp, gattc_event->conn_handle, gattc_event->gatt_status, gattc_event->error_handle, &(gattc_event->params.params_name)).ToJs(); \
        Nan::Set(event_array, event_array_idx, js_event);                                                            \
        break;                                                                                                       \
    }

// Macro for keeping sanity in event switch case below
#define GATTS_EVT_CASE(evt_enum, evt_to_js, params_name, event_array, event_array_idx, eventEntry)                   \
    case BLE_GATTS_EVT_##evt_enum:                                                                                   \
    {                                                                                                                \
        ble_gatts_evt_t *gatts_event = &(eventEntry->event->evt.gatts_evt);                                          \
        std::string timestamp = eventEntry->timestamp;                                                               \
        v8::Local<v8::Value> js_event =                                                                              \
            Gatts##evt_to_js##Event(timestamp, gatts_event->conn_handle, &(gatts_event->params.params_name)).ToJs(); \
        Nan::Set(event_array, event_array_idx, js_event);                                                            \
        break;                                                                                                       \
    }

static name_map_t uuid_type_name_map = {
    NAME_MAP_ENTRY(BLE_UUID_TYPE_UNKNOWN),
    NAME_MAP_ENTRY(BLE_UUID_TYPE_BLE),
    NAME_MAP_ENTRY(BLE_UUID_TYPE_VENDOR_BEGIN)
};

// This function is ran by the thread that the SoftDevice Driver has initiated
void sd_rpc_on_log_event(adapter_t *adapter, sd_rpc_log_severity_t severity, const char *log_message)
{
    auto logEntry = new LogEntry();
    logEntry->message = std::string(log_message);
    logEntry->severity = severity;

    auto jsAdapter = Adapter::getAdapter(adapter, adapterBeingOpened);

    if (jsAdapter != nullptr)
    {
        jsAdapter->appendLog(logEntry);
    }
    else
    {
        std::cerr << "No AddOn adapter to process log event." << std::endl;
        std::terminate();
    }
}

void Adapter::appendLog(LogEntry *log)
{
    if (asyncLog != nullptr) {
    logQueue.push(log);
        uv_async_send(asyncLog);
    }
}

// Now we are in the NodeJS thread. Call callbacks.
void Adapter::onLogEvent(uv_async_t *handle)
{
    Nan::HandleScope scope;

    while (!logQueue.wasEmpty())
    {
        LogEntry *logEntry;
        logQueue.pop(logEntry);

        if (logCallback != nullptr)
        {
            v8::Local<v8::Value> argv[2];
            argv[0] = ConversionUtility::toJsNumber(static_cast<int>(logEntry->severity));
            argv[1] = ConversionUtility::toJsString(logEntry->message);
            logCallback->Call(2, argv);
        }
        else
        {
            std::cerr << "Log event received, but no callback is registered." << std::endl;
        }

        // Free memory for current entry, we remove the element from the deque when the iteration is done
        delete logEntry;
    }
}

// Sends events upstream
void Adapter::dispatchEvents()
{
    // Trigger callback in NodeJS thread to call NodeJS callbacks
    if (asyncEvent != nullptr)
    {
        uv_async_send(asyncEvent);
    }
    else
    {
        std::cerr << "Adapter::dispatchEvents() asyncEvent is nullptr!" << std::endl;
        std::terminate();
    }
}

void Adapter::eventIntervalCallback(uv_timer_t *handle)
{
    dispatchEvents();
}

static void sd_rpc_on_event(adapter_t *adapter, ble_evt_t *event)
{
    // The lifecycle for the event is controlled by the driver. We must not free any memory related to the incoming event.

    if (event == nullptr)
    {
        return;
    }

    auto jsAdapter = Adapter::getAdapter(adapter, adapterBeingOpened);

    if (jsAdapter != nullptr)
    {
        jsAdapter->appendEvent(event);
    }
    else
    {
        std::cerr << "No AddOn adapter to process BLE event." << std::endl;
        std::terminate();
    }
}

void Adapter::appendEvent(ble_evt_t *event)
{
    eventCallbackCount += 1;
    eventCallbackBatchEventCounter += 1;

    if (eventCallbackBatchEventCounter > eventCallbackMaxCount)
    {
        eventCallbackMaxCount = eventCallbackBatchEventCounter;
    }

    // Allocate memory to store decoded event including an unkown quantity of padding, use the same size as serialization_transport.cpp
    const int size = 512;

    auto evt = malloc(size);
    memset(evt, 0, size);
    memcpy(evt, event, size);

    auto eventEntry = new EventEntry();
    eventEntry->event = static_cast<ble_evt_t*>(evt);
    eventEntry->timestamp = getCurrentTimeInMilliseconds();

    eventQueue.push(eventEntry);

    // If the event interval is not set, send the events to NodeJS as soon as possible.
    if (eventInterval == 0)
    {
        dispatchEvents();
    }
}

// Now we are in the NodeJS thread. Call callbacks.
void Adapter::onRpcEvent(uv_async_t *handle)
{
    Nan::HandleScope scope;

    if (eventQueue.wasEmpty())
    {
        return;
    }

    auto array = Nan::New<v8::Array>();
    auto arrayIndex = 0;

    while (!eventQueue.wasEmpty())
    {
        EventEntry *eventEntry = nullptr;
        eventQueue.pop(eventEntry);

        if (eventEntry == nullptr) {
            std::cerr << "eventEntry from queue is null. Illegal state, terminating." << std::endl;
            std::terminate();
        }

        auto event = eventEntry->event;
        if (eventEntry == nullptr) {
            std::cerr << "event from eventEntry is null. Illegal state, terminating." << std::endl;
            std::terminate();
        }

        if (eventCallback != nullptr)
        {
            switch (event->header.evt_id)
            {
                COMMON_EVT_CASE(TX_COMPLETE,      TXComplete, tx_complete,      array, arrayIndex, eventEntry);
                COMMON_EVT_CASE(USER_MEM_REQUEST, MemRequest, user_mem_request, array, arrayIndex, eventEntry);
                COMMON_EVT_CASE(USER_MEM_RELEASE, MemRelease, user_mem_release, array, arrayIndex, eventEntry);

                GAP_EVT_CASE(CONNECTED,                 Connected,              connected,                  array, arrayIndex, eventEntry);
                GAP_EVT_CASE(DISCONNECTED,              Disconnected,           disconnected,               array, arrayIndex, eventEntry);
                GAP_EVT_CASE(CONN_PARAM_UPDATE,         ConnParamUpdate,        conn_param_update,          array, arrayIndex, eventEntry);
                GAP_EVT_CASE(SEC_PARAMS_REQUEST,        SecParamsRequest,       sec_params_request,         array, arrayIndex, eventEntry);
                GAP_EVT_CASE(SEC_INFO_REQUEST,          SecInfoRequest,         sec_info_request,           array, arrayIndex, eventEntry);
                GAP_EVT_CASE(PASSKEY_DISPLAY,           PasskeyDisplay,         passkey_display,            array, arrayIndex, eventEntry);
                GAP_EVT_CASE(KEY_PRESSED,               KeyPressed,             key_pressed,                array, arrayIndex, eventEntry);
                GAP_EVT_CASE(AUTH_KEY_REQUEST,          AuthKeyRequest,         auth_key_request,           array, arrayIndex, eventEntry);
                GAP_EVT_CASE(LESC_DHKEY_REQUEST,        LESCDHKeyRequest,       lesc_dhkey_request,         array, arrayIndex, eventEntry);
                GAP_EVT_CASE(AUTH_STATUS,               AuthStatus,             auth_status,                array, arrayIndex, eventEntry);
                GAP_EVT_CASE(CONN_SEC_UPDATE,           ConnSecUpdate,          conn_sec_update,            array, arrayIndex, eventEntry);
                GAP_EVT_CASE(TIMEOUT,                   Timeout,                timeout,                    array, arrayIndex, eventEntry);
                GAP_EVT_CASE(RSSI_CHANGED,              RssiChanged,            rssi_changed,               array, arrayIndex, eventEntry);
                GAP_EVT_CASE(ADV_REPORT,                AdvReport,              adv_report,                 array, arrayIndex, eventEntry);
                GAP_EVT_CASE(SEC_REQUEST,               SecRequest,             sec_request,                array, arrayIndex, eventEntry);
                GAP_EVT_CASE(CONN_PARAM_UPDATE_REQUEST, ConnParamUpdateRequest, conn_param_update_request,  array, arrayIndex, eventEntry);
                GAP_EVT_CASE(SCAN_REQ_REPORT,           ScanReqReport,          scan_req_report,            array, arrayIndex, eventEntry);

                GATTC_EVT_CASE(PRIM_SRVC_DISC_RSP,          PrimaryServiceDiscovery,       prim_srvc_disc_rsp,         array, arrayIndex, eventEntry);
                GATTC_EVT_CASE(REL_DISC_RSP,                RelationshipDiscovery,         rel_disc_rsp,               array, arrayIndex, eventEntry);
                GATTC_EVT_CASE(CHAR_DISC_RSP,               CharacteristicDiscovery,       char_disc_rsp,              array, arrayIndex, eventEntry);
                GATTC_EVT_CASE(DESC_DISC_RSP,               DescriptorDiscovery,           desc_disc_rsp,              array, arrayIndex, eventEntry);
                GATTC_EVT_CASE(CHAR_VAL_BY_UUID_READ_RSP,   CharacteristicValueReadByUUID, char_val_by_uuid_read_rsp,  array, arrayIndex, eventEntry);
                GATTC_EVT_CASE(READ_RSP,                    Read,                          read_rsp,                   array, arrayIndex, eventEntry);
                GATTC_EVT_CASE(CHAR_VALS_READ_RSP,          CharacteristicValueRead,       char_vals_read_rsp,         array, arrayIndex, eventEntry);
                GATTC_EVT_CASE(WRITE_RSP,                   Write,                         write_rsp,                  array, arrayIndex, eventEntry);
                GATTC_EVT_CASE(HVX,                         HandleValueNotification,       hvx,                        array, arrayIndex, eventEntry);
                GATTC_EVT_CASE(TIMEOUT,                     Timeout,                       timeout,                    array, arrayIndex, eventEntry);

                GATTS_EVT_CASE(WRITE,                   Write,                  write,              array, arrayIndex, eventEntry);
                GATTS_EVT_CASE(RW_AUTHORIZE_REQUEST,    RWAuthorizeRequest,     authorize_request,  array, arrayIndex, eventEntry);
                GATTS_EVT_CASE(SYS_ATTR_MISSING,        SystemAttributeMissing, sys_attr_missing,   array, arrayIndex, eventEntry);
                GATTS_EVT_CASE(HVC,                     HVC,                    hvc,                array, arrayIndex, eventEntry);
                GATTS_EVT_CASE(TIMEOUT,                 Timeout,                timeout,            array, arrayIndex, eventEntry);

                // Handled special as there is no parameter for this in the event struct.
                GATTS_EVT_CASE(SC_CONFIRM, SCConfirm, timeout, array, arrayIndex, eventEntry);

            default:
                std::cerr << "Event " << event->header.evt_id << " unknown to me." << std::endl;
                break;
            }

            //Special extra handling of some events:
            if (event->header.evt_id == BLE_GAP_EVT_AUTH_STATUS)
            {
                auto keyset = getSecurityKey(event->evt.gap_evt.conn_handle);

                v8::Local<v8::Object> obj = Utility::Get(array, arrayIndex)->ToObject();

                if (keyset != 0)
                {
                    Utility::Set(obj, "keyset", static_cast<v8::Handle<v8::Value>>(GapSecKeyset(keyset)));
                }
                else
                {
                    Utility::Set(obj, "keyset", Nan::Null());
                }

                destroySecurityKeyStorage(event->evt.gap_evt.conn_handle);
            }
        }

        arrayIndex++;

        // Free memory for current entry
        free(eventEntry->event);
        delete eventEntry;
    }

    v8::Local<v8::Value> callback_value[1];
    callback_value[0] = array;

    auto start = chrono::high_resolution_clock::now();

    if (eventCallback != nullptr)
    {
        eventCallback->Call(1, callback_value);
    }
    else
    {
        std::cerr << "BLE event received, but no callback is registered." << std::endl;
    }

    auto end = chrono::high_resolution_clock::now();

    auto duration = chrono::duration_cast<chrono::milliseconds>(end - start);
    addEventBatchStatistics(duration);
}

static void sd_rpc_on_status(adapter_t *adapter, sd_rpc_app_status_t id, const char * message)
{
    auto statusEntry = new StatusEntry();
    statusEntry->timestamp = getCurrentTimeInMilliseconds();
    statusEntry->id = id;
    statusEntry->message = std::string(message);

    auto jsAdapter = Adapter::getAdapter(adapter, adapterBeingOpened);

    if (jsAdapter != nullptr)
    {
        jsAdapter->appendStatus(statusEntry);
    }
    else
    {
        std::cerr << "No AddOn adapter to process BLE status event." << std::endl;
        std::terminate();
    }
}

void Adapter::appendStatus(StatusEntry *status)
{
    if (asyncStatus != nullptr)
    {
        statusQueue.push(status);
        uv_async_send(asyncStatus);
    }
}

// Now we are in the NodeJS thread. Call callbacks.
void Adapter::onStatusEvent(uv_async_t *handle)
{
    Nan::HandleScope scope;

    while (!statusQueue.wasEmpty())
    {
        StatusEntry *statusEntry;
        statusQueue.pop(statusEntry);

        if (statusCallback != nullptr)
        {
            v8::Local<v8::Value> argv[1];
            argv[0] = StatusMessage::getStatus(statusEntry->id, statusEntry->message, statusEntry->timestamp);
            statusCallback->Call(1, argv);
        }

        // Free memory for current entry, we remove the element from the deque when the iteration is done
        delete statusEntry;
    }
}

v8::Local<v8::Object> CommonTXCompleteEvent::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverCommonEvent::ToJs(obj);

    Utility::Set(obj, "count", ConversionUtility::toJsNumber(evt->count));

    return scope.Escape(obj);
}

v8::Local<v8::Object> CommonMemRequestEvent::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverCommonEvent::ToJs(obj);

    Utility::Set(obj, "type", ConversionUtility::toJsNumber(evt->type));

    return scope.Escape(obj);
}


v8::Local<v8::Object> CommonMemReleaseEvent::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    BleDriverCommonEvent::ToJs(obj);

    Utility::Set(obj, "type", ConversionUtility::toJsNumber(evt->type));
    Utility::Set(obj, "mem_block", UserMemBlock(&evt->mem_block).ToJs());

    return scope.Escape(obj);
}

// Class private method that is only used by the class to activate the SoftDevice in the Adapter
uint32_t Adapter::enableBLE(adapter_t *adapter)
{
    // If the this->adapter have not been set yet it is because the Adapter::Open call has not set
    // an adapter_t instance. The SoftDevice is started in Adapter::Open call and we do not have to take care of it
    // here.

    if (adapter == nullptr)
    {
        return NRF_ERROR_INVALID_PARAM;
    }

    ble_enable_params_t ble_enable_params;

    memset(&ble_enable_params, 0, sizeof(ble_enable_params));

    /* set the number of Vendor Specific UUIDs to 5 */
    ble_enable_params.common_enable_params.vs_uuid_count = 5;
    /* this application requires 1 connection as a peripheral */
    ble_enable_params.gap_enable_params.periph_conn_count = 1;
    /* this application requires 3 connections as a central */
    ble_enable_params.gap_enable_params.central_conn_count = 3;
    /* this application only needs to be able to pair in one central link at a time */
    ble_enable_params.gap_enable_params.central_sec_count = 1;
    /* we require the Service Changed characteristic */
    ble_enable_params.gatts_enable_params.service_changed = false;
    /* the default Attribute Table size is appropriate for our application */
    ble_enable_params.gatts_enable_params.attr_tab_size = BLE_GATTS_ATTR_TAB_SIZE_DEFAULT;

    return sd_ble_enable(adapter, &ble_enable_params, 0);
}

// This function runs in the Main Thread
NAN_METHOD(Adapter::EnableBLE)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    v8::Local<v8::Object> enableObject;
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        enableObject = ConversionUtility::getJsObject(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        auto message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new EnableBLEBaton(callback);
    baton->adapter = obj->adapter;

    try
    {
        baton->enable_params = EnableParameters(enableObject);
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getStructErrorMessage("enable parameters", error);
        Nan::ThrowTypeError(message);
        return;
    }

    uv_queue_work(uv_default_loop(), baton->req, EnableBLE, reinterpret_cast<uv_after_work_cb>(AfterEnableBLE));
}

// This runs in a worker thread (not Main Thread)
void Adapter::EnableBLE(uv_work_t *req)
{
    auto baton = static_cast<EnableBLEBaton *>(req->data);
    baton->result = sd_ble_enable(baton->adapter, baton->enable_params, &baton->app_ram_base);
}

// This runs in  Main Thread
void Adapter::AfterEnableBLE(uv_work_t *req)
{
    Nan::HandleScope scope;
    auto baton = static_cast<EnableBLEBaton *>(req->data);

    v8::Local<v8::Value> argv[3];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "enabling SoftDevice");
        argv[1] = Nan::Undefined();
        argv[2] = Nan::Undefined();
    }
    else
    {
        argv[0] = Nan::Undefined();
        argv[1] = EnableParameters(baton->enable_params);
        argv[2] = ConversionUtility::toJsNumber(baton->app_ram_base);
    }

    baton->callback->Call(3, argv);
    delete baton->enable_params;
    delete baton;
}


// This function runs in the Main Thread
NAN_METHOD(Adapter::Open)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    std::string path;
    v8::Local<v8::Object> options;
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        path = ConversionUtility::getNativeString(info[argumentcount]);
        argumentcount++;

        options = ConversionUtility::getJsObject(info[argumentcount]);
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

    auto baton = new OpenBaton(callback);
    baton->mainObject = obj;
    baton->path = path;

    auto parameter = 0;

    try
    {
        baton->baud_rate = ConversionUtility::getNativeUint32(options, "baudRate"); parameter++;
        baton->parity = ToParityEnum(Utility::Get(options, "parity")->ToString()); parameter++;
        baton->flow_control = ToFlowControlEnum(Utility::Get(options, "flowControl")->ToString()); parameter++;
        baton->evt_interval = ConversionUtility::getNativeUint32(options, "eventInterval"); parameter++;
        baton->log_level = ToLogSeverityEnum(Utility::Get(options, "logLevel")->ToString()); parameter++;
        baton->retransmission_interval = ConversionUtility::getNativeUint32(options, "retransmissionInterval"); parameter++;
        baton->response_timeout = ConversionUtility::getNativeUint32(options, "responseTimeout"); parameter++;
        baton->enable_ble = ConversionUtility::getBool(options, "enableBLE"); parameter++;
    }
    catch (std::string error)
    {
        std::stringstream errormessage;
        errormessage << "A setup option was wrong. Option: ";
        const char *_options[] = { "baudrate", "parity", "flowcontrol", "eventInterval", "logLevel", "retransmissionInterval", "responseTimeout", "enableBLE" };
        errormessage << _options[parameter] << ". Reason: " << error;
        Nan::ThrowTypeError(errormessage.str().c_str());
        return;
    }

    try
    {
        baton->log_callback = new Nan::Callback(ConversionUtility::getCallbackFunction(options, "logCallback"));
    }
    catch (std::string error)
    {
        auto message = ErrorMessage::getStructErrorMessage("logCallback", error);
        Nan::ThrowTypeError(message);
        return;
    }

    try
    {
        baton->event_callback = new Nan::Callback(ConversionUtility::getCallbackFunction(options, "eventCallback"));
    }
    catch (std::string error)
    {
        auto message = ErrorMessage::getStructErrorMessage("eventCallback", error);
        Nan::ThrowTypeError(message);
        return;
    }

    try
    {
        baton->status_callback = new Nan::Callback(ConversionUtility::getCallbackFunction(options, "statusCallback"));
    }
    catch (std::string error)
    {
        auto message = ErrorMessage::getStructErrorMessage("statusCallback", error);
        Nan::ThrowTypeError(message);
        return;
    }

    uv_queue_work(uv_default_loop(), baton->req, Open, reinterpret_cast<uv_after_work_cb>(AfterOpen));
}

// This runs in a worker thread (not Main Thread)
void Adapter::Open(uv_work_t *req)
{
    auto baton = static_cast<OpenBaton *>(req->data);

    baton->mainObject->eventIntervalTimer = new uv_timer_t();

    baton->mainObject->asyncEvent = new uv_async_t();
    baton->mainObject->asyncLog = new uv_async_t();
    baton->mainObject->asyncStatus = new uv_async_t();

    baton->mainObject->initEventHandling(baton->event_callback, baton->evt_interval);
    baton->mainObject->initLogHandling(baton->log_callback);
    baton->mainObject->initStatusHandling(baton->status_callback);

    // Ensure that the correct adapter gets the callbacks as long as we have no reference to
    // the driver adapter until after sd_rpc_open is called
    adapterBeingOpened = baton->mainObject;

    auto path = baton->path.c_str();

    auto uart = sd_rpc_physical_layer_create_uart(path, baton->baud_rate, baton->flow_control, baton->parity);
    auto h5 = sd_rpc_data_link_layer_create_bt_three_wire(uart, baton->retransmission_interval);
    auto serialization = sd_rpc_transport_layer_create(h5, baton->response_timeout);
    auto adapter = sd_rpc_adapter_create(serialization);

    baton->adapter = adapter;
    baton->mainObject->adapter = adapter;

    // Clear the statistics
    baton->mainObject->eventCallbackCount = 0;

    // Max number of events in queue before sending it to JavaScript
    baton->mainObject->eventCallbackMaxCount = 0;
    baton->mainObject->eventCallbackBatchEventCounter = 0;
    baton->mainObject->eventCallbackBatchEventTotalCount = 0;
    baton->mainObject->eventCallbackBatchNumber = 0;

    auto error_code = sd_rpc_open(adapter, sd_rpc_on_status, sd_rpc_on_event, sd_rpc_on_log_event);

    // Let the normal log handling handle the rest of the log calls
    adapterBeingOpened = nullptr;

    if (error_code != NRF_SUCCESS)
    {
        std::cerr << std::endl << "Failed to open the nRF5 BLE driver." << std::endl;
        baton->result = error_code;
        return;
    }

    if (baton->enable_ble) {
        // Enable BLE with default values defined in Adapter:enableBLE private function
        error_code = Adapter::enableBLE(adapter);

        if (error_code == NRF_SUCCESS)
        {
            baton->result = error_code;
            return;
        }

        if (error_code == NRF_ERROR_INVALID_STATE)
        {
            std::cerr << "BLE stack already enabled" << std::endl;
            return;
        }
    }

    baton->result = error_code;
}

// This runs in  Main Thread
void Adapter::AfterOpen(uv_work_t *req)
{
    Nan::HandleScope scope;
    auto baton = static_cast<OpenBaton *>(req->data);
    delete req;

    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "opening port");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    if (baton->result != NRF_SUCCESS)
    {
        baton->mainObject->cleanUpV8Resources();
    }


    baton->callback->Call(1, argv);

    delete baton;
}

NAN_METHOD(Adapter::Close)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    v8::Local<v8::Function> callback;

    try
    {
        callback = ConversionUtility::getCallbackFunction(info[0]);
    }
    catch (std::string error)
    {
        auto message = ErrorMessage::getTypeErrorMessage(0, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new CloseBaton(callback);
    baton->adapter = obj->adapter;
    baton->mainObject = obj;

    uv_queue_work(uv_default_loop(), baton->req, Close, reinterpret_cast<uv_after_work_cb>(AfterClose));
}

void Adapter::Close(uv_work_t *req)
{
    auto baton = static_cast<CloseBaton *>(req->data);
    baton->result = sd_rpc_close(baton->adapter);
}

void Adapter::AfterClose(uv_work_t *req)
{
    Nan::HandleScope scope;
    auto baton = static_cast<CloseBaton *>(req->data);

    baton->mainObject->cleanUpV8Resources();

    if (baton->callback != nullptr)
    {
        v8::Local<v8::Value> argv[1];

        if (baton->result != NRF_SUCCESS)
        {
            argv[0] = ErrorMessage::getErrorMessage(baton->result, "closing connection");
        }
        else
        {
            argv[0] = Nan::Undefined();
        }

        baton->callback->Call(1, argv);
    }

    delete baton;
}

NAN_METHOD(Adapter::AddVendorSpecificUUID)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    v8::Local<v8::Object> uuid;
    v8::Local<v8::Function> callback;

    auto argumentcount = 0;

    try
    {
        uuid = ConversionUtility::getJsObject(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        auto message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new BleAddVendorSpcificUUIDBaton(callback);
    baton->p_vs_uuid = BleUUID128(uuid);
    baton->adapter = obj->adapter;

    uv_queue_work(uv_default_loop(), baton->req, AddVendorSpecificUUID, reinterpret_cast<uv_after_work_cb>(AfterAddVendorSpecificUUID));
}

void Adapter::AddVendorSpecificUUID(uv_work_t *req)
{
    auto baton = static_cast<BleAddVendorSpcificUUIDBaton *>(req->data);
    baton->result = sd_ble_uuid_vs_add(baton->adapter, baton->p_vs_uuid, &baton->p_uuid_type);
}

void Adapter::AfterAddVendorSpecificUUID(uv_work_t *req)
{
    Nan::HandleScope scope;
    auto baton = static_cast<BleAddVendorSpcificUUIDBaton *>(req->data);

    v8::Local<v8::Value> argv[2];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "adding vendor specific 128-bit UUID");
        argv[1] = Nan::Undefined();
    }
    else
    {
        argv[0] = Nan::Undefined();
        argv[1] = ConversionUtility::toJsNumber(baton->p_uuid_type);
    }

    baton->callback->Call(2, argv);
    delete baton;
}

NAN_INLINE sd_rpc_parity_t ToParityEnum(const v8::Handle<v8::String>& v8str)
{
    sd_rpc_parity_t parity = SD_RPC_PARITY_NONE;

    if (v8str->Equals(Nan::New("none").ToLocalChecked()))
    {
        parity = SD_RPC_PARITY_NONE;
    }
    else if (v8str->Equals(Nan::New("even").ToLocalChecked()))
    {
        parity = SD_RPC_PARITY_EVEN;
    }

    return parity;
}

NAN_INLINE sd_rpc_flow_control_t ToFlowControlEnum(const v8::Handle<v8::String>& v8str)
{
    sd_rpc_flow_control_t flow_control = SD_RPC_FLOW_CONTROL_NONE;

    if (v8str->Equals(Nan::New("none").ToLocalChecked()))
    {
        flow_control = SD_RPC_FLOW_CONTROL_NONE;
    }
    else if (v8str->Equals(Nan::New("hw").ToLocalChecked()))
    {
        flow_control = SD_RPC_FLOW_CONTROL_HARDWARE;
    }

    return flow_control;
}

NAN_INLINE sd_rpc_log_severity_t ToLogSeverityEnum(const v8::Handle<v8::String>& v8str)
{
    sd_rpc_log_severity_t log_severity = SD_RPC_LOG_DEBUG;

    if (v8str->Equals(Nan::New("trace").ToLocalChecked()))
    {
        log_severity = SD_RPC_LOG_TRACE;
    }
    else if (v8str->Equals(Nan::New("debug").ToLocalChecked()))
    {
        log_severity = SD_RPC_LOG_DEBUG;
    }
    else if (v8str->Equals(Nan::New("info").ToLocalChecked()))
    {
        log_severity = SD_RPC_LOG_INFO;
    }
    else if (v8str->Equals(Nan::New("error").ToLocalChecked()))
    {
        log_severity = SD_RPC_LOG_ERROR;
    }
    else if (v8str->Equals(Nan::New("fatal").ToLocalChecked()))
    {
        log_severity = SD_RPC_LOG_FATAL;
    }

    return log_severity;
}

NAN_METHOD(Adapter::GetVersion)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    v8::Local<v8::Function> callback;

    try
    {
        callback = ConversionUtility::getCallbackFunction(info[0]);
    }
    catch (std::string error)
    {
        auto message = ErrorMessage::getTypeErrorMessage(0, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto version = new ble_version_t();
    memset(version, 0, sizeof(ble_version_t));

    auto baton = new GetVersionBaton(callback);
    baton->version = version;
    baton->adapter = obj->adapter;

    uv_queue_work(uv_default_loop(), baton->req, GetVersion, reinterpret_cast<uv_after_work_cb>(AfterGetVersion));

    return;
}

void Adapter::GetVersion(uv_work_t *req)
{
    auto baton = static_cast<GetVersionBaton *>(req->data);
    baton->result = sd_ble_version_get(baton->adapter, baton->version);
}

// This runs in Main Thread
void Adapter::AfterGetVersion(uv_work_t *req)
{
    Nan::HandleScope scope;
    auto baton = static_cast<GetVersionBaton *>(req->data);
    v8::Local<v8::Value> argv[2];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = Nan::Undefined();
        argv[1] = ErrorMessage::getErrorMessage(baton->result, "getting version.");
    }
    else
    {
        argv[0] = Version(baton->version).ToJs();
        argv[1] = Nan::Undefined();
    }

    baton->callback->Call(2, argv);
    delete baton->version;
    delete baton;
}

NAN_METHOD(Adapter::EncodeUUID)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    v8::Local<v8::Object> uuid;
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        uuid = ConversionUtility::getJsObject(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        auto message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new BleUUIDEncodeBaton(callback);

    try
    {
        baton->p_uuid = BleUUID(uuid);
    }
    catch (std::string error)
    {
        std::stringstream errormessage;
        errormessage << "Could not process the UUID. Reason: " << error;
        Nan::ThrowTypeError(errormessage.str().c_str());
        return;
    }

    baton->uuid_le = new uint8_t[16];
    baton->adapter = obj->adapter;

    uv_queue_work(uv_default_loop(), baton->req, EncodeUUID, reinterpret_cast<uv_after_work_cb>(AfterEncodeUUID));

    return;
}

void Adapter::EncodeUUID(uv_work_t *req)
{
    auto baton = static_cast<BleUUIDEncodeBaton *>(req->data);
    baton->result = sd_ble_uuid_encode(baton->adapter, baton->p_uuid, &baton->uuid_le_len, baton->uuid_le);
}

// This runs in Main Thread
void Adapter::AfterEncodeUUID(uv_work_t *req)
{
    Nan::HandleScope scope;
    auto baton = static_cast<BleUUIDEncodeBaton *>(req->data);
    v8::Local<v8::Value> argv[4];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "encoding UUID.");
        argv[1] = Nan::Undefined();
        argv[2] = Nan::Undefined();
        argv[3] = Nan::Undefined();
    }
    else
    {
        argv[0] = Nan::Undefined();
        argv[1] = ConversionUtility::toJsNumber(baton->uuid_le_len);
        argv[2] = ConversionUtility::toJsValueArray(baton->uuid_le, baton->uuid_le_len);
        argv[3] = ConversionUtility::encodeHex(reinterpret_cast<char *>(baton->uuid_le), baton->uuid_le_len);
    }

    baton->callback->Call(4, argv);
    delete baton->uuid_le;
    delete baton;
}

NAN_METHOD(Adapter::DecodeUUID)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    uint8_t le_len;
    v8::Local<v8::Value> uuid_le;
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        le_len = ConversionUtility::getNativeUint8(info[argumentcount]);
        argumentcount++;

        uuid_le = info[argumentcount]->ToString();
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        auto message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new BleUUIDDecodeBaton(callback);
    baton->uuid_le_len = le_len;
    baton->uuid_le = ConversionUtility::extractHex(uuid_le);
    baton->p_uuid = new ble_uuid_t();
    baton->adapter = obj->adapter;

    uv_queue_work(uv_default_loop(), baton->req, DecodeUUID, reinterpret_cast<uv_after_work_cb>(AfterDecodeUUID));

    return;
}

void Adapter::DecodeUUID(uv_work_t *req)
{
    auto baton = static_cast<BleUUIDDecodeBaton *>(req->data);
    baton->result = sd_ble_uuid_decode(baton->adapter, baton->uuid_le_len, baton->uuid_le, baton->p_uuid);
}

// This runs in Main Thread
void Adapter::AfterDecodeUUID(uv_work_t *req)
{
    Nan::HandleScope scope;
    auto baton = static_cast<BleUUIDDecodeBaton *>(req->data);
    v8::Local<v8::Value> argv[2];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "decoding UUID.");
        argv[1] = Nan::Undefined();
    }
    else
    {
        argv[0] = Nan::Undefined();
        argv[1] = BleUUID(baton->p_uuid);
    }

    baton->callback->Call(2, argv);
    delete baton->p_uuid;
    delete baton->uuid_le;
    delete baton;
}

NAN_METHOD(Adapter::GetStats)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    auto stats = Nan::New<v8::Object>();

    Utility::Set(stats, "eventCallbackTotalTime", obj->getEventCallbackTotalTime());
    Utility::Set(stats, "eventCallbackTotalCount", obj->getEventCallbackCount());
    Utility::Set(stats, "eventCallbackBatchMaxCount", obj->getEventCallbackMaxCount());
    Utility::Set(stats, "eventCallbackBatchAvgCount", obj->getAverageCallbackBatchCount());

    Utility::SetReturnValue(info, stats);
}

NAN_METHOD(Adapter::ReplyUserMemory)
{
    auto obj = Nan::ObjectWrap::Unwrap<Adapter>(info.Holder());
    uint16_t conn_handle;
    v8::Local<v8::Object> mem_block;
    v8::Local<v8::Function> callback;
    auto argumentcount = 0;

    try
    {
        conn_handle = ConversionUtility::getNativeUint16(info[argumentcount]);
        argumentcount++;

        mem_block = ConversionUtility::getJsObjectOrNull(info[argumentcount]);
        argumentcount++;

        callback = ConversionUtility::getCallbackFunction(info[argumentcount]);
        argumentcount++;
    }
    catch (std::string error)
    {
        auto message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    auto baton = new BleUserMemReplyBaton(callback);
    baton->conn_handle = conn_handle;
    baton->adapter = obj->adapter;

    try
    {
        baton->p_block = UserMemBlock(mem_block);
    }
    catch (std::string error)
    {
        auto message = ErrorMessage::getStructErrorMessage("user mem reply", error);
        Nan::ThrowTypeError(message);
        return;
    }

    uv_queue_work(uv_default_loop(), baton->req, ReplyUserMemory, reinterpret_cast<uv_after_work_cb>(AfterReplyUserMemory));
}

void Adapter::ReplyUserMemory(uv_work_t *req)
{
    auto baton = static_cast<BleUserMemReplyBaton *>(req->data);
    baton->result = sd_ble_user_mem_reply(baton->adapter, baton->conn_handle, baton->p_block);
}

// This runs in Main Thread
void Adapter::AfterReplyUserMemory(uv_work_t *req)
{
    Nan::HandleScope scope;
    auto baton = static_cast<BleUserMemReplyBaton *>(req->data);
    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "replying on user mem request.");
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    baton->callback->Call(1, argv);
    delete baton->p_block;
    delete baton;
}

#pragma region BandwidthCountParameters

v8::Local<v8::Object> BandwidthCountParameters::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();

    Utility::Set(obj, "high_count", native->high_count);
    Utility::Set(obj, "mid_count", native->mid_count);
    Utility::Set(obj, "low_count", native->low_count);

    return scope.Escape(obj);
}

ble_conn_bw_count_t *BandwidthCountParameters::ToNative()
{
    auto count_params = new ble_conn_bw_count_t();
    count_params->high_count = ConversionUtility::getNativeUint8(jsobj, "high_count");
    count_params->mid_count = ConversionUtility::getNativeUint8(jsobj, "mid_count");
    count_params->low_count = ConversionUtility::getNativeUint8(jsobj, "low_count");
    return count_params;
}

#pragma endregion BandwidthCountParameters

#pragma region BandwidthGlobalMemoryPool

v8::Local<v8::Object> BandwidthGlobalMemoryPool::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();

    if (native == nullptr)
    {
        return scope.Escape(obj);
    }

    Utility::Set(obj, "tx_counts", BandwidthCountParameters(&native->tx_counts).ToJs());
    Utility::Set(obj, "rx_counts", BandwidthCountParameters(&native->rx_counts).ToJs());

    return scope.Escape(obj);
}

ble_conn_bw_counts_t *BandwidthGlobalMemoryPool::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto memory_pool = new ble_conn_bw_counts_t();
    memory_pool->tx_counts = BandwidthCountParameters(ConversionUtility::getJsObject(jsobj, "tx_counts"));
    memory_pool->rx_counts = BandwidthCountParameters(ConversionUtility::getJsObject(jsobj, "rx_counts"));
    return memory_pool;
}

#pragma endregion BandwidthGlobalMemoryPool

#pragma region CommonEnableParameters

v8::Local<v8::Object> CommonEnableParameters::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();

    Utility::Set(obj, "vs_uuid_count", native->vs_uuid_count);
    if (native->p_conn_bw_counts == nullptr)
    {
        Utility::Set(obj, "conn_bw_counts", Nan::Null());
    }
    else
    {
        Utility::Set(obj, "conn_bw_counts", BandwidthGlobalMemoryPool(native->p_conn_bw_counts).ToJs());
    }

    return scope.Escape(obj);
}

ble_common_enable_params_t *CommonEnableParameters::ToNative()
{
    auto enable_params = new ble_common_enable_params_t();
    enable_params->vs_uuid_count = ConversionUtility::getNativeUint16(jsobj, "vs_uuid_count");
    enable_params->p_conn_bw_counts = BandwidthGlobalMemoryPool(ConversionUtility::getJsObjectOrNull(jsobj, "conn_bw_counts"));
    return enable_params;
}

#pragma endregion CommonEnableParameters

#pragma region EnableParameters

v8::Local<v8::Object> EnableParameters::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();

    Utility::Set(obj, "common_enable_params", CommonEnableParameters(&native->common_enable_params).ToJs());
    Utility::Set(obj, "gap_enable_params", GapEnableParameters(&native->gap_enable_params).ToJs());
    Utility::Set(obj, "gatts_enable_params", GattsEnableParameters(&native->gatts_enable_params).ToJs());

    return scope.Escape(obj);
}

ble_enable_params_t *EnableParameters::ToNative()
{
    auto enable_params = new ble_enable_params_t();
    enable_params->common_enable_params = CommonEnableParameters(ConversionUtility::getJsObject(jsobj, "common_enable_params"));
    enable_params->gap_enable_params = GapEnableParameters(ConversionUtility::getJsObject(jsobj, "gap_enable_params"));
    enable_params->gatts_enable_params = GattsEnableParameters(ConversionUtility::getJsObjectOrNull(jsobj, "gatts_enable_params"));
    return enable_params;
}

#pragma endregion EnableParameters

#pragma region Version

v8::Local<v8::Object> Version::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();

    Utility::Set(obj, "version_number", native->version_number);
    Utility::Set(obj, "company_id", native->company_id);
    Utility::Set(obj, "subversion_number", native->subversion_number);

    return scope.Escape(obj);
}

ble_version_t *Version::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto version = new ble_version_t();
    version->version_number = ConversionUtility::getNativeUint8(jsobj, "version_number");
    version->company_id = ConversionUtility::getNativeUint16(jsobj, "company_id");
    version->subversion_number = ConversionUtility::getNativeUint16(jsobj, "subversion_number");
    return version;
}

#pragma endregion Version

#pragma region UserMemBlock

v8::Local<v8::Object> UserMemBlock::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();

    Utility::Set(obj, "mem", ConversionUtility::toJsValueArray(native->p_mem, native->len));
    Utility::Set(obj, "len", native->len);

    return scope.Escape(obj);
}

ble_user_mem_block_t *UserMemBlock::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto uuid = new ble_user_mem_block_t();

    uuid->p_mem = ConversionUtility::getNativePointerToUint8(jsobj, "mem");
    uuid->len = ConversionUtility::getNativeUint16(jsobj, "len");

    return uuid;
}

#pragma endregion UserMemBlock

#pragma region BleUUID

v8::Local<v8::Object> BleUUID::ToJs()
{
    Nan::EscapableHandleScope scope;
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();

    Utility::Set(obj, "uuid", native->uuid);
    Utility::Set(obj, "type", native->type);
    Utility::Set(obj, "typeString", ConversionUtility::valueToJsString(native->type, uuid_type_name_map));

    return scope.Escape(obj);
}

ble_uuid_t *BleUUID::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto uuid = new ble_uuid_t();

    uuid->uuid = ConversionUtility::getNativeUint16(jsobj, "uuid");
    uuid->type = ConversionUtility::getNativeUint8(jsobj, "type");

    return uuid;
}

#pragma endregion BleUUID

#pragma region UUID128

v8::Local<v8::Object> BleUUID128::ToJs()
{
    Nan::EscapableHandleScope scope;

    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    size_t uuid_len = 16 * 2 + 4 + 1; // Each byte -> 2 chars, 4 - separator _between_ some bytes and 1 byte null termination character
    auto uuid128string = static_cast<char*>(malloc(uuid_len));

    if (uuid128string == nullptr) {
        std::cerr << "uuid128string is null. Illegal state, terminating." << std::endl;
        std::terminate();
    }

    uint8_t *ptr = native->uuid128;

    sprintf(uuid128string, "%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x", ptr[0], ptr[1], ptr[2], ptr[3], ptr[4], ptr[5], ptr[6], ptr[7], ptr[8], ptr[9], ptr[10], ptr[11], ptr[12], ptr[13], ptr[14], ptr[15]);
    Utility::Set(obj, "uuid128", uuid128string);
    free(uuid128string);

    return scope.Escape(obj);
}

ble_uuid128_t *BleUUID128::ToNative()
{
    if (Utility::IsNull(jsobj))
    {
        return nullptr;
    }

    auto uuid = new ble_uuid128_t();

    uint32_t ptr[16];

    v8::Local<v8::Value> uuidObject = Utility::Get(jsobj, "uuid128");
    v8::Local<v8::String> uuidString = uuidObject->ToString();
    size_t uuid_len = uuidString->Length() + 1;
    auto uuidPtr = static_cast<char*>(malloc(uuid_len));

    if (uuidPtr == nullptr) {
        std::cerr << "uuidPtr is null. Illegal state, terminating." << std::endl;
        std::terminate();
    }

    uuidString->WriteUtf8(uuidPtr, uuid_len);

    auto scan_count = sscanf(uuidPtr,
        "%2x%2x%2x%2x%2x%2x%2x%2x%2x%2x%2x%2x%2x%2x%2x%2x",
        &(ptr[15]), &(ptr[14]),
        &(ptr[13]), &(ptr[12]),
        &(ptr[11]), &(ptr[10]),
        &(ptr[9]), &(ptr[8]),
        &(ptr[7]), &(ptr[6]),
        &(ptr[5]), &(ptr[4]),
        &(ptr[3]), &(ptr[2]),
        &(ptr[1]), &(ptr[0]));

    if (scan_count != 16) {
        std::cerr << "scan_count is not 16, illegal state, terminating." << std::endl;
        std::terminate();
    }

    free(uuidPtr);

    for (auto i = 0; i < scan_count; ++i)
    {
        uuid->uuid128[i] = static_cast<uint8_t>(ptr[i]);
    }

    return uuid;
}

#pragma endregion UUID128

extern "C" {
    void init_adapter_list(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target);
    void init_driver(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target);
    void init_types(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target);
    void init_ranges(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target);
    void init_ble(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target);
    void init_hci(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target);
    void init_error(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target);
    void init_app_status(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target);

    NAN_MODULE_INIT(init)
    {
        init_adapter_list(target);
        init_driver(target);
        init_types(target);
        init_ranges(target);
        init_ble(target);
        init_hci(target);
        init_error(target);
        init_app_status(target);
        init_gap(target);
        init_gatt(target);
        init_gattc(target);
        init_gatts(target);

        Adapter::Init(target);

        init_uecc(target);
    }

    void init_adapter_list(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target)
    {
        Utility::SetMethod(target, "getAdapters", GetAdapterList);
    }

    void init_driver(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target)
    {
        // Constants used for log events
        NODE_DEFINE_CONSTANT(target, SD_RPC_LOG_TRACE);
        NODE_DEFINE_CONSTANT(target, SD_RPC_LOG_DEBUG);
        NODE_DEFINE_CONSTANT(target, SD_RPC_LOG_INFO);
        NODE_DEFINE_CONSTANT(target, SD_RPC_LOG_WARNING);
        NODE_DEFINE_CONSTANT(target, SD_RPC_LOG_ERROR);
        NODE_DEFINE_CONSTANT(target, SD_RPC_LOG_FATAL);
    }

    void init_types(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target)
    {
        // Constants from ble_types.h

        /** BLE_CONN_HANDLES BLE Connection Handles */
        NODE_DEFINE_CONSTANT(target, BLE_CONN_HANDLE_INVALID); /* Invalid Connection Handle. */
        NODE_DEFINE_CONSTANT(target, BLE_CONN_HANDLE_ALL); /* Applies to all Connection Handles. */

        /** BLE_UUID_VALUES Assigned Values for BLE UUIDs */
        /* Generic UUIDs, applicable to all services */
        NODE_DEFINE_CONSTANT(target, BLE_UUID_UNKNOWN); /* Reserved UUID. */
        NODE_DEFINE_CONSTANT(target, BLE_UUID_SERVICE_PRIMARY); /* Primary Service. */
        NODE_DEFINE_CONSTANT(target, BLE_UUID_SERVICE_SECONDARY); /* Secondary Service. */
        NODE_DEFINE_CONSTANT(target, BLE_UUID_SERVICE_INCLUDE); /* Include. */
        NODE_DEFINE_CONSTANT(target, BLE_UUID_CHARACTERISTIC); /* Characteristic. */
        NODE_DEFINE_CONSTANT(target, BLE_UUID_DESCRIPTOR_CHAR_EXT_PROP); /* Characteristic Extended Properties Descriptor. */
        NODE_DEFINE_CONSTANT(target, BLE_UUID_DESCRIPTOR_CHAR_USER_DESC); /* Characteristic User Description Descriptor. */
        NODE_DEFINE_CONSTANT(target, BLE_UUID_DESCRIPTOR_CLIENT_CHAR_CONFIG); /* Client Characteristic Configuration Descriptor. */
        NODE_DEFINE_CONSTANT(target, BLE_UUID_DESCRIPTOR_SERVER_CHAR_CONFIG); /* Server Characteristic Configuration Descriptor. */
        NODE_DEFINE_CONSTANT(target, BLE_UUID_DESCRIPTOR_CHAR_PRESENTATION_FORMAT); /* Characteristic Presentation Format Descriptor. */
        NODE_DEFINE_CONSTANT(target, BLE_UUID_DESCRIPTOR_CHAR_AGGREGATE_FORMAT); /* Characteristic Aggregate Format Descriptor. */
        /* GATT specific UUIDs */
        NODE_DEFINE_CONSTANT(target, BLE_UUID_GATT); /* Generic Attribute Profile. */
        NODE_DEFINE_CONSTANT(target, BLE_UUID_GATT_CHARACTERISTIC_SERVICE_CHANGED); /* Service Changed Characteristic. */
        /* GAP specific UUIDs */
        NODE_DEFINE_CONSTANT(target, BLE_UUID_GAP); /* Generic Access Profile. */
        NODE_DEFINE_CONSTANT(target, BLE_UUID_GAP_CHARACTERISTIC_DEVICE_NAME); /* Device Name Characteristic. */
        NODE_DEFINE_CONSTANT(target, BLE_UUID_GAP_CHARACTERISTIC_APPEARANCE); /* Appearance Characteristic. */
        NODE_DEFINE_CONSTANT(target, BLE_UUID_GAP_CHARACTERISTIC_PPF); /* Peripheral Privacy Flag Characteristic. */
        NODE_DEFINE_CONSTANT(target, BLE_UUID_GAP_CHARACTERISTIC_RECONN_ADDR); /* Reconnection Address Characteristic. */
        NODE_DEFINE_CONSTANT(target, BLE_UUID_GAP_CHARACTERISTIC_PPCP); /* Peripheral Preferred Connection Parameters Characteristic. */

        /**  BLE_UUID_TYPES Types of UUID */
        NODE_DEFINE_CONSTANT(target, BLE_UUID_TYPE_UNKNOWN); /* Invalid UUID type. */
        NODE_DEFINE_CONSTANT(target, BLE_UUID_TYPE_BLE); /* Bluetooth SIG UUID (16-bit). */
        NODE_DEFINE_CONSTANT(target, BLE_UUID_TYPE_VENDOR_BEGIN); /* Vendor UUID types start at this index (128-bit). */

        /** BLE_APPEARANCES Bluetooth Appearance values
        *  @note Retrieved from http://developer.bluetooth.org/gatt/characteristics/Pages/CharacteristicViewer.aspx?u=org.bluetooth.characteristic.gap.appearance.xml
        * */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_UNKNOWN); /* TGest */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_GENERIC_PHONE); /* Generic Phone. */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_GENERIC_COMPUTER); /* Generic Computer. */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_GENERIC_WATCH); /* Generic Watch. */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_WATCH_SPORTS_WATCH); /* Watch: Sports Watch. */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_GENERIC_CLOCK); /* Generic Clock. */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_GENERIC_DISPLAY); /* Generic Display. */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_GENERIC_REMOTE_CONTROL); /* Generic Remote Control. */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_GENERIC_EYE_GLASSES); /* Generic Eye-glasses. */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_GENERIC_TAG); /* Generic Tag. */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_GENERIC_KEYRING); /* Generic Keyring. */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_GENERIC_MEDIA_PLAYER); /* Generic Media Player. */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_GENERIC_BARCODE_SCANNER); /* Generic Barcode Scanner. */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_GENERIC_THERMOMETER); /* Generic Thermometer. */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_THERMOMETER_EAR); /* Thermometer: Ear. */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_GENERIC_HEART_RATE_SENSOR); /* Generic Heart rate Sensor. */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_HEART_RATE_SENSOR_HEART_RATE_BELT); /* Heart Rate Sensor: Heart Rate Belt. */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_GENERIC_BLOOD_PRESSURE); /* Generic Blood Pressure. */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_BLOOD_PRESSURE_ARM); /* Blood Pressure: Arm. */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_BLOOD_PRESSURE_WRIST); /* Blood Pressure: Wrist. */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_GENERIC_HID); /* Human Interface Device (HID). */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_HID_KEYBOARD); /* Keyboard (HID Subtype). */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_HID_MOUSE); /* Mouse (HID Subtype). */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_HID_JOYSTICK); /* Joystiq (HID Subtype). */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_HID_GAMEPAD); /* Gamepad (HID Subtype). */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_HID_DIGITIZERSUBTYPE); /* Digitizer Tablet (HID Subtype). */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_HID_CARD_READER); /* Card Reader (HID Subtype). */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_HID_DIGITAL_PEN); /* Digital Pen (HID Subtype). */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_HID_BARCODE); /* Barcode Scanner (HID Subtype). */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_GENERIC_GLUCOSE_METER); /* Generic Glucose Meter. */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_GENERIC_RUNNING_WALKING_SENSOR); /* Generic Running Walking Sensor. */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_RUNNING_WALKING_SENSOR_IN_SHOE); /* Running Walking Sensor: In-Shoe. */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_RUNNING_WALKING_SENSOR_ON_SHOE); /* Running Walking Sensor: On-Shoe. */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_RUNNING_WALKING_SENSOR_ON_HIP); /* Running Walking Sensor: On-Hip. */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_GENERIC_CYCLING); /* Generic Cycling. */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_CYCLING_CYCLING_COMPUTER); /* Cycling: Cycling Computer. */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_CYCLING_SPEED_SENSOR); /* Cycling: Speed Sensor. */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_CYCLING_CADENCE_SENSOR); /* Cycling: Cadence Sensor. */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_CYCLING_POWER_SENSOR); /* Cycling: Power Sensor. */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_CYCLING_SPEED_CADENCE_SENSOR); /* Cycling: Speed and Cadence Sensor. */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_GENERIC_PULSE_OXIMETER); /* Generic Pulse Oximeter. */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_PULSE_OXIMETER_FINGERTIP); /* Fingertip (Pulse Oximeter subtype). */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_PULSE_OXIMETER_WRIST_WORN); /* Wrist Worn(Pulse Oximeter subtype). */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_GENERIC_WEIGHT_SCALE); /* Generic Weight Scale. */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_GENERIC_OUTDOOR_SPORTS_ACT); /* Generic Outdoor Sports Activity. */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_OUTDOOR_SPORTS_ACT_LOC_DISP); /* Location Display Device (Outdoor Sports Activity subtype). */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_OUTDOOR_SPORTS_ACT_LOC_AND_NAV_DISP); /* Location and Navigation Display Device (Outdoor Sports Activity subtype). */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_OUTDOOR_SPORTS_ACT_LOC_POD); /* Location Pod (Outdoor Sports Activity subtype). */
        NODE_DEFINE_CONSTANT(target, BLE_APPEARANCE_OUTDOOR_SPORTS_ACT_LOC_AND_NAV_POD); /* Location and Navigation Pod (Outdoor Sports Activity subtype). */
    }

    void init_ranges(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target)
    {
        NODE_DEFINE_CONSTANT(target, BLE_SVC_BASE);           /**< Common BLE SVC base. */
        NODE_DEFINE_CONSTANT(target, BLE_SVC_LAST);           /**< Total: 12. */
        NODE_DEFINE_CONSTANT(target, BLE_RESERVED_SVC_BASE);  /**< Reserved BLE SVC base. */
        NODE_DEFINE_CONSTANT(target, BLE_RESERVED_SVC_LAST);  /**< Total: 4. */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SVC_BASE);       /**< GAP BLE SVC base. */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_SVC_LAST);       /**< Total: 32. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTC_SVC_BASE);     /**< GATTC BLE SVC base. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTC_SVC_LAST);     /**< Total: 32. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_SVC_BASE);     /**< GATTS BLE SVC base. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_SVC_LAST);     /**< Total: 16. */
        NODE_DEFINE_CONSTANT(target, BLE_L2CAP_SVC_BASE);     /**< L2CAP BLE SVC base. */
        NODE_DEFINE_CONSTANT(target, BLE_L2CAP_SVC_LAST);     /**< Total: 16. */
        NODE_DEFINE_CONSTANT(target, BLE_EVT_INVALID);        /**< Invalid BLE Event. */
        NODE_DEFINE_CONSTANT(target, BLE_EVT_BASE);           /**< Common BLE Event base. */
        NODE_DEFINE_CONSTANT(target, BLE_EVT_LAST);           /**< Total: 15. */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_EVT_BASE);       /**< GAP BLE Event base. */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_EVT_LAST);       /**< Total: 32. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTC_EVT_BASE);     /**< GATTC BLE Event base. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTC_EVT_LAST);     /**< Total: 32. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_EVT_BASE);     /**< GATTS BLE Event base. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_EVT_LAST);     /**< Total: 32. */
        NODE_DEFINE_CONSTANT(target, BLE_L2CAP_EVT_BASE);     /**< L2CAP BLE Event base. */
        NODE_DEFINE_CONSTANT(target, BLE_L2CAP_EVT_LAST);     /**< Total: 32.  */
        NODE_DEFINE_CONSTANT(target, BLE_OPT_INVALID);        /**< Invalid BLE Option. */
        NODE_DEFINE_CONSTANT(target, BLE_OPT_BASE);           /**< Common BLE Option base. */
        NODE_DEFINE_CONSTANT(target, BLE_OPT_LAST);           /**< Total: 31. */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_OPT_BASE);       /**< GAP BLE Option base. */
        NODE_DEFINE_CONSTANT(target, BLE_GAP_OPT_LAST);       /**< Total: 32. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTC_OPT_BASE);     /**< GATTC BLE Option base. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTC_OPT_LAST);     /**< Total: 32. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_OPT_BASE);     /**< GATTS BLE Option base. */
        NODE_DEFINE_CONSTANT(target, BLE_GATTS_OPT_LAST);     /**< Total: 32. */
        NODE_DEFINE_CONSTANT(target, BLE_L2CAP_OPT_BASE);     /**< L2CAP BLE Option base. */
        NODE_DEFINE_CONSTANT(target, BLE_L2CAP_OPT_LAST);     /**< Total: 32.  */
    }

    void init_ble(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target)
    {
        NODE_DEFINE_CONSTANT(target, BLE_USER_MEM_TYPE_INVALID);                /**< Invalid User Memory Types. */
        NODE_DEFINE_CONSTANT(target, BLE_USER_MEM_TYPE_GATTS_QUEUED_WRITES);    /**< User Memory for GATTS queued writes. */
        NODE_DEFINE_CONSTANT(target, BLE_UUID_VS_COUNT_DEFAULT);                /**< Use the default VS UUID count (10 for this version of the SoftDevice). */
        NODE_DEFINE_CONSTANT(target, BLE_UUID_VS_COUNT_MIN);                    /**< Minimum VS UUID count. */

        NODE_DEFINE_CONSTANT(target, BLE_EVT_TX_COMPLETE);                      /**< Transmission Complete. @ref ble_evt_tx_complete_t */
        NODE_DEFINE_CONSTANT(target, BLE_EVT_USER_MEM_REQUEST);                 /**< User Memory request. @ref ble_evt_user_mem_request_t */
        NODE_DEFINE_CONSTANT(target, BLE_EVT_USER_MEM_RELEASE);                 /**< User Memory release. @ref ble_evt_user_mem_release_t */
    }

    void init_hci(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target)
    {
        //Constants from ble_hci.h

        /* BLE_HCI_STATUS_CODES Bluetooth status codes */
        NODE_DEFINE_CONSTANT(target, BLE_HCI_STATUS_CODE_SUCCESS); //Success.
        NODE_DEFINE_CONSTANT(target, BLE_HCI_STATUS_CODE_UNKNOWN_BTLE_COMMAND); //Unknown BLE Command.
        NODE_DEFINE_CONSTANT(target, BLE_HCI_STATUS_CODE_UNKNOWN_CONNECTION_IDENTIFIER); //Unknown Connection Identifier.
        /*0x03 Hardware Failure
        0x04 Page Timeout
        */
        NODE_DEFINE_CONSTANT(target, BLE_HCI_AUTHENTICATION_FAILURE); //Authentication Failure.
        NODE_DEFINE_CONSTANT(target, BLE_HCI_STATUS_CODE_PIN_OR_KEY_MISSING); //Pin or Key missing.
        NODE_DEFINE_CONSTANT(target, BLE_HCI_MEMORY_CAPACITY_EXCEEDED); //Memory Capacity Exceeded.
        NODE_DEFINE_CONSTANT(target, BLE_HCI_CONNECTION_TIMEOUT); //Connection Timeout.
        /*0x09 Connection Limit Exceeded
        0x0A Synchronous Connection Limit To A Device Exceeded
        0x0B ACL Connection Already Exists*/
        NODE_DEFINE_CONSTANT(target, BLE_HCI_STATUS_CODE_COMMAND_DISALLOWED); //Command Disallowed.
        /*0x0D Connection Rejected due to Limited Resources
        0x0E Connection Rejected Due To Security Reasons
        0x0F Connection Rejected due to Unacceptable BD_ADDR
        0x10 Connection Accept Timeout Exceeded
        0x11 Unsupported Feature or Parameter Value*/
        NODE_DEFINE_CONSTANT(target, BLE_HCI_STATUS_CODE_INVALID_BTLE_COMMAND_PARAMETERS); //Invalid BLE Command Parameters.
        NODE_DEFINE_CONSTANT(target, BLE_HCI_REMOTE_USER_TERMINATED_CONNECTION); //Remote User Terminated Connection.
        NODE_DEFINE_CONSTANT(target, BLE_HCI_REMOTE_DEV_TERMINATION_DUE_TO_LOW_RESOURCES); //* Remote Device Terminated Connection due to low resources.
        NODE_DEFINE_CONSTANT(target, BLE_HCI_REMOTE_DEV_TERMINATION_DUE_TO_POWER_OFF); //Remote Device Terminated Connection due to power off.
        NODE_DEFINE_CONSTANT(target, BLE_HCI_LOCAL_HOST_TERMINATED_CONNECTION); //Local Host Terminated Connection.
        /*
        0x17 Repeated Attempts
        0x18 Pairing Not Allowed
        0x19 Unknown LMP PDU
        */
        NODE_DEFINE_CONSTANT(target, BLE_HCI_UNSUPPORTED_REMOTE_FEATURE); //Unsupported Remote Feature.
        /*
        0x1B SCO Offset Rejected
        0x1C SCO Interval Rejected
        0x1D SCO Air Mode Rejected*/
        NODE_DEFINE_CONSTANT(target, BLE_HCI_STATUS_CODE_INVALID_LMP_PARAMETERS); //Invalid LMP Parameters.
        NODE_DEFINE_CONSTANT(target, BLE_HCI_STATUS_CODE_UNSPECIFIED_ERROR); //Unspecified Error.
        /*0x20 Unsupported LMP Parameter Value
        0x21 Role Change Not Allowed
        */
        NODE_DEFINE_CONSTANT(target, BLE_HCI_STATUS_CODE_LMP_RESPONSE_TIMEOUT); //LMP Response Timeout.
        /*0x23 LMP Error Transaction Collision*/
        NODE_DEFINE_CONSTANT(target, BLE_HCI_STATUS_CODE_LMP_PDU_NOT_ALLOWED); //LMP PDU Not Allowed.
        /*0x25 Encryption Mode Not Acceptable
        0x26 Link Key Can Not be Changed
        0x27 Requested QoS Not Supported
        */
        NODE_DEFINE_CONSTANT(target, BLE_HCI_INSTANT_PASSED); //Instant Passed.
        NODE_DEFINE_CONSTANT(target, BLE_HCI_PAIRING_WITH_UNIT_KEY_UNSUPPORTED); //Pairing with Unit Key Unsupported.
        NODE_DEFINE_CONSTANT(target, BLE_HCI_DIFFERENT_TRANSACTION_COLLISION); //Different Transaction Collision.
        /*
        0x2B Reserved
        0x2C QoS Unacceptable Parameter
        0x2D QoS Rejected
        0x2E Channel Classification Not Supported
        0x2F Insufficient Security
        0x30 Parameter Out Of Mandatory Range
        0x31 Reserved
        0x32 Role Switch Pending
        0x33 Reserved
        0x34 Reserved Slot Violation
        0x35 Role Switch Failed
        0x36 Extended Inquiry Response Too Large
        0x37 Secure Simple Pairing Not Supported By Host.
        0x38 Host Busy - Pairing
        0x39 Connection Rejected due to No Suitable Channel Found*/
        NODE_DEFINE_CONSTANT(target, BLE_HCI_CONTROLLER_BUSY); //Controller Busy.
        NODE_DEFINE_CONSTANT(target, BLE_HCI_CONN_INTERVAL_UNACCEPTABLE); //Connection Interval Unacceptable.
        NODE_DEFINE_CONSTANT(target, BLE_HCI_DIRECTED_ADVERTISER_TIMEOUT); //Directed Adverisement Timeout.
        NODE_DEFINE_CONSTANT(target, BLE_HCI_CONN_TERMINATED_DUE_TO_MIC_FAILURE); //Connection Terminated due to MIC Failure.
        NODE_DEFINE_CONSTANT(target, BLE_HCI_CONN_FAILED_TO_BE_ESTABLISHED); //Connection Failed to be Established.
    }

    void init_error(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target)
    {
        NODE_DEFINE_CONSTANT(target, NRF_ERROR_BASE_NUM);      ///< Global error base
        NODE_DEFINE_CONSTANT(target, NRF_ERROR_SDM_BASE_NUM);  ///< SDM error base
        NODE_DEFINE_CONSTANT(target, NRF_ERROR_SOC_BASE_NUM);  ///< SoC error base
        NODE_DEFINE_CONSTANT(target, NRF_ERROR_STK_BASE_NUM);  ///< STK error base

        NODE_DEFINE_CONSTANT(target, NRF_SUCCESS);                           ///< Successful command
        NODE_DEFINE_CONSTANT(target, NRF_ERROR_SVC_HANDLER_MISSING);         ///< SVC handler is missing
        NODE_DEFINE_CONSTANT(target, NRF_ERROR_SOFTDEVICE_NOT_ENABLED);      ///< SoftDevice has not been enabled
        NODE_DEFINE_CONSTANT(target, NRF_ERROR_INTERNAL);                    ///< Internal Error
        NODE_DEFINE_CONSTANT(target, NRF_ERROR_NO_MEM);                      ///< No Memory for operation
        NODE_DEFINE_CONSTANT(target, NRF_ERROR_NOT_FOUND);                   ///< Not found
        NODE_DEFINE_CONSTANT(target, NRF_ERROR_NOT_SUPPORTED);               ///< Not supported
        NODE_DEFINE_CONSTANT(target, NRF_ERROR_INVALID_PARAM);               ///< Invalid Parameter
        NODE_DEFINE_CONSTANT(target, NRF_ERROR_INVALID_STATE);               ///< Invalid state, operation disallowed in this state
        NODE_DEFINE_CONSTANT(target, NRF_ERROR_INVALID_LENGTH);              ///< Invalid Length
        NODE_DEFINE_CONSTANT(target, NRF_ERROR_INVALID_FLAGS);               ///< Invalid Flags
        NODE_DEFINE_CONSTANT(target, NRF_ERROR_INVALID_DATA);                ///< Invalid Data
        NODE_DEFINE_CONSTANT(target, NRF_ERROR_DATA_SIZE);                   ///< Data size exceeds limit
        NODE_DEFINE_CONSTANT(target, NRF_ERROR_TIMEOUT);                     ///< Operation timed out
        NODE_DEFINE_CONSTANT(target, NRF_ERROR_NULL);                        ///< Null Pointer
        NODE_DEFINE_CONSTANT(target, NRF_ERROR_FORBIDDEN);                   ///< Forbidden Operation
        NODE_DEFINE_CONSTANT(target, NRF_ERROR_INVALID_ADDR);                ///< Bad Memory Address
        NODE_DEFINE_CONSTANT(target, NRF_ERROR_BUSY);                        ///< Busy
        NODE_DEFINE_CONSTANT(target, NRF_ERROR_CONN_COUNT);                  ///< Maximum connection count exceeded
        NODE_DEFINE_CONSTANT(target, NRF_ERROR_RESOURCES);                   ///< Not enough resources for operation
    }

    void init_app_status(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target)
    {
        NODE_DEFINE_CONSTANT(target, PKT_SEND_MAX_RETRIES_REACHED);
        NODE_DEFINE_CONSTANT(target, PKT_UNEXPECTED);
        NODE_DEFINE_CONSTANT(target, PKT_ENCODE_ERROR);
        NODE_DEFINE_CONSTANT(target, PKT_DECODE_ERROR);
        NODE_DEFINE_CONSTANT(target, PKT_SEND_ERROR);
        NODE_DEFINE_CONSTANT(target, IO_RESOURCES_UNAVAILABLE);
        NODE_DEFINE_CONSTANT(target, RESET_PERFORMED);
        NODE_DEFINE_CONSTANT(target, CONNECTION_ACTIVE);
    }
}

NODE_MODULE(ble_driver, init)
