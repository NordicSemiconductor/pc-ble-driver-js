
#include "adapter_internal.h"

#include "adapter.h"
#include "nrf_error.h"
#include "serialization_transport.h"

#include <string>

Adapter::Adapter(SerializationTransport *_transport): 
    eventCallback(nullptr),
    errorCallback(nullptr),
    logCallback(nullptr)
{
    this->transport = _transport;
}
                        
Adapter::~Adapter()
{
    delete transport;
}

uint32_t Adapter::open(const sd_rpc_error_handler_t error_callback, const sd_rpc_evt_handler_t event_callback, const sd_rpc_log_handler_t log_callback)
{
    errorCallback = error_callback;
    eventCallback = event_callback;
    logCallback = log_callback;

    auto boundErrorHandler = std::bind(&Adapter::errorHandler, this, std::placeholders::_1, std::placeholders::_2);
    auto boundEventHandler = std::bind(&Adapter::eventHandler, this, std::placeholders::_1);
    auto boundLogHandler = std::bind(&Adapter::logHandler, this, std::placeholders::_1, std::placeholders::_2);
    return transport->open(boundErrorHandler, boundEventHandler, boundLogHandler);
}

uint32_t Adapter::close() const
{
    return transport->close();
}

void Adapter::errorHandler(sd_rpc_app_err_t code, const char * error)
{
    adapter_t adapter;
    adapter.internal = static_cast<void *>(this);
    errorCallback(&adapter, code, error);
}

void Adapter::eventHandler(ble_evt_t *event)
{
    // Event Thread
    adapter_t adapter;
    adapter.internal = static_cast<void *>(this);
    eventCallback(&adapter, event);
}

void Adapter::logHandler(sd_rpc_log_severity_t severity, std::string log_message)
{
    adapter_t adapter;
    adapter.internal = static_cast<void *>(this);
    logCallback(&adapter, severity, log_message.c_str());
}

bool Adapter::isInternalError(const uint32_t error_code) {
    if (error_code != NRF_SUCCESS) {
        return true;
    }
    else
    {
        return false;
    }
}
