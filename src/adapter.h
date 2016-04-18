/* Copyright (c) 2016 Nordic Semiconductor. All Rights Reserved.
 *
 * The information contained herein is property of Nordic Semiconductor ASA.
 * Terms and conditions of usage are described in detail in NORDIC
 * SEMICONDUCTOR STANDARD SOFTWARE LICENSE AGREEMENT.
 *
 * Licensees are granted free, non-transferable use of the information. NO
 * WARRANTY of ANY KIND is provided. This heading must NOT be removed from
 * the file.
 *
 */

#ifndef ADAPTER_H
#define ADAPTER_H

#include <nan.h>
#include <chrono>
#include <map>

#include "sd_rpc.h"

#include "circular_fifo_unsafe.h"

const auto EVENT_QUEUE_SIZE = 64;
const auto LOG_QUEUE_SIZE = 64;
const auto STATUS_QUEUE_SIZE = 64;

#define ADAPTER_METHOD_DEFINITIONS(MainName) \
    static NAN_METHOD(MainName); \
    static void MainName(uv_work_t *req); \
    static void After##MainName(uv_work_t *req);

struct LogEntry {
public:
    sd_rpc_log_severity_t severity;
    std::string message;
};

struct EventEntry {
public:
    ble_evt_t *event;
    std::string timestamp;
    int adapterID;
};

struct StatusEntry
{
public:
    sd_rpc_app_status_t id;
    std::string message;
    std::string timestamp;
};

//using namespace memory_relaxed_aquire_release;
using namespace memory_sequential_unsafe;

typedef CircularFifo<EventEntry *, EVENT_QUEUE_SIZE> EventQueue;
typedef CircularFifo<LogEntry *, LOG_QUEUE_SIZE> LogQueue;
typedef CircularFifo<StatusEntry *, STATUS_QUEUE_SIZE> StatusQueue;

class Adapter : public Nan::ObjectWrap {
public:
    static NAN_MODULE_INIT(Init);

    static Adapter *getAdapter(adapter_t *adapter, Adapter *defaultAdapter = nullptr);

    adapter_t *getInternalAdapter() const;

    void initEventHandling(Nan::Callback *callback, const uint32_t interval);
    void appendEvent(ble_evt_t *event);

    void onRpcEvent(uv_async_t *handle);
    void eventIntervalCallback(uv_timer_t *handle);

    void initLogHandling(Nan::Callback *callback);
    void appendLog(LogEntry *log);

    void onLogEvent(uv_async_t *handle);

    void initStatusHandling(Nan::Callback *callback);
    void appendStatus(StatusEntry *log);

    void onStatusEvent(uv_async_t *handle);

    void cleanUpV8Resources();

    // Statistics:
    int32_t getEventCallbackTotalTime() const;
    uint32_t getEventCallbackCount() const;
    uint32_t getEventCallbackMaxCount() const;
    uint32_t getEventCallbackBatchNumber() const;
    uint32_t getEventCallbackBatchEventTotalCount() const;

    double getAverageCallbackBatchCount() const;

    void addEventBatchStatistics(std::chrono::milliseconds duration);

private:
    explicit Adapter();
    ~Adapter();

    static Nan::Persistent<v8::Function> constructor;

    static NAN_METHOD(New);

    // General async methods
    ADAPTER_METHOD_DEFINITIONS(Open);
    ADAPTER_METHOD_DEFINITIONS(Close);
    ADAPTER_METHOD_DEFINITIONS(EnableBLE);
    ADAPTER_METHOD_DEFINITIONS(GetVersion);
    ADAPTER_METHOD_DEFINITIONS(AddVendorSpecificUUID);
    ADAPTER_METHOD_DEFINITIONS(EncodeUUID);
    ADAPTER_METHOD_DEFINITIONS(DecodeUUID);
    ADAPTER_METHOD_DEFINITIONS(ReplyUserMemory);

    // General sync methods
    static NAN_METHOD(GetStats);

