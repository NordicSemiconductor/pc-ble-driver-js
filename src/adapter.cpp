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

#include "adapter.h"

NAN_METHOD(GetAdapterList) {
    if(!info[0]->IsFunction())
    {
        Nan::ThrowTypeError("First argument must be a function");
        return;
    }
  
    v8::Local<v8::Function> callback = info[0].As<v8::Function>();

    AdapterListBaton* baton = new AdapterListBaton(callback);
    strcpy(baton->errorString, "");

    uv_work_t* req = new uv_work_t();
    req->data = baton;
    uv_queue_work(uv_default_loop(), req, GetAdapterList, (uv_after_work_cb)AfterGetAdapterList);
}

void AfterGetAdapterList(uv_work_t* req) {
	Nan::HandleScope scope;
    AdapterListBaton* baton = static_cast<AdapterListBaton*>(req->data);

    v8::Local<v8::Value> argv[2];
  
    if(baton->errorString[0])
    {
        argv[0] = v8::Exception::Error(Nan::New(baton->errorString).ToLocalChecked());
        argv[1] = Nan::Undefined();
    } 
    else 
    {
        v8::Local<v8::Array> results = Nan::New<v8::Array>();
        int i = 0;

        for(auto it = baton->results.begin(); it != baton->results.end(); ++it, i++) 
        {
            v8::Local<v8::Object> item = Nan::New<v8::Object>();
            Utility::Set(item, "comName", (*it)->comName);
            Utility::Set(item, "manufacturer", (*it)->manufacturer);
            Utility::Set(item, "serialNumber", (*it)->serialNumber);
            Utility::Set(item, "pnpId", (*it)->pnpId);
            Utility::Set(item, "locationId", (*it)->locationId);
            Utility::Set(item, "vendorId", (*it)->vendorId);
            Utility::Set(item, "productId", (*it)->productId);
            results->Set(i, item);
        }

        argv[0] = Nan::Undefined();
        argv[1] = results;
    }

    baton->callback->Call(2, argv);

    for(auto it = baton->results.begin(); it != baton->results.end(); ++it) 
    {
        delete *it;
    }

    delete baton;
    delete req;
}
