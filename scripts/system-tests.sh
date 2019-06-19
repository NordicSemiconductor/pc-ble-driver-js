#!/usr/bin/env bash
set -eux

# Note: Excluding PCA10059. nrf-device-lister is not able to look
# these up on the system by PCA number. It is unlikely that there
# will ever be a solution for this since it would require a
# change to the factory flashed bootloader so that it does not
# exit but stays as a service.
test_pcas=(PCA10031 PCA10028 PCA10040 PCA10056)

export BLE_DRIVER_TEST_OPENCLOSE_ITERATIONS=5
export BLE_DRIVER_TEST_LOGLEVEL="trace"
export DEBUG="ble-driver:*"

global_failure=0

for pca in "${test_pcas[@]}"; do
    serial_numbers=($(npx nrf-device-lister -S "$pca"))
    export DEVICE_A_SERIAL_NUMBER="${serial_numbers[0]}"
    export DEVICE_B_SERIAL_NUMBER="${serial_numbers[1]}"

    function run_test {
         echo "Running test using PCA: $pca, serial number" \
         "A: $DEVICE_A_SERIAL_NUMBER B: $DEVICE_B_SERIAL_NUMBER"
        npx jest --detectOpenHandles --forceExit "$@" || {
            echo "======== TEST FAILURE ======== (exit code: $?)"
            global_failure=1
            # Don't exit on failure. Continue with next test.
        }
    }

    # Run each tests in a new Jest instance. Sheduling more in
    # Jest it introduces a module reloading behaviour that is
    # incompatible with our dependencies.
    run_test advertise.test.js
    run_test connection.test.js
    run_test mtu.test.js
    run_test simpleScan.test.js
    run_test simpleSecurity.test.js -t LegacyJustWorks
    run_test simpleSecurity.test.js -t LegacyOOB
    run_test simpleSecurity.test.js -t LESCJustWorks
    run_test simpleSecurity.test.js -t LESCNumericComparison
    run_test simpleSecurity.test.js -t LESCPasskey
    run_test simpleSecurity.test.js -t LESCOOB
    run_test openClose.test.js
done

if [ "$global_failure" != 0 ]; then
    echo "End of tests. One or more tests failed."
    exit 1
fi
