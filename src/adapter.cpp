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

#include "adapter.h"
#include "common.h"

#include <algorithm>
#include <iostream>

Nan::Persistent<v8::Function> Adapter::constructor;

std::vector<Adapter *> adapters;

NAN_MODULE_INIT(Adapter::Init)
{
    v8::Local<v8::FunctionTemplate> tpl = Nan::New<v8::FunctionTemplate>(New);
    tpl->SetClassName(Nan::New("Adapter").ToLocalChecked());
    tpl->InstanceTemplate()->SetInternalFieldCount(1);

    initGeneric(tpl);
    initGap(tpl);
    initGattC(tpl);
    initGattS(tpl);

    constructor.Reset(Nan::GetFunction(tpl).ToLocalChecked());
    Nan::Set(target, Nan::New("Adapter").ToLocalChecked(), Nan::GetFunction(tpl).ToLocalChecked());
}

Adapter *Adapter::getAdapter(adapter_t *adapter, Adapter *defaultAdapter)
{
    if (adapter == nullptr)
    {
        return defaultAdapter;
    }

    for (auto value : adapters)
    {
        auto deviceAdapter = value->getInternalAdapter();

        if (deviceAdapter != nullptr)
        {
            if (value->getInternalAdapter()->internal == adapter->internal)
            {
                return value;
            }
        }
    }

    return defaultAdapter;
}

adapter_t *Adapter::getInternalAdapter() const
{
    return adapter;
}

extern "C" {
    void event_handler(uv_async_t *handle)
    {
        auto adapter = static_cast<Adapter *>(handle->data);

        if (adapter != nullptr)
        {
            adapter->onRpcEvent(handle);
        }
        else
        {
            std::cerr << "No AddOn adapter to process RPC event." << std::endl;
            std::terminate();
        }
    }

    void event_interval_handler(uv_timer_t *handle)
    {
        auto adapter = static_cast<Adapter *>(handle->data);

        if (adapter != nullptr)
        {
            adapter->eventIntervalCallback(handle);
        }
        else
        {
            std::cerr << "No AddOn adapter to process event interval callback." << std::endl;
            std::terminate();
        }
    }
}

void Adapter::initEventHandling(Nan::Callback *callback, uint32_t interval)
{
    eventInterval = interval;

    // Setup event related functionality
    eventCallback = callback;
    asyncEvent->data = static_cast<void *>(this);

    if (uv_async_init(uv_default_loop(), asyncEvent, event_handler) != 0) {
            std::cerr << "Not able to create a new async event handler." << std::endl;
            std::terminate();
        }

    // Setup event interval functionality
    if (eventInterval > 0)
    {
        if (eventIntervalTimer != nullptr) {
            eventIntervalTimer->data = static_cast<void *>(this);
            if (uv_timer_init(uv_default_loop(), eventIntervalTimer) != 0) {
            std::cerr << "Not able to create a new async event interval timer." << std::endl;
            std::terminate();
        }

            if (uv_timer_start(eventIntervalTimer, event_interval_handler, eventInterval, eventInterval) != 0) {
            std::cerr << "Not able to create a new event interval handler." << std::endl;
            std::terminate();
        }
        }
    }
}

extern "C" {
    void log_handler(uv_async_t *handle)
    {
        auto adapter = static_cast<Adapter *>(handle->data);

        if (adapter != nullptr)
        {
            adapter->onLogEvent(handle);
        }
        else
        {
            std::cerr << "No AddOn adapter to process log event." << std::endl;
            std::terminate();
        }
    }
}

void Adapter::initLogHandling(Nan::Callback *callback)
{
    // Setup event related functionality
    logCallback = callback;
    asyncLog->data = static_cast<void *>(this);

    if (asyncLog == nullptr)  {
        std::cerr << "asyncLog is null, terminating." << std::endl;
        std::terminate();
    }

    if (uv_async_init(uv_default_loop(), asyncLog, log_handler) != 0)
        {
            std::cerr << "Not able to create a new event log handler." << std::endl;
            std::terminate();
        }
}

extern "C" {
    void status_handler(uv_async_t *handle)
    {
        auto adapter = static_cast<Adapter *>(handle->data);

        if (adapter != nullptr)
        {
            adapter->onStatusEvent(handle);
        }
        else
        {
            std::cerr << "No AddOn adapter to process status event." << std::endl;
            std::terminate();
        }
    }
}

