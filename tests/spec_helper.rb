# frozen_string_literal: true

require 'rspec'
require 'aruba/rspec'

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
def command(fixture_folder, additional_flags = [])
  ["#{Dir.pwd}/sass-spec.rb #{additional_flags.join(' ')}",
  "--command '#{Dir.pwd}/tests/sass_stub'",
  "#{Dir.pwd}/tests/fixtures/#{fixture_folder}"].join(' ')
end
