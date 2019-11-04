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
