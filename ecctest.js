'use strict';

const driver = require('./index.js').driver;

driver.eccInit();

const keys = driver.eccGenerateKeypair();
console.log(keys);

const publicKey = driver.eccComputePublicKey(keys.SK);
console.log(publicKey);

const ssKey = driver.eccComputeSharedSecret(keys.SK, publicKey.PK);
console.log(ssKey);