void Adapter::initStatusHandling(Nan::Callback *callback)
{
    // Setup event related functionality
    statusCallback = callback;
    asyncStatus->data = static_cast<void *>(this);

    if (uv_async_init(uv_default_loop(), asyncStatus, status_handler) != 0)
        {
            std::cerr << "Not able to create a new status handler." << std::endl;
            std::terminate();
        }
}

void Adapter::cleanUpV8Resources()
{
    uv_mutex_lock(adapterCloseMutex);

    if (asyncStatus != nullptr) {
        auto handle = reinterpret_cast<uv_handle_t *>(asyncStatus);
        uv_close(handle, [](uv_handle_t *handle) {
            free(handle);
        });

        asyncStatus = nullptr;
    }

    if (eventIntervalTimer != nullptr) {
        // Deallocate resources related to the event handling interval timer
        if (uv_timer_stop(eventIntervalTimer) != 0)
        {
            std::terminate();
        }

        auto handle = reinterpret_cast<uv_handle_t *>(eventIntervalTimer);
        uv_close(handle, [](uv_handle_t *handle) {
            free(handle);
        });

        eventIntervalTimer = nullptr;
    }

    if (asyncEvent != nullptr) {
        auto handle = reinterpret_cast<uv_handle_t *>(asyncEvent);

        uv_close(handle, [](uv_handle_t *handle) {
            free(handle);
        });

        asyncEvent = nullptr;
    }

    if (asyncLog != nullptr) {
        auto logHandle = reinterpret_cast<uv_handle_t *>(asyncLog);
        uv_close(logHandle, [](uv_handle_t *handle) {
            free(handle);
        });

        asyncLog = nullptr;
    }

    uv_mutex_unlock(adapterCloseMutex);
}

void Adapter::initGeneric(v8::Local<v8::FunctionTemplate> tpl)
{
    Nan::SetPrototypeMethod(tpl, "open", Open);
    Nan::SetPrototypeMethod(tpl, "close", Close);
    Nan::SetPrototypeMethod(tpl, "getVersion", GetVersion);
    Nan::SetPrototypeMethod(tpl, "enableBLE", EnableBLE);
    Nan::SetPrototypeMethod(tpl, "addVendorspecificUUID", AddVendorSpecificUUID);
    Nan::SetPrototypeMethod(tpl, "encodeUUID", EncodeUUID);
    Nan::SetPrototypeMethod(tpl, "decodeUUID", DecodeUUID);
    Nan::SetPrototypeMethod(tpl, "replyUserMemory", ReplyUserMemory);

    Nan::SetPrototypeMethod(tpl, "getStats", GetStats);
}

