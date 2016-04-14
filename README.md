sass-spec
=========

[![Build Status](https://travis-ci.org/sass/sass-spec.svg)](https://travis-ci.org/sass/sass-spec)

A test suite for Sass. The test cases are all in the `/spec` folder.

Run tests against Ruby Sass with the `sass-spec.rb` file in the root directory.

    ./sass-spec.rb

Full text help is available if you run that w/ the help options.

## Organization

The tests are organized this way:

	* basic - The core tests taken from Sass' early development
	* scss - The tests suite written for the introduction of scss
	* libsass-open-issues - Tests for known libsass breakages. These are not run automatically.
	* libsass-closed-issues - Tests for closed issues in the libsass directory.
 	* maps - Testing maps
	* extends - Testing extends
	* libsass-todo - Tests taken from Ruby Sass and moved over here, that do not pass in libsass yet.

## Working with different Sass Language Versions

Spec tests each apply to their own range of Sass Language versions. Each
folder in the spec directory can have start and end language versions set and it will
apply to all of the tests contained in that folder and below. Individual
tests can override these settings.

Use the annotate subcommand to annotate and report on annotations
applied to individual test cases. Run `./sass-spec.rb annotate -h` to
see all available options.

Examples:

    $ ./sass-spec.rb annotate --end-version 3.5 spec/basic
    spec/basic:
      * setting end_version to 3.5...done
    
    $ ./sass-spec.rb annotate --end-version 4.0 spec/basic/40_pseudo_class_identifier_starting_with_n
    spec/basic:
      * setting end_version to 4.0...done
    
    $ ./sass-spec.rb annotate --report spec/basic
    +-------------------------------------------------------+-----+-----+-----+
    | Test Case                                             | 3.4 | 3.5 | 4.0 |
    +-------------------------------------------------------+-----+-----+-----+
    | spec/basic/00_empty                                   |  ✓  |  ✓  |     |
    +-------------------------------------------------------+-----+-----+-----+
    | spec/basic/01_simple_css                              |  ✓  |  ✓  |     |
    +-------------------------------------------------------+-----+-----+-----+
    | spec/basic/02_simple_nesting                          |  ✓  |  ✓  |     |
    +-------------------------------------------------------+-----+-----+-----+
    | spec/basic/03_simple_variable                         |  ✓  |  ✓  |     |
    +-------------------------------------------------------+-----+-----+-----+
    | spec/basic/04_basic_variables                         |  ✓  |  ✓  |     |
    +-------------------------------------------------------+-----+-----+-----+
    | spec/basic/...                                        |  ✓  |  ✓  |     |
    +-------------------------------------------------------+-----+-----+-----+
    | spec/basic/40_pseudo_class_identifier_starting_with_n |  ✓  |  ✓  |  ✓  |
    +-------------------------------------------------------+-----+-----+-----+
    | spec/basic/...                                        |  ✓  |  ✓  |     |
    +-------------------------------------------------------+-----+-----+-----+


When running the tests, it is important to specify which language
version subset of the tests should be used. When not specified, the
latest version is used.

    $ ./sass-spec.rb -V 3.4 ...

### Pending (TODO) tests

If a test or folder of tests is pending for a particular implementation,
you can mark that test as pending for just that implementation.


    $ ./sass-spec.rb annotate --pending libsass spec/awesome_new_feature/

Then those tests will be marked as skipped if you run sass-spec and pass
the `--impl NAME` option (E.g. in this case `--impl libsass`)

## Known Issues

* Ruby 2.1.0 contained a regression that changed the order of some selectors, causing test failures in sass-spec. That was fixed in Ruby 2.1.1. If you're running sass-spec against a Ruby Sass, please be sure not to use Ruby 2.1.0.

## LibSass

After installing a libsass dev enviroment (see libsass readme... sassc, this spec, and libsass), the tests are run by going
to the libsass folder and running ./script/spec.

## Contribution

This project needs maintainers! There will be an ongoing process of simplifying test cases, reporting new issues and testing them here, and managing mergers of official test cases.

This project requires help with the Ruby test drivers (better output, detection modes, etc) AND just with managing the issues and writing test cases.
