# coding: utf-8
# frozen_string_literal: true

require 'fakefs/spec_helpers'
require 'rspec'
require 'aruba/rspec'

Aruba.configure do |config|
  config.allow_absolute_paths = true
end

# Given the output of sass-spec,
# return the number of tests in
# each state (success, failed, etc)
def test_results(output)
  results = {}
  matches = output.match(
    /(?<runs>\d+) runs, (?<assertions>\d+) assertions, (?<failures>\d+) failures, (?<errors>\d+) errors, (?<skips>\d+) skips/
  )
  matches.names.each { |k, v| results[k.to_sym] = matches[k].to_i }
  results
end

# Gives a command string that Aruba should run for a unit test.
# This command calls sass-spec using the sass stub.
# It takes in the name of a fixture folder and an array of additional flags.
def run_sass(fixture_folder, additional_flags = [])
  copy "#{Dir.pwd}/tests/fixtures/#{fixture_folder}", 'tmp/aruba/spec'
  run_command([
    "#{Dir.pwd}/sass-spec.rb #{additional_flags.join(' ')}",
    "--command '#{Dir.pwd}/tests/sass_stub'",
    'tmp/aruba/spec'
  ].join(' '))
end

# A context with a mocked filesystem.
shared_context :uses_fs do
  include FakeFS::SpecHelpers

  # Returns `subdir` within the root spec directory. If `subdir` isn't passed,
  # returns `'spec'` on its own.
  def dir(subdir=nil)
    subdir ? File.join('spec', subdir) : 'spec'
  end
end

# A context with a real temporary filesystem, for cases where mock_fs doesn't
# quite work.
shared_context :uses_real_fs do
  before(:each) { FakeFS.deactivate! }

  around do |example|
    Dir.mktmpdir('sass-spec-tests-') do |dir|
      @dir = dir
      Dir.chdir(dir) { example.run }
    end
  end

  def dir(subdir=nil)
    subdir ? File.join('spec', subdir) : 'spec'
  end
end
