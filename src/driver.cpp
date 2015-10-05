#include <iostream>
#include <deque>
#include <mutex>
#include <chrono>

#include <ble.h>
#include "driver.h"
#include "driver_gap.h"
#include "driver_gatt.h"
#include "driver_gattc.h"
#include "circular_fifo_unsafe.h"

using namespace std;
//using namespace memory_relaxed_aquire_release;
using namespace memory_sequential_unsafe;

/*

package.json:

To compile for node:
"cmake-js": {
"runtime": "node",
"runtimeVersion": "0.12.4",
"arch": "ia32"
},


To compile for electron:
"cmake-js": {
"runtime": "electron",
"runtimeVersion": "0.29.1",
"arch": "ia32"
},

*/

typedef CircularFifo<EventEntry *, 64> EventQueue;
typedef CircularFifo<LogEntry *, 64> LogQueue;

// Macro for keeping sanity in event switch case below
#define GAP_EVT_CASE(evt_enum, evt_to_js, params_name, event_array, event_array_idx, event_entry) \
    case BLE_GAP_EVT_##evt_enum:                                                                                        \
    {                                                                                                                   \
        ble_gap_evt_t gap_event = event_entry->event->evt.gap_evt;                                                      \
        std::string timestamp = event_entry->timestamp;                                                                 \
        v8::Local<v8::Value> js_event =                                                                                 \
            Gap##evt_to_js(timestamp, gap_event.conn_handle, &(gap_event.params.params_name)).ToJs();                   \
        event_array->Set(Nan::New<v8::Integer>(event_array_idx), js_event);                                               \
        break;                                                                                                          \
    }

// Macro for keeping sanity in event switch case below
#define GATTC_EVT_CASE(evt_enum, evt_to_js, params_name, event_array, event_array_idx, event_entry) \
    case BLE_GATTC_EVT_##evt_enum:                                                                                        \
    {                                                                                                                   \
        ble_gattc_evt_t *gattc_event = &(event_entry->event->evt.gattc_evt);                                                      \
        std::string timestamp = event_entry->timestamp;                                                                 \
        v8::Local<v8::Value> js_event =                                                                                 \
            Gattc##evt_to_js(timestamp, gattc_event->conn_handle, gattc_event->gatt_status, gattc_event->error_handle, &(gattc_event->params.params_name)).ToJs();                   \
        event_array->Set(Nan::New<v8::Integer>(event_array_idx), js_event);                                               \
        break;                                                                                                          \
    }

static name_map_t uuid_type_name_map = {
    NAME_MAP_ENTRY(BLE_UUID_TYPE_UNKNOWN),
    NAME_MAP_ENTRY(BLE_UUID_TYPE_BLE),
    NAME_MAP_ENTRY(BLE_UUID_TYPE_VENDOR_BEGIN)
};

uv_async_t async_log;

// Interval to use for sending BLE driver events to JavaScript. If 0 events will be sent as soon as they are received from the BLE driver.
uint32_t evt_interval;
uv_timer_t evt_interval_timer;
uv_async_t async_event;

// Accumulated deltas for event callbacks done to the driver
chrono::milliseconds evt_cb_duration;
uint32_t evt_cb_count;

// Max number of events in queue before sending it to JavaScript
uint32_t evt_cb_max_count;
uint32_t evt_cb_batch_evt_counter;
uint32_t evt_cb_batch_evt_total_count;
uint32_t evt_cb_batch_number;

// This is just a hack for now. Just want to test the event-loop all the way up to JavaScript.
NanCallback *driver_log_callback;
NanCallback *driver_event_callback;

// This function is ran by the thread that the SoftDevice Driver has initiated
void sd_rpc_on_log_event(sd_rpc_log_severity_t severity, const char *log_message)
{
    int length = strlen(log_message);

    void *message = malloc((size_t) (length + 1));
    memset(message, 0, (size_t) (length + 1));
    memcpy(message, log_message, (size_t) length);

    LogEntry *log_entry = new LogEntry();
    log_entry->message = (char*)message;
    log_entry->severity = severity;

    LogQueue *log_queue = ((LogQueue*)async_log.data);
    log_queue->push(log_entry);

    uv_async_send(&async_log);
}

