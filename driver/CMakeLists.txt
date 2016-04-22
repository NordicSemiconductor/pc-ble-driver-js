set(Boost_USE_MULTITHREADED ON)

# Find the necessary boost components on system
find_package ( Boost 1.54.0 REQUIRED COMPONENTS thread system regex date_time chrono )

# Include boost as a system include so that the compiler do not nag about issues in boost header files
include_directories (
    src/serialization
    include
    include/internal
    include/internal/transport
    include/internal/sdk/codec
    include/internal/sdk/misc
    SYSTEM ${Boost_INCLUDE_DIRS}
)

file(GLOB_RECURSE LIB_C_SOURCES src/*.c)
file(GLOB_RECURSE LIB_CPP_SOURCES src/*.cpp)

# Add definitions used by compiler when compiling source files
add_definitions(
    -DSD_RPC_EXPORTS
    -DHCI_LINK_CONTROL # Adds support for Link Control packets according to the HCI standard
)

# Force .c files to be compiled with the C++ compiler
set_source_files_properties(
    ${LIB_C_SOURCES}
    PROPERTIES
    LANGUAGE CXX
)

if(APPLE)
    add_library(pc-ble-driver STATIC ${LIB_C_SOURCES} ${LIB_CPP_SOURCES})
else()
    add_library(pc-ble-driver SHARED ${LIB_C_SOURCES} ${LIB_CPP_SOURCES})
endif()

# Specify libraries to link serialization library with
target_link_libraries (pc-ble-driver PRIVATE ${Boost_LIBRARIES})

add_executable(test_uart test/test_uart.cpp)
target_link_libraries(test_uart PRIVATE ${Boost_LIBRARIES})