void Adapter::initGap(v8::Local<v8::FunctionTemplate> tpl)
{
    Nan::SetPrototypeMethod(tpl, "gapSetAddress", GapSetAddress);
    Nan::SetPrototypeMethod(tpl, "gapGetAddress", GapGetAddress);
    Nan::SetPrototypeMethod(tpl, "gapUpdateConnectionParameters", GapUpdateConnectionParameters);
    Nan::SetPrototypeMethod(tpl, "gapDisconnect", GapDisconnect);
    Nan::SetPrototypeMethod(tpl, "gapSetTXPower", GapSetTXPower);
    Nan::SetPrototypeMethod(tpl, "gapSetDeviceName", GapSetDeviceName);
    Nan::SetPrototypeMethod(tpl, "gapGetDeviceName", GapGetDeviceName);
    Nan::SetPrototypeMethod(tpl, "gapStartRSSI", GapStartRSSI);
    Nan::SetPrototypeMethod(tpl, "gapStopRSSI", GapStopRSSI);
    Nan::SetPrototypeMethod(tpl, "gapGetRSSI", GapGetRSSI);
    Nan::SetPrototypeMethod(tpl, "gapStartScan", GapStartScan);
    Nan::SetPrototypeMethod(tpl, "gapStopScan", GapStopScan);
    Nan::SetPrototypeMethod(tpl, "gapConnect", GapConnect);
    Nan::SetPrototypeMethod(tpl, "gapCancelConnect", GapCancelConnect);
    Nan::SetPrototypeMethod(tpl, "gapStartAdvertising", GapStartAdvertising);
    Nan::SetPrototypeMethod(tpl, "gapStopAdvertising", GapStopAdvertising);
    Nan::SetPrototypeMethod(tpl, "gapSetAdvertisingData", GapSetAdvertisingData);
    Nan::SetPrototypeMethod(tpl, "gapReplyAuthKey", GapReplyAuthKey);
    Nan::SetPrototypeMethod(tpl, "gapReplySecurityParameters", GapReplySecurityParameters);
    Nan::SetPrototypeMethod(tpl, "gapGetConnectionSecurity", GapGetConnectionSecurity);
    Nan::SetPrototypeMethod(tpl, "gapEncrypt", GapEncrypt);
    Nan::SetPrototypeMethod(tpl, "gapReplySecurityInfo", GapReplySecurityInfo);
    Nan::SetPrototypeMethod(tpl, "gapAuthenticate", GapAuthenticate);
    Nan::SetPrototypeMethod(tpl, "gapSetPPCP", GapSetPPCP);
    Nan::SetPrototypeMethod(tpl, "gapGetPPCP", GapGetPPCP);
    Nan::SetPrototypeMethod(tpl, "gapSetAppearance", GapSetAppearance);
    Nan::SetPrototypeMethod(tpl, "gapGetAppearance", GapGetAppearance);

    Nan::SetPrototypeMethod(tpl, "gapReplyLescDhKey", GapReplyDHKeyLESC);
    Nan::SetPrototypeMethod(tpl, "gapNotifyKeypress", GapNotifyKeypress);
    Nan::SetPrototypeMethod(tpl, "gapGetLescOobData", GapGetLESCOOBData);
    Nan::SetPrototypeMethod(tpl, "gapSetLescOobData", GapSetLESCOOBData);
}

void Adapter::initGattC(v8::Local<v8::FunctionTemplate> tpl)
{
    Nan::SetPrototypeMethod(tpl, "gattcDiscoverPrimaryServices", GattcDiscoverPrimaryServices);
    Nan::SetPrototypeMethod(tpl, "gattcDiscoverRelationship", GattcDiscoverRelationship);
    Nan::SetPrototypeMethod(tpl, "gattcDiscoverCharacteristics", GattcDiscoverCharacteristics);
    Nan::SetPrototypeMethod(tpl, "gattcDiscoverDescriptors", GattcDiscoverDescriptors);
    Nan::SetPrototypeMethod(tpl, "gattcReadCharacteristicValueByUUID", GattcReadCharacteristicValueByUUID);
    Nan::SetPrototypeMethod(tpl, "gattcRead", GattcRead);
    Nan::SetPrototypeMethod(tpl, "gattcReadCharacteristicValues", GattcReadCharacteristicValues);
    Nan::SetPrototypeMethod(tpl, "gattcWrite", GattcWrite);
    Nan::SetPrototypeMethod(tpl, "gattcConfirmHandleValue", GattcConfirmHandleValue);
}

void Adapter::initGattS(v8::Local<v8::FunctionTemplate> tpl)
{
    Nan::SetPrototypeMethod(tpl, "gattsAddService", GattsAddService);
    Nan::SetPrototypeMethod(tpl, "gattsAddCharacteristic", GattsAddCharacteristic);
    Nan::SetPrototypeMethod(tpl, "gattsAddDescriptor", GattsAddDescriptor);
    Nan::SetPrototypeMethod(tpl, "gattsHVX", GattsHVX);
    Nan::SetPrototypeMethod(tpl, "gattsSystemAttributeSet", GattsSystemAttributeSet);
    Nan::SetPrototypeMethod(tpl, "gattsSetValue", GattsSetValue);
    Nan::SetPrototypeMethod(tpl, "gattsGetValue", GattsGetValue);
    Nan::SetPrototypeMethod(tpl, "gattsReplyReadWriteAuthorize", GattsReplyReadWriteAuthorize);
}

