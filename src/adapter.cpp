#include "adapter.h"
#include "common.h"

Nan::Persistent<v8::Function> Adapter::constructor;

std::vector<Adapter *> adapterVector;

NAN_MODULE_INIT(Adapter::Init) {
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
    if (adapter == 0)
    {
        return defaultAdapter;
    }

    for (Adapter *value : adapterVector)
    {
        adapter_t *deviceAdapter = value->getInternalAdapter();

        if (deviceAdapter != 0)
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
    void on_rpc_event_hack(uv_async_t *handle)
    {
        Adapter *adapter = (Adapter *)handle->data;

        if (adapter != 0)
        {
            adapter->onRpcEvent(handle);
        }
        else
        {
            //TODO: Errormessage
        }
    }

    void event_interval_callback_hack(uv_timer_t *handle)
    {
        Adapter *adapter = (Adapter *)handle->data;

        if (adapter != 0)
        {
            adapter->eventIntervalCallback(handle);
        }
        else
        {
            //TODO: Errormessage
        }
    }
}

void Adapter::initEventHandling(Nan::Callback *callback, uint32_t interval)
{
    eventInterval = interval;

    // Setup event related functionality
    eventCallback = callback;
    asyncEvent.data = (void *)this;
    uv_async_init(uv_default_loop(), &asyncEvent, on_rpc_event_hack);

    // Setup event interval functionality
    if (eventInterval > 0)
    {
        eventIntervalTimer.data = (void *)this;
        uv_timer_init(uv_default_loop(), &eventIntervalTimer);
        uv_timer_start(&eventIntervalTimer, event_interval_callback_hack, eventInterval, eventInterval);
    }
}

extern "C" {
    void on_rpc_log_hack(uv_async_t *handle)
    {
        Adapter *adapter = (Adapter *)handle->data;

        if (adapter != 0)
        {
            adapter->onLogEvent(handle);
        }
        else
        {
            //TODO: Errormessage
        }
    }
}

void Adapter::initLogHandling(Nan::Callback *callback)
{
    // Setup event related functionality
    logCallback = callback;
    asyncLog.data = (void *)this;
    uv_async_init(uv_default_loop(), &asyncLog, on_rpc_log_hack);
}

extern "C" {
    void on_rpc_error_hack(uv_async_t *handle)
    {
        Adapter *adapter = (Adapter *)handle->data;

        if (adapter != 0)
        {
            adapter->onErrorEvent(handle);
        }
        else
        {
            //TODO: Errormessage
        }
    }
}

void Adapter::initErrorHandling(Nan::Callback *callback)
{
    // Setup event related functionality
    errorCallback = callback;
    asyncError.data = (void *)this;
    uv_async_init(uv_default_loop(), &asyncError, on_rpc_error_hack);
}

void Adapter::removeCallbacks()
{
    if (eventCallback != NULL)
    {
        delete eventCallback;
        eventCallback = NULL;
    }

    if (logCallback != NULL)
    {
        delete logCallback;
        logCallback = NULL;
    }

    if (errorCallback != NULL)
    {
        delete errorCallback;
        errorCallback = NULL;
    }

    uv_close((uv_handle_t *)&asyncLog, NULL);
    uv_close((uv_handle_t *)&asyncEvent, NULL);
    uv_close((uv_handle_t *)&asyncError, NULL);
}

void Adapter::initGeneric(v8::Local<v8::FunctionTemplate> tpl)
{
    Nan::SetPrototypeMethod(tpl, "open", Open);
    Nan::SetPrototypeMethod(tpl, "close", Close);
    Nan::SetPrototypeMethod(tpl, "getVersion", GetVersion);
    Nan::SetPrototypeMethod(tpl, "addVendorspecificUUID", AddVendorSpecificUUID);
    Nan::SetPrototypeMethod(tpl, "encodeUUID", UUIDEncode);
    Nan::SetPrototypeMethod(tpl, "decodeUUID", UUIDDecode);
    Nan::SetPrototypeMethod(tpl, "userMemoryReply", UserMemReply);

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
    Nan::SetPrototypeMethod(tpl, "gapSecParamsReply", GapSecParamsReply);
    Nan::SetPrototypeMethod(tpl, "gapConnSecGet", GapConnSecGet);
    Nan::SetPrototypeMethod(tpl, "gapEncrypt", GapEncrypt);
    Nan::SetPrototypeMethod(tpl, "gapSecInfoReply", GapSecInfoReply);
    Nan::SetPrototypeMethod(tpl, "gapAuthenticate", GapAuthenticate);
    Nan::SetPrototypeMethod(tpl, "gapSetPPCP", GapSetPPCP);
    Nan::SetPrototypeMethod(tpl, "gapGetPPCP", GapGetPPCP);
    Nan::SetPrototypeMethod(tpl, "gapSetAppearance", GapSetAppearance);
    Nan::SetPrototypeMethod(tpl, "gapGetAppearance", GapGetAppearance);
}

Adapter::Adapter()
{
    adapterVector.push_back(this);
    adapter = 0;

    eventCallbackMaxCount = 0;
    eventCallbackBatchEventCounter = 0;
    eventCallbackBatchEventTotalCount = 0;
    eventCallbackBatchNumber = 0;

    eventCallback = 0;
}

Adapter::~Adapter()
{
}

NAN_METHOD(Adapter::New)
{
    if (info.IsConstructCall()) {
        Adapter *obj = new Adapter();
        obj->Wrap(info.This());
        info.GetReturnValue().Set(info.This());
    } else {
        v8::Local<v8::Function> cons = Nan::New(constructor);
        info.GetReturnValue().Set(cons->NewInstance());
    }
}

int32_t Adapter::getEventCallbackTotalTime() const
{
    return (int32_t)eventCallbackDuration.count();
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
    double averageCallbackBatchCount = 0.0;

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
