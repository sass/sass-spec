require 'minitest'
require 'pathname'
require_relative 'test'


class SassSpec::Runner

  def initialize(options = {})
    @options = options
    @input_file = 'input.scss'
    @expected_file = 'expected_output.css'
  end

  def run
    test_cases = _get_cases
    SassSpec::Test.create_tests(test_cases)
    Minitest.autorun
  end

  def _get_cases
    cases = []
    Dir.chdir('./spec') do
      Dir.glob("**/#{@input_file}") do |filename|
        expected = Pathname.new(filename).dirname + @expected_file
        input = Pathname.new(filename)
        cases.push SassSpec::TestCase.new(input.realpath, expected.realpath)
      end
    end
    return cases
  end

end