// Now we are in the NodeJS thread. Call callbacks.
void on_log_event(uv_async_t *handle)
{
    NanScope();

    LogQueue *log_entries_buffer = (LogQueue*)handle->data;

    while (!log_entries_buffer->wasEmpty())
    {
        LogEntry *log_entry;
        log_entries_buffer->pop(log_entry);

        if (driver_log_callback != NULL)
        {
            v8::Local<v8::Value> argv[2];
            argv[0] = ConversionUtility::toJsNumber((int)log_entry->severity);
            argv[1] = ConversionUtility::toJsString(log_entry->message);
            driver_log_callback->Call(2, argv);
        }

        // Free memory for current entry, we remove the element from the deque when the iteration is done
        free(log_entry->message);
        delete log_entry;
    }
}

// Sends events upstream
void send_events_upstream()
{
    // Trigger callback in NodeJS thread to call NodeJS callbacks
    uv_async_send(&async_event);
}

void event_interval_callback(uv_timer_t *handle)
{
    send_events_upstream();
}

size_t findSize(ble_evt_t *event)
{
    return max(static_cast<unsigned long>(event->header.evt_len), sizeof(ble_evt_t));
}

void sd_rpc_on_event(ble_evt_t *event)
{
    // TODO: Clarification:
    // The lifecycle for the event is controlled by the driver. We must not free any memory related to the incoming event.

    if (event == NULL) return;

    /*if (event->header.evt_id == BLE_GATTC_EVT_PRIM_SRVC_DISC_RSP)
    {
        std::cout << "====================================" << std::endl;
        std::cout << "Length: " << event->header.evt_len << std::endl;
        std::cout << "Count: " << event->evt.gattc_evt.params.prim_srvc_disc_rsp.count << std::endl;
        for (int i = 0; i < event->evt.gattc_evt.params.prim_srvc_disc_rsp.count; ++i)
        {
            std::cout << "Service " << i << ": " << std::endl;
            std::cout << "\tuuid: " << hex << event->evt.gattc_evt.params.prim_srvc_disc_rsp.services[i].uuid.uuid << " "
                                    << event->evt.gattc_evt.params.prim_srvc_disc_rsp.services[i].uuid.type << std::endl;
            std::cout << "\thandle range: " << hex << event->evt.gattc_evt.params.prim_srvc_disc_rsp.services[i].handle_range.start_handle << " "
                                    << event->evt.gattc_evt.params.prim_srvc_disc_rsp.services[i].handle_range.end_handle << std::endl;
        }
        std::cout << "====================================" << std::endl;
    }*/

    evt_cb_count += 1;
    evt_cb_batch_evt_counter += 1;

    if (evt_cb_batch_evt_counter > evt_cb_max_count) evt_cb_max_count = evt_cb_batch_evt_counter;

    size_t size = findSize(event);

    void *evt = malloc(size);
    memset(evt, 0, size);
    memcpy(evt, event, size);

    EventEntry *event_entry = new EventEntry();
    event_entry->event = (ble_evt_t*)evt;
    event_entry->timestamp = getCurrentTimeInMilliseconds();

    EventQueue *event_queue = (EventQueue*)async_event.data;
    event_queue->push(event_entry);

    // If the event interval is not set, send the events to NodeJS as soon as possible.
    if (evt_interval == 0) send_events_upstream();
}

