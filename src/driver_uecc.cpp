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

    uint8_t p_le_sk[ECC_P256_SK_LEN];   // Out
    uint8_t p_le_pk[ECC_P256_PK_LEN];   // Out


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
    Utility::Set(retObject, "sk", ConversionUtility::toJsValueArray(p_le_sk, ECC_P256_SK_LEN));
    Utility::Set(retObject, "pk", ConversionUtility::toJsValueArray(p_le_pk, ECC_P256_PK_LEN));

    info.GetReturnValue().Set(retObject);
}

NAN_METHOD(ECCP256ComputePublicKey)
{
    const struct uECC_Curve_t * p_curve;
    uint8_t *p_le_sk;   // In
    uint8_t p_le_pk[ECC_P256_PK_LEN];   // Out

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
    
    v8::Local<v8::Object> retObject = Nan::New<v8::Object>();
    Utility::Set(retObject, "pk", ConversionUtility::toJsValueArray(p_le_pk, ECC_P256_PK_LEN));

    info.GetReturnValue().Set(retObject);
}

NAN_METHOD(ECCP256ComputeSharedSecret)
{
    const struct uECC_Curve_t * p_curve;
    uint8_t *p_le_sk;  // In
    uint8_t *p_le_pk;  // In
    uint8_t p_le_ss[ECC_P256_SK_LEN];  // Out

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
    v8::Local<v8::Object> retObject = Nan::New<v8::Object>();
    Utility::Set(retObject, "ss", ConversionUtility::toJsValueArray(p_le_ss, ECC_P256_SK_LEN));

    info.GetReturnValue().Set(retObject);
}

extern "C" {
    void init_uecc(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target)
    {
        Utility::SetMethod(target, "eccInit", ECCInit);
        Utility::SetMethod(target, "eccGenerateKeypair", ECCP256GenerateKeypair);
        Utility::SetMethod(target, "eccComputePublicKey", ECCP256ComputePublicKey);
        Utility::SetMethod(target, "eccComputeSharedSecret", ECCP256ComputeSharedSecret);
    }
}
