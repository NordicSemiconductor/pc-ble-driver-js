# pc-ble-driver-js

`pc-ble-driver-js` provides a Node.js interface to the C/C++ [pc-ble-driver](https://github.com/NordicSemiconductor/pc-ble-driver) library. 

## Overview

`pc-ble-driver` allows an nRF5 connectivity chip running Nordic's SoftDevice to be controlled via serial port ([BLE Serialization](https://infocenter.nordicsemi.com/index.jsp?topic=%2Fcom.nordic.infocenter.sdk5.v12.0.0%2Flib_serialization.html)) by an application - enabling the application with complete BLE functionality. `pc-ble-driver-js` is higher-level than `pc-ble-driver` and leans towards convention over configuration. Getting started is quick and easy. This module may be useful for tasks ranging from automated BLE testing to [desktop applications](https://www.nordicsemi.com/eng/Products/Bluetooth-low-energy/nRF-Connect-for-desktop) and BLE gateways in production.

## Installing

Installing `pc-ble-driver-js` requires a bit more than the usual `$ npm install` because of it's C/C++ `pc-ble-driver` dependency. For detailed guidelines on building and installing `pc-ble-driver-js` and it's dependencies see [Installation.md](./Installation.md).

## Getting started

The [examples](./examples) and [integration tests](./test) serve as a great starting point for development with `pc-ble-driver-js`. Examples include a [heart rate monitor](./examples/heart_rate_monitor.js) (BLE peripheral) and [heart rate collector](./examples/heart_rate_collector.js) (BLE master) and show the basic structure of an application built on `pc-ble-driver-js`. To run the heart rate monitor example, verify your nRF5 connectivity chip is set-up and connected to your PC and run:

    $ node examples/heart_rate_monitory.js

## Contributing

We are currently working on a Contributor License Agreement (CLA), which will allow third party contributions to this project. We do not accept pull requests for the time being, but feel free to file code related issues on [GitHub Issues](https://github.com/NordicSemiconductor/pc-ble-driver-js/issues).

## License

See the [license file](LICENSE) for details.
