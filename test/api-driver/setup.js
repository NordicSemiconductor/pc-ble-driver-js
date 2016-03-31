/* Copyright (c) 2016 Nordic Semiconductor. All Rights Reserved.
 *
 * The information contained herein is property of Nordic Semiconductor ASA.
 * Terms and conditions of usage are described in detail in NORDIC
 * SEMICONDUCTOR STANDARD SOFTWARE LICENSE AGREEMENT.
 *
 * Licensees are granted free, non-transferable use of the information. NO
 * WARRANTY of ANY KIND is provided. This heading must NOT be removed from
 * the file.
 *
 */

'use strict';

const api = require('../../index').api;
const driver = require('../../index').driver;
const adapterFactory = api.AdapterFactory.getInstance();
const ServiceFactory = new api.ServiceFactory;

adapterFactory.on('added', adapter => {
    console.log(`onAdded: ${adapter.instanceId}`);
});

adapterFactory.on('removed', adapter => {
    console.log(`onRemoved: ${adapter.instanceId}`);
});

adapterFactory.on('error', error => {
    console.log(`onError: ${JSON.stringify(error, null, 1)}`);
});

module.exports = {
    adapterFactory: adapterFactory,
    ServiceFactory: ServiceFactory,
    driver: driver,
};
