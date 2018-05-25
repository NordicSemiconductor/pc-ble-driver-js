# Running tests
The tests in this directory must be ran individually since there is an issue with the usb module in combination with jest.

For example:
`jest advertise.test.js`

## Environment variables
The following environment variables affects the running of the tests:

  
| Environment variable          | Description                                                                      |
| ------------------------------| ---------------------------------------------------------------------------------|
PC_BLE_DRIVER_TEST_BLACKLIST    | A list of devices serial numbers to not use in the tests. Separate multiple devices with comma. | 
PC_BLE_DRIVER_TEST_FAMILY       | The device family to use for the tests, can be nrf51 or nrf52.                   |
PC_BLE_DRIVER_TEST_SKIP_PROGRAMMING | Set to true to skip programming of devices in tests. Assumes that correct firmware is in place. |
PC_BLE_DRIVER_TEST_OPENCLOSE    | The number of iterations the openClose test shall run. It defaults to 2000 runs. |
PC_BLE_DRIVER_TEST_LOGLEVEL     | Specifies the pc-ble-driver log level. Defaults to 'info'. Can be 'trace', 'debug','info','warning','error','fatal'.|
DEBUG                           | From debug module. Specifies logger to output/not output on console. See [debug](https://www.npmjs.com/package/debug) for more details. Example loggers: ble-driver:log, ble-driver:test.| 