Adapter::Adapter()
{
    adapter = nullptr;

    eventCallbackMaxCount = 0;
    eventCallbackBatchEventCounter = 0;
    eventCallbackBatchEventTotalCount = 0;
    eventCallbackBatchNumber = 0;

    eventCallback = nullptr;

    eventIntervalTimer = nullptr;

    asyncEvent = nullptr;
    asyncLog = nullptr;
    asyncStatus = nullptr;

    adapterCloseMutex = new uv_mutex_t();
    if (uv_mutex_init(adapterCloseMutex) != 0)
    {
        std::cerr << "Not able to create adapterCloseMutex! Terminating." << std::endl;
        std::terminate();
    }

    adapters.push_back(this);
}

Adapter::~Adapter()
{
    // Remove this adapter from the global container of adapters
    adapters.erase(std::find(adapters.begin(), adapters.end(), this));

    // Remove callbacks and cleanup uv_handle_t instances
    cleanUpV8Resources();

    uv_mutex_destroy(adapterCloseMutex);
}

NAN_METHOD(Adapter::New)
{
    if (info.IsConstructCall()) {
        auto obj = new Adapter();
        obj->Wrap(info.This());
        info.GetReturnValue().Set(info.This());
    } else {
        v8::Local<v8::Function> cons = Nan::New(constructor);
        info.GetReturnValue().Set(cons->NewInstance());
    }
}

int32_t Adapter::getEventCallbackTotalTime() const
{
    return static_cast<int32_t>(eventCallbackDuration.count());
}

uint32_t Adapter::getEventCallbackCount() const
{
    return eventCallbackCount;
}

uint32_t Adapter::getEventCallbackMaxCount() const
{
    return eventCallbackMaxCount;
}

uint32_t Adapter::getEventCallbackBatchNumber() const
{
    return eventCallbackBatchNumber;
}

uint32_t Adapter::getEventCallbackBatchEventTotalCount() const
{
    return eventCallbackBatchEventTotalCount;
}

double Adapter::getAverageCallbackBatchCount() const
{
    auto averageCallbackBatchCount = 0.0;

    if (getEventCallbackBatchNumber() != 0)
    {
        averageCallbackBatchCount = getEventCallbackBatchEventTotalCount() / getEventCallbackBatchNumber();
    }

    return averageCallbackBatchCount;
}

void Adapter::addEventBatchStatistics(std::chrono::milliseconds duration)
{
    eventCallbackDuration += duration;

    eventCallbackBatchEventTotalCount += eventCallbackBatchEventCounter;
    eventCallbackBatchEventCounter = 0;
    eventCallbackBatchNumber += 1;
}

void Adapter::createSecurityKeyStorage(const uint16_t connHandle, ble_gap_sec_keyset_t *keyset)
{
    ble_gap_sec_keyset_t *set = new ble_gap_sec_keyset_t();
    std::memcpy(set, keyset, sizeof(ble_gap_sec_keyset_t));

    keysetMap.insert(std::pair<uint16_t, ble_gap_sec_keyset_t *>(connHandle, set));
}

void Adapter::destroySecurityKeyStorage(const uint16_t connHandle)
{
    auto keys = keysetMap.find(connHandle);

    if (keys == keysetMap.end())
    {
        return;
    }

    auto keyset = keys->second;

    if (keyset->keys_own.p_enc_key != nullptr)
    {
        delete keyset->keys_own.p_enc_key;
    }

    if (keyset->keys_own.p_id_key != nullptr)
    {
        delete keyset->keys_own.p_id_key;
    }

    if (keyset->keys_own.p_sign_key != nullptr)
    {
        delete keyset->keys_own.p_sign_key;
    }

    if (keyset->keys_own.p_pk != nullptr)
    {
        delete keyset->keys_own.p_pk;
    }

    if (keyset->keys_peer.p_enc_key != nullptr)
    {
        delete keyset->keys_peer.p_enc_key;
    }

    if (keyset->keys_peer.p_id_key != nullptr)
    {
        delete keyset->keys_peer.p_id_key;
    }

    if (keyset->keys_peer.p_sign_key != nullptr)
    {
        delete keyset->keys_peer.p_sign_key;
    }

    if (keyset->keys_peer.p_pk != nullptr)
    {
        delete keyset->keys_peer.p_pk;
    }

    delete keyset;

    keysetMap.erase(connHandle);
}

ble_gap_sec_keyset_t *Adapter::getSecurityKey(const uint16_t connHandle)
{
    auto keyset = keysetMap.find(connHandle);

    if (keyset == keysetMap.end())
    {
        return 0;
    }

    return keyset->second;

}
