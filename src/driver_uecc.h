#ifndef DRIVER_UECC_H
#define DRIVER_UECC_H

#include <nan.h>

NAN_METHOD(ECCInit);
NAN_METHOD(ECCP256GenerateKeypair);
NAN_METHOD(ECCP256ComputePublicKey);
NAN_METHOD(ECCP256ComputeSharedSecret);

extern "C" {
    void init_uecc(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target);
}

#endif