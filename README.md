sass-spec
=========

[![Build Status](https://travis-ci.org/sass/sass-spec.svg)](https://travis-ci.org/sass/sass-spec)

A test suite for Sass. The test cases are all in the `/spec` folder.

Sass spec is written in ruby, so you will need to have ruby and bundler
installed in order to run it.

## Running specs against Ruby Sass

Run tests against Ruby Sass with the `sass-spec.rb` file in the root directory.

    $ git clone https://github.com/sass/sass-spec.git
    $ cd sass-spec
    $ bundle install
    $ bundle exec sass-spec.rb

To run tests against Ruby Sass in development, edit the Gemfile and add:

```ruby
gem 'sass', :path => "/path/to/sass/directory"
```

Then run `bundle install` and `bundle exec sass-spec.rb` will run
against your development version of ruby sass.

Conversely, if you edit the Sass `Gemfile` and set `gem 'sass-spec',
:path => "..."` then the Sass unit tests will run against your
development version of sass-spec.

Full text help is available if you run that w/ the `-h` option.

## Organization

Tests are stored in the `spec` directory. The structure of the specs is
being worked on right now, however, most directory names should be
fairly self explanatory.

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

### Adding new specs

0. Set up sass spec if you haven't yet.
1. Add an `input.s[ac]ss` file in an appropriate folder.
2. Optionally, annotate it with sass-spec.rb annotate ... <path_to_folder>
3. Run `sass-spec.rb -g <path_to_folder>` to generate the expected
   output files.
4. Verify the generated output is what you expected.
5. Run `sass-spec.rb <path_to_folder>` just to make sure it passes.
6. Commit and send Pull Request. Be sure to include the reason for the
   new spec in the commit message.

### Updating Failing Tests

A lot of the management tasks for specs is centered around how to handle
specs as the language changes. Many common fixes for failing tests can
be found by running tests with the `--interactive` command line option.

When a test would fail, it first stops, lets you see what's failing and
choose a fix for it or you can let it fail and fix it later.

Sometimes, many tests are all failing and you know they need to be
updated en masse and interactive mode would be very cumbersome in this
context. In these situations the `--migrate` option or the `--generate`
option are very useful.

#### The `--generate` option

The `--generate` option causes all tests that are being ran to have
their expected output, error and exit statuses updated to match the
current results. For passing tests, this operation is a net result of
not changing files.

In `--interactive` mode, a common option is to regenerate the expected
outputs just like `--generate` does, but on a case-by-case basis.

#### The `--migrate` option

The migrate option only works on tests that are failing.

1. Make a copy of the current test named "&lt;folder>-&lt;current_version>"
2. Mark the original test as having an `end_version` as the version that
   comes before the version being tested right now.
3. Set the copy as having a `start_version` as the version being tested right now.
4. Regenerate the expected output for the new test so that it passes.

In `--interactive` mode, a common option is to migrate the spec just
like `--migrate` does, but on a case-by-case basis.

### Pending (TODO) tests

If a test or folder of tests is pending for a particular implementation,
you can mark that test as pending for just that implementation.


    $ ./sass-spec.rb annotate --pending libsass spec/awesome_new_feature/

Then those tests will be marked as skipped if you run sass-spec and pass
the `--impl NAME` option (E.g. in this case `--impl libsass`)

The `--interactive` mode will provide marking a test as pending for the
current implementation as a remedy for many types of spec failures.

## Known Issues

* Ruby 2.1.0 contained a regression that changed the order of some
  selectors, causing test failures in sass-spec. That was fixed in Ruby
  2.1.1. If you're running sass-spec against a Ruby Sass, please be sure
  not to use Ruby 2.1.0.
* Some of our spec files have UTF-8 characters in their filenames. If
  you are on OSX, you may encounter issues with git showing files that are
  not checked in but actually are which can cause issued which doing
  rebase or changing branches. If so, run `git config core.precomposeunicode false`
  and it should clear things up.

## LibSass

After installing a libsass dev enviroment (see libsass readme... sassc, this spec, and libsass), the tests are run by going
to the libsass folder and running ./script/spec.

## Contribution

This project needs maintainers! There will be an ongoing process of
simplifying test cases, reporting new issues and testing them here, and
managing mergers of official test cases.

This project requires help with the Ruby test drivers (better output,
detection modes, etc) AND just with managing the issues and writing test
cases.
