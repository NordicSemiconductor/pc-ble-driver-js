#include "driver_uecc.h"
#include "uECC/uECC.h"
#include "nrf_error.h"    
#include <iostream>
#include <cstdlib>

#include "common.h"

#define ECC_P256_SK_LEN 32
#define ECC_P256_PK_LEN 64

int rng(uint8_t *dest, unsigned size)
{
    for (unsigned i = 0; i < size; ++i)
    {        
        dest[i] = rand() % 256;
    }

    return 1;
}

NAN_METHOD(ECCInit)
{
    uECC_set_rng(rng);
}

NAN_METHOD(ECCP256GenerateKeypair)
{
    const struct uECC_Curve_t * p_curve;

    uint8_t p_le_sk[32];   // Out
    uint8_t p_le_pk[64];   // Out


    if (!p_le_sk || !p_le_pk)
    {
        Nan::ThrowTypeError("NRF_ERROR_NULL");
        return;
    }

    p_curve = uECC_secp256r1();
    int ret = uECC_make_key(p_le_pk, p_le_sk, p_curve);

    if (!ret)
    {
        Nan::ThrowTypeError("NRF_ERROR_INTERNAL");
        return;
    }

    v8::Local<v8::Object> retObject = Nan::New<v8::Object>();
    Utility::Set(retObject, "SK", ConversionUtility::toJsValueArray(p_le_sk, 32));
    Utility::Set(retObject, "PK", ConversionUtility::toJsValueArray(p_le_pk, 64));

    info.GetReturnValue().Set(retObject);
}

NAN_METHOD(ECCP256ComuptePublicKey)
{
    const struct uECC_Curve_t * p_curve;
    uint8_t *p_le_sk;   // In
    uint8_t p_le_pk[32];   // Out

    p_le_sk = ConversionUtility::getNativePointerToUint8(info[0]);

    if (!p_le_sk || !p_le_pk)
    {
        Nan::ThrowTypeError("NRF_ERROR_NULL");
        return;
    }

    p_curve = uECC_secp256r1();

    std::cout << "uECC_compute_public_key" << std::endl;
    int ret = uECC_compute_public_key(p_le_sk, (uint8_t *)p_le_pk, p_curve);
    if (!ret)
    {
        Nan::ThrowTypeError("NRF_ERROR_INTERNAL");
        return;
    }

    std::cout << "uECC_compute_public_key complete: " << ret << std::endl;
    
    v8::Local<v8::Object> retObject;
    Utility::Set(retObject, "PK", ConversionUtility::toJsValueArray(p_le_sk, 32));

    info.GetReturnValue().Set(retObject);
}

NAN_METHOD(ECCP256ComupteSharedSecret)
{
    const struct uECC_Curve_t * p_curve;
    uint8_t *p_le_sk;  // In
    uint8_t *p_le_pk;  // In
    uint8_t p_le_ss[32];  // Out

    p_le_sk = ConversionUtility::getNativePointerToUint8(info[0]);
    p_le_pk = ConversionUtility::getNativePointerToUint8(info[1]);

    p_curve = uECC_secp256r1();

    std::cout << "uECC_shared_secret" << std::endl;
    int ret = uECC_shared_secret(p_le_pk, p_le_sk, p_le_ss, p_curve);

    if (!ret)
    {
        Nan::ThrowTypeError("NRF_ERROR_INTERNAL");
        return;
    }

    std::cout << "uECC_shared_secret complete: " << ret << std::endl;
    v8::Local<v8::Object> retObject;
    Utility::Set(retObject, "SS", ConversionUtility::toJsValueArray(p_le_ss, 32));

    info.GetReturnValue().Set(retObject);
}

extern "C" {
    void init_uecc(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target)
    {
        Utility::SetMethod(target, "eccInit", ECCInit);
        Utility::SetMethod(target, "eccGenerateKeypair", ECCP256GenerateKeypair);
        Utility::SetMethod(target, "eccComputePublicKey", ECCP256ComuptePublicKey);
        Utility::SetMethod(target, "eccComputeSharedSecret", ECCP256ComupteSharedSecret);
    }
}
