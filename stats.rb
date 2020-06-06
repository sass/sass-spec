#!/usr/bin/env ruby

module SassSpec
  module Stats
  end
end

require_relative 'lib/sass_spec'
require_relative 'lib/sass_spec/stats'

exceptions = [
  OptionParser::InvalidOption,
  OptionParser::AmbiguousOption,
  OptionParser::MissingArgument,
]

begin
  cli = SassSpec::Stats::CLI.parse(ARGV)
  cli.stats()
rescue *exceptions => e
  warn e.message + "\n\n"
  SassSpec::Stats::CLI.parse(%w(-h))
  exit 1
rescue
  exit 1
end