// Now we are in the NodeJS thread. Call callbacks.
void on_rpc_event(uv_async_t *handle)
{
    NanScope();
    // TODO: Check if we must add NanScope() to this function

    EventQueue *event_entries = (EventQueue*)handle->data;

    if (event_entries->wasEmpty()) return;

    // Update statistics (evaluate if we shall lock the statistics counters to get more preceise data)
    evt_cb_batch_evt_total_count += evt_cb_batch_evt_counter;
    evt_cb_batch_evt_counter = 0;
    evt_cb_batch_number += 1;

    v8::Local<v8::Array> array = Nan::New<v8::Array>();
    int array_idx = 0;

    while (!event_entries->wasEmpty())
    {
        EventEntry *event_entry;
        event_entries->pop(event_entry);
        ble_evt_t *event = event_entry->event;

        if (driver_event_callback != NULL)
        {
            switch (event->header.evt_id)
            {
                GAP_EVT_CASE(CONNECTED, Connected, connected, array, array_idx, event_entry);
                GAP_EVT_CASE(DISCONNECTED, Disconnected, disconnected, array, array_idx, event_entry);
                GAP_EVT_CASE(ADV_REPORT, AdvReport, adv_report, array, array_idx, event_entry);
                GAP_EVT_CASE(SCAN_REQ_REPORT, ScanReqReport, scan_req_report, array, array_idx, event_entry);
                GAP_EVT_CASE(TIMEOUT, Timeout, timeout, array, array_idx, event_entry);
                GAP_EVT_CASE(RSSI_CHANGED, RssiChanged, rssi_changed, array, array_idx, event_entry);
                GAP_EVT_CASE(CONN_PARAM_UPDATE, ConnParamUpdate, conn_param_update, array, array_idx, event_entry);
                GAP_EVT_CASE(CONN_PARAM_UPDATE_REQUEST, ConnParamUpdateRequest, conn_param_update_request, array, array_idx, event_entry);

                GATTC_EVT_CASE(PRIM_SRVC_DISC_RSP, PrimaryServiceDiscoveryEvent, prim_srvc_disc_rsp, array, array_idx, event_entry);
                GATTC_EVT_CASE(REL_DISC_RSP, RelationshipDiscoveryEvent, rel_disc_rsp, array, array_idx, event_entry);
                GATTC_EVT_CASE(CHAR_DISC_RSP, CharacteristicDiscoveryEvent, char_disc_rsp, array, array_idx, event_entry);
                GATTC_EVT_CASE(DESC_DISC_RSP, DescriptorDiscoveryEvent, desc_disc_rsp, array, array_idx, event_entry);
                GATTC_EVT_CASE(CHAR_VAL_BY_UUID_READ_RSP, CharacteristicValueReadByUUIDEvent, char_val_by_uuid_read_rsp, array, array_idx, event_entry);
                GATTC_EVT_CASE(READ_RSP, ReadEvent, read_rsp, array, array_idx, event_entry);
                GATTC_EVT_CASE(CHAR_VALS_READ_RSP, CharacteristicValueReadEvent, char_vals_read_rsp, array, array_idx, event_entry);
                GATTC_EVT_CASE(WRITE_RSP, WriteEvent, write_rsp, array, array_idx, event_entry);
                GATTC_EVT_CASE(HVX, HandleValueNotificationEvent, hvx, array, array_idx, event_entry);
                GATTC_EVT_CASE(TIMEOUT, TimeoutEvent, timeout, array, array_idx, event_entry);
            default:
                std::cout << "Event " << event->header.evt_id << " unknown to me." << std::endl;
                break;
            }
        }

        array_idx++;

        // Free memory for current entry
        free(event_entry->event);
        delete event_entry;
    }

    v8::Local<v8::Value> callback_value[1];
    callback_value[0] = array;

    auto start = chrono::high_resolution_clock::now();
    driver_event_callback->Call(1, callback_value);
    auto end = chrono::high_resolution_clock::now();

    chrono::milliseconds duration = chrono::duration_cast<chrono::milliseconds>(end - start);
    evt_cb_duration += duration;
}

// This function runs in the Main Thread
NAN_METHOD(Open) {
    NanScope();

    // Path to device
    if (!args[0]->IsString()) {
        NanThrowTypeError("First argument must be a string");
        NanReturnUndefined();
    }
    v8::String::Utf8Value path(args[0]->ToString());

    // Options
    if (!args[1]->IsObject()) {
        NanThrowTypeError("Second argument must be an object");
        NanReturnUndefined();
    }
    v8::Local<v8::Object> options = args[1]->ToObject();

    // Callback
    if (!args[2]->IsFunction()) {
        NanThrowTypeError("Third argument must be a function");
        NanReturnUndefined();
    }
    v8::Local<v8::Function> callback = args[2].As<v8::Function>();

    OpenBaton *baton = new OpenBaton(callback);

    strncpy(baton->path, *path, PATH_STRING_SIZE);

    baton->baud_rate = ConversionUtility::getNativeUint32(options, "baudRate");
    baton->parity = ToParityEnum(options->Get(Nan::New<v8::String>("parity"))->ToString());
    baton->flow_control = ToFlowControlEnum(options->Get(Nan::New<v8::String>("flowControl"))->ToString());
    baton->evt_interval = ConversionUtility::getNativeUint32(options, "eventInterval");
    baton->log_level = ToLogSeverityEnum(options->Get(Nan::New<v8::String>("logLevel"))->ToString());

    baton->log_callback = new NanCallback(options->Get(Nan::New<v8::String>("logCallback")).As<v8::Function>());
    baton->event_callback = new NanCallback(options->Get(Nan::New<v8::String>("eventCallback")).As<v8::Function>());

    uv_queue_work(uv_default_loop(), baton->req, Open, (uv_after_work_cb)AfterOpen);

    NanReturnUndefined();
}

