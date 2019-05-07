/**
 *
 *
 *
 * Portions of this code is from the node-serialport project: https://github.com/voodootikigod/node-serialport
 *
 * The license that code is release under is:
 *
 * Copyright 2010, 2011, 2012 Christopher Williams. All rights reserved.
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 *
 */

#include "serialadapter.h"

#include <nan.h>
#include <sd_rpc.h>

#include <vector>
#include <cstdint>

// Maximum of adapters allowed on a system before GetAdapterList fails
constexpr size_t max_adapter_count = 64;

NAN_METHOD(GetAdapterList)
{
    if(!info[0]->IsFunction())
    {
        Nan::ThrowTypeError("First argument must be a function");
        return;
    }

    v8::Local<v8::Function> callback = info[0].As<v8::Function>();
    auto baton = new AdapterListBaton(callback);

    uv_queue_work(uv_default_loop(), baton->req, GetAdapterList, reinterpret_cast<uv_after_work_cb>(AfterGetAdapterList));
}

void GetAdapterList(uv_work_t *req)
{
    auto adapters = std::vector<sd_rpc_serial_port_desc_t>(max_adapter_count);
    auto adapter_count = adapters.size();
    auto status = sd_rpc_serial_port_enum(adapters.data(), (std::uint32_t*) &adapter_count);
    adapters.resize(adapter_count);

    auto baton = static_cast<AdapterListBaton*>(req->data);
    baton->result = status;
    baton->results = adapters;
}

void AfterGetAdapterList(uv_work_t* req)
{
    Nan::HandleScope scope;
    auto baton = static_cast<AdapterListBaton*>(req->data);

    v8::Local<v8::Value> argv[2];

    if(baton->result == NRF_SUCCESS)
    {
        v8::Local<v8::Array> results = Nan::New<v8::Array>();
        auto i = 0;

        for(auto adapterItem : baton->results)
        {
            v8::Local<v8::Object> item = Nan::New<v8::Object>();
            Utility::Set(item, "comName", adapterItem.port);
            Utility::Set(item, "manufacturer", adapterItem.manufacturer);
            Utility::Set(item, "serialNumber", adapterItem.serialNumber);
            Utility::Set(item, "pnpId", adapterItem.pnpId);
            Utility::Set(item, "locationId", adapterItem.locationId);
            Utility::Set(item, "vendorId", adapterItem.vendorId);
            Utility::Set(item, "productId", adapterItem.productId);
            results->Set(i++, item);
        }

        argv[0] = Nan::Undefined();
        argv[1] = results;
    } else {
        argv[0] = ErrorMessage::getErrorMessage(baton->result, "getting adapter list");
        argv[1] = Nan::Undefined();
    }

    Nan::AsyncResource resource("pc-ble-driver-js:callback");
    baton->callback->Call(2, argv, &resource);

    delete baton;
}