    // Gap async mehtods
    ADAPTER_METHOD_DEFINITIONS(GapSetAddress);
    ADAPTER_METHOD_DEFINITIONS(GapGetAddress);
    ADAPTER_METHOD_DEFINITIONS(GapUpdateConnectionParameters);
    ADAPTER_METHOD_DEFINITIONS(GapDisconnect);
    ADAPTER_METHOD_DEFINITIONS(GapSetTXPower);
    ADAPTER_METHOD_DEFINITIONS(GapSetDeviceName);
    ADAPTER_METHOD_DEFINITIONS(GapGetDeviceName);
    ADAPTER_METHOD_DEFINITIONS(GapStartRSSI);
    ADAPTER_METHOD_DEFINITIONS(GapStopRSSI);
    ADAPTER_METHOD_DEFINITIONS(GapGetRSSI);
    ADAPTER_METHOD_DEFINITIONS(GapStartScan);
    ADAPTER_METHOD_DEFINITIONS(GapStopScan);
    ADAPTER_METHOD_DEFINITIONS(GapConnect);
    ADAPTER_METHOD_DEFINITIONS(GapCancelConnect);
    ADAPTER_METHOD_DEFINITIONS(GapStartAdvertising);
    ADAPTER_METHOD_DEFINITIONS(GapStopAdvertising);
    ADAPTER_METHOD_DEFINITIONS(GapSetAdvertisingData);
    ADAPTER_METHOD_DEFINITIONS(GapReplySecurityParameters);
    ADAPTER_METHOD_DEFINITIONS(GapGetConnectionSecurity);
    ADAPTER_METHOD_DEFINITIONS(GapEncrypt);
    ADAPTER_METHOD_DEFINITIONS(GapReplySecurityInfo);
    ADAPTER_METHOD_DEFINITIONS(GapAuthenticate);
    ADAPTER_METHOD_DEFINITIONS(GapSetPPCP);
    ADAPTER_METHOD_DEFINITIONS(GapGetPPCP);
    ADAPTER_METHOD_DEFINITIONS(GapSetAppearance);
    ADAPTER_METHOD_DEFINITIONS(GapGetAppearance);
    ADAPTER_METHOD_DEFINITIONS(GapReplyAuthKey);
    ADAPTER_METHOD_DEFINITIONS(GapReplyDHKeyLESC);

    ADAPTER_METHOD_DEFINITIONS(GapNotifyKeypress);
    ADAPTER_METHOD_DEFINITIONS(GapGetLESCOOBData);

    ADAPTER_METHOD_DEFINITIONS(GapSetLESCOOBData);

    // Gattc async mehtods
    ADAPTER_METHOD_DEFINITIONS(GattcDiscoverPrimaryServices);
    ADAPTER_METHOD_DEFINITIONS(GattcDiscoverRelationship);
    ADAPTER_METHOD_DEFINITIONS(GattcDiscoverCharacteristics);
    ADAPTER_METHOD_DEFINITIONS(GattcDiscoverDescriptors);
    ADAPTER_METHOD_DEFINITIONS(GattcReadCharacteristicValueByUUID);
    ADAPTER_METHOD_DEFINITIONS(GattcRead);
    ADAPTER_METHOD_DEFINITIONS(GattcReadCharacteristicValues);
    ADAPTER_METHOD_DEFINITIONS(GattcWrite);
    ADAPTER_METHOD_DEFINITIONS(GattcConfirmHandleValue);

    // Gatts async mehtods
    ADAPTER_METHOD_DEFINITIONS(GattsAddService);
    ADAPTER_METHOD_DEFINITIONS(GattsAddCharacteristic);
    ADAPTER_METHOD_DEFINITIONS(GattsAddDescriptor);
    ADAPTER_METHOD_DEFINITIONS(GattsHVX);
    ADAPTER_METHOD_DEFINITIONS(GattsSystemAttributeSet);
    ADAPTER_METHOD_DEFINITIONS(GattsSetValue);
    ADAPTER_METHOD_DEFINITIONS(GattsGetValue);
    ADAPTER_METHOD_DEFINITIONS(GattsReplyReadWriteAuthorize);

    static void initGeneric(v8::Local<v8::FunctionTemplate> tpl);
    static void initGap(v8::Local<v8::FunctionTemplate> tpl);
    static void initGattC(v8::Local<v8::FunctionTemplate> tpl);
    static void initGattS(v8::Local<v8::FunctionTemplate> tpl);

    void dispatchEvents();
    static uint32_t enableBLE(adapter_t *adapter);

    void createSecurityKeyStorage(const uint16_t connHandle, ble_gap_sec_keyset_t *keyset);
    void destroySecurityKeyStorage(const uint16_t connHandle);
    ble_gap_sec_keyset_t *getSecurityKey(const uint16_t connHandle);

    std::map<uint16_t, ble_gap_sec_keyset_t *> keysetMap;

    adapter_t *adapter;
    EventQueue eventQueue;
    LogQueue logQueue;
    StatusQueue statusQueue;

    Nan::Callback *eventCallback;
    Nan::Callback *logCallback;
    Nan::Callback *statusCallback;

    // Interval to use for sending BLE driver events to JavaScript. If 0 events will be sent as soon as they are received from the BLE driver.
    uint32_t eventInterval;
    uv_timer_t* eventIntervalTimer;
    uv_async_t* asyncEvent;

    uv_async_t* asyncLog;
    uv_async_t* asyncStatus;

    uv_mutex_t* adapterCloseMutex;

    // Statistics:
    // Accumulated deltas for event callbacks done to the driver
    std::chrono::milliseconds eventCallbackDuration;
    uint32_t eventCallbackCount;

    // Max number of events in queue before sending it to JavaScript
    uint32_t eventCallbackMaxCount;
    uint32_t eventCallbackBatchEventCounter;
    uint32_t eventCallbackBatchEventTotalCount;
    uint32_t eventCallbackBatchNumber;
};
#endif