// This runs in a worker thread (not Main Thread)
void Open(uv_work_t *req) {
    OpenBaton *baton = static_cast<OpenBaton *>(req->data);

    lock_guard<mutex> lock(ble_driver_call_mutex);

    // Setup log related functionality
    driver_log_callback = baton->log_callback; // TODO: do not use a global variable for storing the callback
    uv_async_init(uv_default_loop(), &async_log, on_log_event);
    LogQueue *log_queue = new LogQueue();
    async_log.data = log_queue;

    sd_rpc_log_handler_severity_filter_set(baton->log_level);
    sd_rpc_log_handler_set(sd_rpc_on_log_event);

    // Setup serial port related settings
    sd_rpc_serial_port_name_set(baton->path);
    sd_rpc_serial_baud_rate_set(baton->baud_rate);
    sd_rpc_serial_flow_control_set(baton->flow_control);

    sd_rpc_serial_parity_set(baton->parity);

    // Setup event related functionality
    evt_interval = baton->evt_interval;
    driver_event_callback = baton->event_callback;
    uv_async_init(uv_default_loop(), &async_event, on_rpc_event);
    EventQueue *event_queue = new EventQueue();
    async_event.data = event_queue;

    sd_rpc_evt_handler_set(sd_rpc_on_event);

    // Setup event interval functionality
    if (evt_interval > 0)
    {
        uv_timer_init(uv_default_loop(), &evt_interval_timer);
        uv_timer_start(&evt_interval_timer, event_interval_callback, evt_interval, evt_interval);
    }

    // Open RPC connection to device
    int err = sd_rpc_open();

    if (err != NRF_SUCCESS) {
        // Need to communicate back to Main Thread that this failed.
        baton->result = err;
        return;
    }



    ble_enable_params_t *ble_enable_params = new ble_enable_params_t();
    memset(ble_enable_params, 0, sizeof(ble_enable_params_t));
    ble_enable_params->gatts_enable_params.attr_tab_size = BLE_GATTS_ATTR_TAB_SIZE_DEFAULT;
    ble_enable_params->gatts_enable_params.service_changed = false;

    baton->result = sd_ble_enable(ble_enable_params);
}

// This runs in  Main Thread
void AfterOpen(uv_work_t *req) {
    NanScope();

    // TODO: handle if .Close is called before this function is called.
    OpenBaton *baton = static_cast<OpenBaton *>(req->data);
    delete req;

    v8::Local<v8::Value> argv[1];

    if (baton->result != NRF_SUCCESS)
    {
        lock_guard<mutex> lock(ble_driver_call_mutex);

        argv[0] = ErrorMessage::getErrorMessage(baton->result, "opening port");

        sd_rpc_log_handler_set(NULL); // Stop reciving events

        uv_close((uv_handle_t*)&async_log, NULL); // Close the async handlers for log events
        delete baton->log_callback; // Free the memory for the callback

        if (baton->event_callback != NULL)
        {
            sd_rpc_evt_handler_set(NULL);
            delete baton->event_callback;
        }
    }
    else
    {
        argv[0] = Nan::Undefined();
    }

    baton->callback->Call(1, argv);
    delete baton;
}

NAN_METHOD(Close) {
    NanScope();

    lock_guard<mutex> lock(ble_driver_call_mutex);
    sd_rpc_close();

    NanReturnUndefined();
}

NAN_INLINE sd_rpc_parity_t ToParityEnum(const v8::Handle<v8::String>& v8str) {
    NanScope();

    sd_rpc_parity_t parity = SD_RPC_PARITY_NONE;

    if (v8str->Equals(Nan::New("none")))
    {
        parity = SD_RPC_PARITY_NONE;
    }
    else if (v8str->Equals(Nan::New("even")))
    {
        parity = SD_RPC_PARITY_EVEN;
    }

    return parity;
}

