#!/usr/bin/env ruby

require_relative 'lib/sass_spec'

module SassSpec
  module Stats
  end
end

exceptions = [
  OptionParser::InvalidOption,
  OptionParser::AmbiguousOption,
  OptionParser::MissingArgument,
]

if ARGV[0] == "todo"
  require_relative 'lib/sass_spec/stats/todo'
  begin
    (cli = SassSpec::Stats::Todo.parse(ARGV[1..-1])) || exit(1)
  rescue *exceptions => e
    warn e.message + "\n\n"
    SassSpec::Stats::Todo.parse(%w(-h))
    exit 1
  end
  cli.stats() || exit(1)
end
