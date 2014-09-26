sass-spec
=========

A test suite for Sass. The test cases are all in the `/spec` folder
and are organized, primarily, for the use of libsass development.

Run tests with the `sass-spec.rb` file in the root directory.

    ./sass-spec.rb 

Full text help is available if you run that w/ the help options.

## Ruby Sass

Ruby 2.1.0 contained a regression that changed the order of some selectors, causing test failures in sass-spec. That was fixed in Ruby 2.1.1. If you're running sass-spec against a Ruby Sass, please be sure not to use Ruby 2.1.0.

# Special Names

All tests in the `spec/todo` folder are expected to fail with libsass.

All tests with scss files named `input.disabled.scss` fail with fatal errors in Ruby Sass and are not run.
