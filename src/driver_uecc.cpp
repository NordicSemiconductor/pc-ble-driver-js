/* Copyright (c) 2010 - 2017, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Use in source and binary forms, redistribution in binary form only, with
 * or without modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions in binary form, except as embedded into a Nordic
 *    Semiconductor ASA integrated circuit in a product or a software update for
 *    such product, must reproduce the above copyright notice, this list of
 *    conditions and the following disclaimer in the documentation and/or other
 *    materials provided with the distribution.
 *
 * 2. Neither the name of Nordic Semiconductor ASA nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 *
 * 3. This software, with or without modification, must only be used with a Nordic
 *    Semiconductor ASA integrated circuit.
 *
 * 4. Any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

#include "driver_uecc.h"
#include "uECC/uECC.h"
#include "nrf_error.h"
#include <iostream>
#include <cstdlib>
#include <time.h>

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

static uint8_t m_be_keys[ECC_P256_SK_LEN * 3];

static void reverse(uint8_t* p_dst, uint8_t* p_src, uint32_t len)
{
    uint32_t i, j;

    for (i = len - 1, j = 0; j < len; i--, j++)
    {
        p_dst[j] = p_src[i];
    }
}

static bool isEccInitialized = false;

NAN_METHOD(ECCInit)
{
    if (!isEccInitialized)
    {
        srand ((unsigned int)time(NULL));
        uECC_set_rng(rng);
        isEccInitialized = true;
    }
}

NAN_METHOD(ECCP256GenerateKeypair)
{
    const struct uECC_Curve_t * p_curve;

    uint8_t p_le_sk[ECC_P256_SK_LEN];   // Out
    uint8_t p_le_pk[ECC_P256_PK_LEN];   // Out

    p_curve = uECC_secp256r1();
    int ret = uECC_make_key((uint8_t *)&m_be_keys[ECC_P256_SK_LEN], (uint8_t *)&m_be_keys[0], p_curve);

    if (!ret)
    {
        Nan::ThrowTypeError("NRF_ERROR_INTERNAL");
        return;
    }

    /* convert to little endian bytes and store in p_le_sk */
    reverse(&p_le_sk[0], &m_be_keys[0], ECC_P256_SK_LEN);
    /* convert to little endian bytes in 2 passes, store in p_le_pk */
    reverse(&p_le_pk[0], &m_be_keys[ECC_P256_SK_LEN], ECC_P256_SK_LEN);
    reverse(&p_le_pk[ECC_P256_SK_LEN], &m_be_keys[ECC_P256_SK_LEN * 2], ECC_P256_SK_LEN);


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
    auto argumentcount = 0;

    try
    {
        p_le_sk = ConversionUtility::getNativePointerToUint8(info[0]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    if (p_le_sk == nullptr)
    {
        Nan::ThrowTypeError("NRF_ERROR_NULL");
        return;
    }

    p_curve = uECC_secp256r1();

    reverse(&m_be_keys[0], (uint8_t *)p_le_sk, ECC_P256_SK_LEN);
    free(p_le_sk);

    //int ret = uECC_compute_public_key(p_le_sk, (uint8_t *)p_le_pk, p_curve);
    int ret = uECC_compute_public_key((uint8_t *)&m_be_keys[0], (uint8_t *)&m_be_keys[ECC_P256_SK_LEN], p_curve);

    if (!ret)
    {
        Nan::ThrowTypeError("NRF_ERROR_INTERNAL");
        return;
    }

    /* convert to little endian bytes in 2 passes, store in m_be_keys */
    reverse(&p_le_pk[0], &m_be_keys[ECC_P256_SK_LEN], ECC_P256_SK_LEN);
    reverse(&p_le_pk[ECC_P256_SK_LEN], &m_be_keys[ECC_P256_SK_LEN * 2], ECC_P256_SK_LEN);

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
    auto argumentcount = 0;

    try
    {
        p_le_sk = ConversionUtility::getNativePointerToUint8(info[0]);
        p_le_pk = ConversionUtility::getNativePointerToUint8(info[1]);
        argumentcount++;
    }
    catch (std::string error)
    {
        v8::Local<v8::String> message = ErrorMessage::getTypeErrorMessage(argumentcount, error);
        Nan::ThrowTypeError(message);
        return;
    }

    p_curve = uECC_secp256r1();

    /* convert to big endian bytes and store in m_be_keys */
    reverse(&m_be_keys[0], (uint8_t *)p_le_sk, ECC_P256_SK_LEN);
    reverse(&m_be_keys[ECC_P256_SK_LEN], (uint8_t *)&p_le_pk[0], ECC_P256_SK_LEN);
    reverse(&m_be_keys[ECC_P256_SK_LEN * 2], (uint8_t *)&p_le_pk[ECC_P256_SK_LEN], ECC_P256_SK_LEN);

    free(p_le_sk);
    free(p_le_pk);

    int ret = uECC_shared_secret((uint8_t *)&m_be_keys[ECC_P256_SK_LEN], (uint8_t *)&m_be_keys[0], p_le_ss, p_curve);

    if (!ret)
    {
        Nan::ThrowTypeError("NRF_ERROR_INTERNAL");
        return;
    }

    /* convert to little endian bytes and store in m_be_keys */
    reverse(&m_be_keys[0], &p_le_ss[0], ECC_P256_SK_LEN);

    /* copy back the little endian bytes to p_le_pk */
    memcpy(p_le_ss, m_be_keys, ECC_P256_SK_LEN);

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