NAN_INLINE sd_rpc_flow_control_t ToFlowControlEnum(const v8::Handle<v8::String>& v8str) {
    NanScope();

    sd_rpc_flow_control_t flow_control = SD_RPC_FLOW_CONTROL_NONE;

    if (v8str->Equals(Nan::New("none")))
    {
        flow_control = SD_RPC_FLOW_CONTROL_NONE;
    }
    else if (v8str->Equals(Nan::New("hw")))
    {
        flow_control = SD_RPC_FLOW_CONTROL_HARDWARE;
    }

    return flow_control;
}

NAN_INLINE sd_rpc_log_severity_t ToLogSeverityEnum(const v8::Handle<v8::String>& v8str) {
    NanScope();

    sd_rpc_log_severity_t log_severity = SD_RPC_LOG_DEBUG;

    if(v8str->Equals(Nan::New("trace")))
    {
        log_severity = SD_RPC_LOG_TRACE;
    }
    else if (v8str->Equals(Nan::New("debug")))
    {
        log_severity = SD_RPC_LOG_DEBUG;
    }
    else if (v8str->Equals(Nan::New("info")))
    {
        log_severity = SD_RPC_LOG_INFO;
    }
    else if (v8str->Equals(Nan::New("error")))
    {
        log_severity = SD_RPC_LOG_ERROR;
    }
    else if (v8str->Equals(Nan::New("fatal")))
    {
        log_severity = SD_RPC_LOG_FATAL;
    }

    return log_severity;
}

NAN_METHOD(GetVersion)
{
    NanScope();

    // Callback
    if (!args[0]->IsFunction()) {
        NanThrowTypeError("First argument must be a function");
        NanReturnUndefined();
    }
    v8::Local<v8::Function> callback = args[0].As<v8::Function>();

    ble_version_t *version = new ble_version_t();
    memset(version, 0, sizeof(ble_version_t));

    GetVersionBaton *baton = new GetVersionBaton(callback);
    baton->version = version;

    uv_queue_work(uv_default_loop(), baton->req, GetVersion, (uv_after_work_cb)AfterGetVersion);

    NanReturnUndefined();
}

void GetVersion(uv_work_t *req) {
    GetVersionBaton *baton = static_cast<GetVersionBaton *>(req->data);

    lock_guard<mutex> lock(ble_driver_call_mutex);
    baton->result = sd_ble_version_get(baton->version);
}

