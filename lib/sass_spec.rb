require 'rubygems/version'

module SassSpec
  SPEC_DIR = File.expand_path('../../specs', __FILE__)
  LANGUAGE_VERSIONS = %w(
    3.5
    3.6
    3.7
    3.8
    4.0
  )
  MIN_LANGUAGE_VERSION = Gem::Version.new(LANGUAGE_VERSIONS.first)
  MAX_LANGUAGE_VERSION = Gem::Version.new(LANGUAGE_VERSIONS.last)
end

require_relative 'sass_spec/test_case_metadata'
require_relative 'sass_spec/cli'
require_relative 'sass_spec/runner'
