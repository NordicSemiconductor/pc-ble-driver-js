'use strict';

const api = require('../../index').api;
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
};