// This runs in Main Thread
void AfterGetVersion(uv_work_t *req) {
    NanScope();

    GetVersionBaton *baton = static_cast<GetVersionBaton *>(req->data);
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

NAN_METHOD(GetStats)
{
    NanScope();

    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Nan::Set(obj, Nan::New("event_callback_total_time").ToLocalChecked(), ConversionUtility::toJsNumber((int32_t)evt_cb_duration.count()));
    Nan::Set(obj, Nan::New("event_callback_total_count").ToLocalChecked(), ConversionUtility::toJsNumber(evt_cb_count));
    Nan::Set(obj, Nan::New("event_callback_batch_max_count").ToLocalChecked(), ConversionUtility::toJsNumber(evt_cb_max_count));

    double avg_cb_batch_count = 0.0;

    if (evt_cb_batch_number != 0)
    {
        avg_cb_batch_count = evt_cb_batch_evt_total_count / evt_cb_batch_number;
    }

    Nan::Set(obj, Nan::New("event_callback_batch_avg_count").ToLocalChecked(), ConversionUtility::toJsNumber(avg_cb_batch_count));

    NanReturnValue(obj);
}

//
// Version -- START --
//

v8::Local<v8::Object> Version::ToJs()
{
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Nan::Set(obj, Nan::New("version_number").ToLocalChecked(), ConversionUtility::toJsNumber(native->version_number));
    Nan::Set(obj, Nan::New("company_id").ToLocalChecked(), ConversionUtility::toJsNumber(native->company_id));
    Nan::Set(obj, Nan::New("subversion_number").ToLocalChecked(), ConversionUtility::toJsNumber(native->subversion_number));
    return obj;
}

ble_version_t *Version::ToNative()
{
    ble_version_t *version = new ble_version_t();
    version->version_number = ConversionUtility::getNativeUint8(jsobj, "version_number");
    version->company_id = ConversionUtility::getNativeUint16(jsobj, "company_id");
    version->subversion_number = ConversionUtility::getNativeUint16(jsobj, "subversion_number");
    return version;
}

//
// Version -- END --
//

//
// BleUUID -- START --
//

v8::Local<v8::Object> BleUUID::ToJs()
{
    v8::Local<v8::Object> obj = Nan::New<v8::Object>();
    Nan::Set(obj, Nan::New("uuid").ToLocalChecked(), ConversionUtility::toJsNumber(native->uuid));
    Nan::Set(obj, Nan::New("type").ToLocalChecked(), ConversionUtility::toJsNumber(native->type));
    Nan::Set(obj, Nan::New("typeString").ToLocalChecked(), ConversionUtility::valueToJsString(native->type, uuid_type_name_map));
    return obj;
}

ble_uuid_t *BleUUID::ToNative()
{
    ble_uuid_t *uuid = new ble_uuid_t();

    uuid->uuid = ConversionUtility::getNativeUint16(jsobj, "uuid");
    uuid->type = ConversionUtility::getNativeUint8(jsobj, "type");

    return uuid;
}

//
// BleUUID -- END --
//

//
// UUID128 -- START --
//

v8::Local<v8::Object> BleUUID128::ToJs()
{
    v8::Handle<v8::Object> obj = Nan::New<v8::Object>();
    size_t uuid_len = 16 * 2 + 4 + 1; // Each byte -> 2 chars, 4 - separator _between_ some bytes and 1 byte null termination character
    char *uuid128string = (char*)malloc(uuid_len);
    uint8_t *ptr = native->uuid128;

    sprintf(uuid128string, "%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x", ptr[0], ptr[1], ptr[2], ptr[3], ptr[4], ptr[5], ptr[6], ptr[7], ptr[8], ptr[9], ptr[10], ptr[11], ptr[12], ptr[13], ptr[14], ptr[15]);
    Nan::Set(obj, Nan::New("uuid128").ToLocalChecked(), ConversionUtility::toJsString(uuid128string));
    free(uuid128string);
    return obj;
}

ble_uuid128_t *BleUUID128::ToNative()
{
    //TODO: Convert from js to native
    return new ble_uuid128_t();
}

//
// UUID128 -- END --
//

extern "C" {
    void init_driver(v8::Handle<v8::Object> target);
    void init_types(v8::Handle<v8::Object> target);
    void init_ranges(v8::Handle<v8::Object> target);
    void init_hci(v8::Handle<v8::Object> target);
    void init_error(v8::Handle<v8::Object> target);

    void init(v8::Handle<v8::Object> target)
    {
        NanScope();

        init_driver(target);
        init_types(target);
        init_ranges(target);
        init_hci(target);
        init_error(target);
        init_gap(target);
        init_gatt(target);
        init_gattc(target);
    }

    void init_driver(v8::Handle<v8::Object> target)
    {
        NODE_SET_METHOD(target, "open", Open);
        NODE_SET_METHOD(target, "close", Close);
        NODE_SET_METHOD(target, "get_version", GetVersion);

        NODE_SET_METHOD(target, "get_stats", GetStats);

        // Constants used for log events
        NODE_DEFINE_CONSTANT(target, SD_RPC_LOG_TRACE);
        NODE_DEFINE_CONSTANT(target, SD_RPC_LOG_DEBUG);
        NODE_DEFINE_CONSTANT(target, SD_RPC_LOG_INFO);
        NODE_DEFINE_CONSTANT(target, SD_RPC_LOG_WARNING);
        NODE_DEFINE_CONSTANT(target, SD_RPC_LOG_ERROR);
        NODE_DEFINE_CONSTANT(target, SD_RPC_LOG_FATAL);
    }

    void init_types(v8::Handle<v8::Object> target)
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

    void init_ranges(v8::Handle<v8::Object> target)
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

    void init_hci(v8::Handle<v8::Object> target)
    {
        // Constants from ble_hci.h

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

    void init_error(v8::Handle<v8::Object> target)
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
    }
}

NODE_MODULE(ble_driver, init)
