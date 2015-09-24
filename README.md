# Introduction
pc-ble-driver-js is a NodeJS AddOn for the pc-ble-driver library.

The AddOn does not support all of the functions in the [pc-ble-driver  library](https://github.com/NordicSemiconductor/pc-ble-driver). 

This is a very early implementation, we are working on making the AddOn production quality. 

When production quality is reached we will probably publish it on npmjs. Stay with us!

# Installation procedure

You need to have the cmake-js npm installed and the correct C++ compiler that matches your version of NodeJS.

Your nRF51 Development Kit needs to be flashed with the connectivity firmware found in  driver/hex/connectivity_115k2_with_s130_1.0.0.hex.

# Platform specific notes

## WIN32

Copy the s130_nrf51_ble_driver.dll library to the repository root (from driver\lib\s130_nrf51_ble_driver.dll).


# Run example

```
node example_scan.js
```
