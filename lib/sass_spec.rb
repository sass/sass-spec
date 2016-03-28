require 'rubygems/version'

module SassSpec
  SPEC_DIR = File.expand_path('../../spec', __FILE__)
  LANGUAGE_VERSIONS = %w(
    3.4
    3.5
    4.0
  )
  MIN_LANGUAGE_VERSION = Gem::Version.new(LANGUAGE_VERSIONS.first)
  MAX_LANGUAGE_VERSION = Gem::Version.new(LANGUAGE_VERSIONS.last)
end

require_relative 'sass_spec/test_case_metadata'
require_relative 'sass_spec/cli'
require_relative 'sass_spec/runner'
