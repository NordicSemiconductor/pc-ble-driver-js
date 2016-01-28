message(STATUS "Remember to build boost with the following command line when using brew:")
message(STATUS "CFLAGS=-fPIC brew install --verbose  --env=std --build-from-source boost")

set(Boost_USE_STATIC_LIBS ON)

add_compile_options(-pthread -std=c++11)
