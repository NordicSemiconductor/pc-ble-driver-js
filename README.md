# pc-ble-driver-js

High-level Node.js API for Bluetooth Low Energy (BLE) using nRF51 and nRF52 hardware.

## Usage
See the [examples](examples) folder.

## Overview

The pc-ble-driver-js library allows an nRF5 connectivity chip running Nordic Semiconductor's SoftDevice to be controlled by a Node.js application. The communication with the connectivity chip happens over serial port using [BLE Serialization](https://infocenter.nordicsemi.com/index.jsp?topic=%2Fcom.nordic.infocenter.sdk5.v12.0.0%2Flib_serialization.html). The pc-ble-driver-js library is higher-level than pc-ble-driver and leans towards 'convention over configuration'. This module may be useful for tasks ranging from automated BLE testing to [desktop applications](https://www.nordicsemi.com/eng/Products/Bluetooth-low-energy/nRF-Connect-for-desktop) and BLE gateways.

## Installation

    $ npm install pc-ble-driver-js

The install script will try to download precompiled binaries for your platform/runtime environment from our [Releases](https://github.com/NordicSemiconductor/pc-ble-driver-js/releases). If not available, it will attempt to build the binaries from source, which requires a C++ compiler and the pc-ble-driver library. See [Building](#building).

### Installing in Electron apps

To use this project with Electron, the environment variables `npm_config_runtime` and `npm_config_target` must be set for `npm install`. The variables should be "`Electron`" and the Electron version, respectivly.

These variables can be set in `.npmrc` file in the root of your Electron based project. Example .npmrc file content:

    runtime = Electron
    target = 1.16.6

## Building

If there are no precompiled binaries for your platform, the install script will try to build them. You will need a working C++ compiler and the pc-ble-driver library available by cmake find_package.

The recommended way to get pc-ble-driver is using vcpkg. There are two options getting vcpkg. One is to [download](https://github.com/NordicPlayground/vcpkg/releases/tag/2019-06-09) the released version, the other is to clone the repository and checkout tag/2019-06-09.
 Afterwards vcpkg must be compiled for the target architecture used by your node executable. Then set the environment variable `VCPKG_ROOT` to the full path of the vcpkg install and repository and it will get automatically picked up when doing `npm install`.

A full example of preparing building on Windows for 64-bit Node:

    $ git clone https://github.com/NordicPlayground/vcpkg.git
    $ git checkout tags/2019-06-09
    $ ./vcpkg/bootstrap.bat
    $ ./vcpkg/vcpkg install nrf-ble-driver:x64-windows

And then when installing:

    $ set VCPKG_ROOT=/absolute/path/to/vcpkg/dir
    $ npm install pc-ble-driver-js

## Testing

### Unit tests

    $ npm test

### System tests

    $ npm run system-tests

This runs the bash script [scripts/system-tests.sh](scripts/system-tests.sh), so you'll need a functional bash on path. You will need to have two of each nRF device under test connected. See [scripts/system-tests.sh](scripts/system-tests.sh) for a list of PCA numbers of tested devices. The tests take care of firmware flashing.

## Hardware setup

A connectivity firmware needs to be flashed on the nRF5 IC before using pc-ble-driver-js. More information on this can be found in [Hardware setup](https://github.com/NordicSemiconductor/pc-ble-driver/blob/master/Installation.md#hardware-setup).

## Getting started

The [examples](./examples) and [integration tests](./test) may be used as a starting point for development with pc-ble-driver-js. Examples include a [heart rate monitor](./examples/heart_rate_monitor.js) (BLE peripheral) and [heart rate collector](./examples/heart_rate_collector.js) (BLE master) and show the basic structure of an application built on pc-ble-driver-js. To run the heart rate monitor example, verify your nRF5 connectivity chip is set-up and connected to your PC and run:

    $ node examples/heart_rate_monitor.js <PORT> <SD_API_VERSION>

To get more information about the command options you can run the command without any arguments.

## Architecture

All functionality of pc-ble-driver-js is exposed through its [api](./api/). Other directories in `pc-ble-driver-js/` are for building, binding to C/C++, and testing, and a developer building an application on top of pc-ble-driver-js need not concern themselves with these details.

[Adapter](./api/adapter.js) is the core component of pc-ble-driver-js's api. An `Adapter` sends serialized commands to the nRF5 connectivity chip, which in-turn executes the corresponding SoftDevice functionality. Any events the nRF5 connectivity chip receives from the SoftDevice are serialized and forwarded to the `Adapter`, which parses and handles these events.

An `Adapter`:

- Sends commands to the nRF5 connectivity chip
- Parses and handles events from the nRF5 connectivity chip
- Stores and organizes BLE related state
- Logs info with the specified verbosity

An `Adapter` does all this with a 'convention over configuration' approach, and this leads to a high-level api exposed to the developer. SoftDevice functionality is exposed by `Adapter` through a set of methods that often have default or optional parameters. Events are parsed and errors are checked for/handled by `Adapter` before being emitted for the application's use. BLE related state is maintained by `Adapter` and provided to the application through a simplified interface. This makes life easy for the developer, but in the (hopefully rare) case where finer control of the SoftDevice is required, this approach may be limiting. In this case the developer may need to create an issue, modify or extend `api/`, or if it makes sense, move to using [pc-ble-driver](https://github.com/NordicSemiconductor/pc-ble-driver) directly in a C/C++ environment.

Follow the [examples](./examples) and [integration tests](./test) for high-level best-practice use of pc-ble-driver-js.

## API Docs

https://NordicSemiconductor.github.io/pc-ble-driver-js/

## Contributing

Feel free to file code related issues on [GitHub Issues](https://github.com/NordicSemiconductor/pc-ble-driver-js/issues) and/or submit a pull request. In order to accept your pull request, we need you to sign our Contributor License Agreement (CLA). You will see instructions for doing this after having submitted your first pull request. You only need to sign the CLA once, so if you have already done it for another project in the NordicSemiconductor organization, you are good to go.

## License

See the [license file](LICENSE) for details.
