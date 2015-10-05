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
  NanScope();

  // callback
  if(!args[0]->IsFunction()) {
    NanThrowTypeError("First argument must be a function");
    NanReturnUndefined();
  }
  
  v8::Local<v8::Function> callback = args[0].As<v8::Function>();

  AdapterListBaton* baton = new AdapterListBaton();
  strcpy(baton->errorString, "");
  baton->callback = new NanCallback(callback);

  uv_work_t* req = new uv_work_t();
  req->data = baton;
  uv_queue_work(uv_default_loop(), req, GetAdapterList, (uv_after_work_cb)AfterGetAdapterList);

  NanReturnUndefined();
}

void AfterGetAdapterList(uv_work_t* req) {
  NanScope();

  AdapterListBaton* data = static_cast<AdapterListBaton*>(req->data);

  v8::Handle<v8::Value> argv[2];
  
  if(data->errorString[0]) {
    argv[0] = v8::Exception::Error(NanNew<v8::String>(data->errorString));
    argv[1] = NanUndefined();
  } else {
    v8::Local<v8::Array> results = NanNew<v8::Array>();
    int i = 0;

    for(std::list<AdapterListResultItem*>::iterator it = data->results.begin(); it != data->results.end(); ++it, i++) {
      v8::Local<v8::Object> item = NanNew<v8::Object>();
      item->Set(NanNew<v8::String>("comName"), NanNew<v8::String>((*it)->comName.c_str()));
      item->Set(NanNew<v8::String>("manufacturer"), NanNew<v8::String>((*it)->manufacturer.c_str()));
      item->Set(NanNew<v8::String>("serialNumber"), NanNew<v8::String>((*it)->serialNumber.c_str()));
      item->Set(NanNew<v8::String>("pnpId"), NanNew<v8::String>((*it)->pnpId.c_str()));
      item->Set(NanNew<v8::String>("locationId"), NanNew<v8::String>((*it)->locationId.c_str()));
      item->Set(NanNew<v8::String>("vendorId"), NanNew<v8::String>((*it)->vendorId.c_str()));
      item->Set(NanNew<v8::String>("productId"), NanNew<v8::String>((*it)->productId.c_str()));
      results->Set(i, item);
    }

    argv[0] = NanUndefined();
    argv[1] = results;
  }

  data->callback->Call(2, argv);

  delete data->callback;

  for(std::list<AdapterListResultItem*>::iterator it = data->results.begin(); it != data->results.end(); ++it) {
    delete *it;
  }

  delete data;
  delete req;
}
