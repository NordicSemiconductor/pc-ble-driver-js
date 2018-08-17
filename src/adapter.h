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

#ifndef ADAPTER_H
#define ADAPTER_H

#include <nan.h>
#include <chrono>
#include <map>
#include <memory>

#include "sd_rpc.h"

#include "circular_fifo_unsafe.h"

const auto EVENT_QUEUE_SIZE = 64;
const auto LOG_QUEUE_SIZE = 64;
const auto STATUS_QUEUE_SIZE = 64;

#define ADAPTER_METHOD_DEFINITIONS(MainName) \
    static NAN_METHOD(MainName); \
    static void MainName(uv_work_t *req); \
    static void After##MainName(uv_work_t *req);

struct LogEntry
{
public:
    sd_rpc_log_severity_t severity;
    std::string message;
};

struct EventEntry
{
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

class Adapter : public Nan::ObjectWrap
{
public:
    static NAN_MODULE_INIT(Init);

    static Adapter *getAdapter(adapter_t *adapter, Adapter *defaultAdapter = nullptr);

    adapter_t *getInternalAdapter() const;

    void initEventHandling(std::unique_ptr<Nan::Callback> &callback, const uint32_t interval);
    void appendEvent(ble_evt_t *event);

    void onRpcEvent(uv_async_t *handle);
    void eventIntervalCallback(uv_timer_t *handle);

    void initLogHandling(std::unique_ptr<Nan::Callback> &callback);
    void appendLog(LogEntry *log);

    void onLogEvent(uv_async_t *handle);

    void initStatusHandling(std::unique_ptr<Nan::Callback> &callback);
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
    ADAPTER_METHOD_DEFINITIONS(ConnReset);
    ADAPTER_METHOD_DEFINITIONS(EnableBLE);
    ADAPTER_METHOD_DEFINITIONS(GetVersion);
    ADAPTER_METHOD_DEFINITIONS(AddVendorSpecificUUID);
    ADAPTER_METHOD_DEFINITIONS(EncodeUUID);
    ADAPTER_METHOD_DEFINITIONS(DecodeUUID);
    ADAPTER_METHOD_DEFINITIONS(ReplyUserMemory);
    ADAPTER_METHOD_DEFINITIONS(SetBleOption);
    ADAPTER_METHOD_DEFINITIONS(GetBleOption);

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
#if NRF_SD_BLE_API_VERSION >= 3
    ADAPTER_METHOD_DEFINITIONS(GattcExchangeMtuRequest);
#endif

    // Gatts async mehtods
    ADAPTER_METHOD_DEFINITIONS(GattsAddService);
    ADAPTER_METHOD_DEFINITIONS(GattsAddCharacteristic);
    ADAPTER_METHOD_DEFINITIONS(GattsAddDescriptor);
    ADAPTER_METHOD_DEFINITIONS(GattsHVX);
    ADAPTER_METHOD_DEFINITIONS(GattsSystemAttributeSet);
    ADAPTER_METHOD_DEFINITIONS(GattsSetValue);
    ADAPTER_METHOD_DEFINITIONS(GattsGetValue);
    ADAPTER_METHOD_DEFINITIONS(GattsReplyReadWriteAuthorize);
#if NRF_SD_BLE_API_VERSION >= 3
    ADAPTER_METHOD_DEFINITIONS(GattsExchangeMtuReply);
#endif

    static void initGeneric(v8::Local<v8::FunctionTemplate> tpl);
    static void initGap(v8::Local<v8::FunctionTemplate> tpl);
    static void initGattC(v8::Local<v8::FunctionTemplate> tpl);
    static void initGattS(v8::Local<v8::FunctionTemplate> tpl);

    void dispatchEvents();
    static uint32_t enableBLE(adapter_t *adapter, ble_enable_params_t *ble_enable_params);

    void createSecurityKeyStorage(const uint16_t connHandle, ble_gap_sec_keyset_t *keyset);
    void destroySecurityKeyStorage(const uint16_t connHandle);
    ble_gap_sec_keyset_t *getSecurityKey(const uint16_t connHandle);

    std::map<uint16_t, ble_gap_sec_keyset_t *> keysetMap;

    adapter_t *adapter;
    EventQueue eventQueue;
    LogQueue logQueue;
    StatusQueue statusQueue;

    std::unique_ptr<Nan::Callback> eventCallback;
    std::unique_ptr<Nan::Callback> logCallback;
    std::unique_ptr<Nan::Callback> statusCallback;

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
