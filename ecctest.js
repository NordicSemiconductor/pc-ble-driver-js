'use strict';

const driver = require('./index.js').driver;

driver.eccInit();

const keys = driver.eccGenerateKeypair();
console.log(keys);

const publicKey = driver.eccComputePublicKey(keys.sk);
console.log(publicKey);

const ssKey = driver.eccComputeSharedSecret(keys.sk, publicKey.pk);
console.log(ssKey);
