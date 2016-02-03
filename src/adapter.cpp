#include "adapter.h"
#include "common.h"

Nan::Persistent<v8::Function> Adapter::constructor;

std::vector<Adapter *> adapters;

NAN_MODULE_INIT(Adapter::Init)
{
    v8::Local<v8::FunctionTemplate> tpl = Nan::New<v8::FunctionTemplate>(New);
    tpl->SetClassName(Nan::New("Adapter").ToLocalChecked());
    tpl->InstanceTemplate()->SetInternalFieldCount(1);

    initGeneric(tpl);
    initGap(tpl);

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
            std::terminate();
            //TODO: Errormessage
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
            std::terminate();
            //TODO: Errormessage
        }
    }
}

void Adapter::initEventHandling(Nan::Callback *callback, uint32_t interval)
{
    eventInterval = interval;

    // Setup event related functionality
    eventCallback = callback;
    asyncEvent.data = static_cast<void *>(this);
    uv_async_init(uv_default_loop(), &asyncEvent, event_handler);

    // Setup event interval functionality
    if (eventInterval > 0)
    {
        eventIntervalTimer.data = static_cast<void *>(this);
        uv_timer_init(uv_default_loop(), &eventIntervalTimer);
        uv_timer_start(&eventIntervalTimer, event_interval_handler, eventInterval, eventInterval);
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
            std::terminate();
        }
    }
}

void Adapter::initLogHandling(Nan::Callback *callback)
{
    // Setup event related functionality
    logCallback = callback;
    asyncLog.data = static_cast<void *>(this);
    uv_async_init(uv_default_loop(), &asyncLog, log_handler);
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
            std::terminate();
            //TODO: Errormessage
        }
    }
}

void Adapter::initStatusHandling(Nan::Callback *callback)
{
    // Setup event related functionality
    statusCallback = callback;
    asyncStatus.data = static_cast<void *>(this);
    uv_async_init(uv_default_loop(), &asyncStatus, status_handler);
}

void Adapter::removeCallbacks()
{
    closing = true;

    if (eventCallback != nullptr)
    {
        delete eventCallback;
        eventCallback = nullptr;
    }

    if (logCallback != nullptr)
    {
        delete logCallback;
        logCallback = nullptr;
    }

    if (statusCallback != nullptr)
    {
        delete statusCallback;
        statusCallback = nullptr;
    }

    uv_close(reinterpret_cast<uv_handle_t *>(&asyncLog), nullptr);
    uv_close(reinterpret_cast<uv_handle_t *>(&asyncEvent), nullptr);
    uv_close(reinterpret_cast<uv_handle_t *>(&asyncStatus), nullptr);
}

void Adapter::initGeneric(v8::Local<v8::FunctionTemplate> tpl)
{
    Nan::SetPrototypeMethod(tpl, "open", Open);
    Nan::SetPrototypeMethod(tpl, "close", Close);
    Nan::SetPrototypeMethod(tpl, "getVersion", GetVersion);
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
    Nan::SetPrototypeMethod(tpl, "gapReplySecurityParameters", GapReplySecurityParameters);
    Nan::SetPrototypeMethod(tpl, "gapGetConnectionSecurity", GapGetConnectionSecurity);
    Nan::SetPrototypeMethod(tpl, "gapEncrypt", GapEncrypt);
    Nan::SetPrototypeMethod(tpl, "gapReplySecurityInfo", GapReplySecurityInfo);
    Nan::SetPrototypeMethod(tpl, "gapAuthenticate", GapAuthenticate);
    Nan::SetPrototypeMethod(tpl, "gapSetPPCP", GapSetPPCP);
    Nan::SetPrototypeMethod(tpl, "gapGetPPCP", GapGetPPCP);
    Nan::SetPrototypeMethod(tpl, "gapSetAppearance", GapSetAppearance);
    Nan::SetPrototypeMethod(tpl, "gapGetAppearance", GapGetAppearance);
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
    adapters.push_back(this);
    adapter = nullptr;

    eventCallbackMaxCount = 0;
    eventCallbackBatchEventCounter = 0;
    eventCallbackBatchEventTotalCount = 0;
    eventCallbackBatchNumber = 0;

    eventCallback = nullptr;

    closing = false;
}

Adapter::~Adapter()
{
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
