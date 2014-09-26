sass-spec
=========

A test suite for Sass. The test cases are all in the `/spec` folder
and are organized, primarily, for the use of libsass development.

Run tests with the `sass-spec.rb` file in the root directory.

    ./sass-spec.rb 

Full text help is available if you run that w/ the help options.

# Special Names

All tests in the `spec/todo` folder are expected to fail with libsass.

All tests with scss files named `input.disabled.scss` fail with fatal errors in Ruby Sass and are not run.