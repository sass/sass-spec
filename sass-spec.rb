#!/usr/bin/env ruby

#This script requires a standard directory hierarchy which might be a bit cumbersome to set up
#
#The hierarchy looks like this near the leaves:
#...
#|-test_subclass_1
#| |-test_1
#| | |-input.scss
#| | --expected_output.css
#| --test_2
#|   |-input.scss
#|   --expected_output.css
#|-test_subclass_2
#| |-test_1
#| | |-input.scss
#| | --expected_output.css
#...
#the point is to have all the tests in their own folder in a file named input* with
#the output of running a command on it in the file expected_output* in the same directory

require_relative 'lib/sass_spec'

if ARGV[0] == "annotate"
  require_relative 'lib/sass_spec/annotate'
  begin
    (cli = SassSpec::Annotate::CLI.parse(ARGV[1..-1])) || exit(1)
  rescue OptionParser::InvalidOption => e
    warn e.message + "\n\n"
    SassSpec::Annotate::CLI.parse(%w(-h))
    exit 1
  end
  cli.annotate || exit(1)
else
  begin
    SassSpec::Runner.new(SassSpec::CLI.parse()).run || exit(1)
  rescue ArgumentError => e
    warn e.message
    warn e.backtrace
    exit 1
  end
end
