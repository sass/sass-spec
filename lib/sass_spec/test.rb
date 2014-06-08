require 'minitest'

def run_spec_test(test_case)
  assert test_case.input_path.readable?, "Input #{test_case.input_path} file does not exist"
  assert test_case.expected_path.readable?, "Expected #{test_case.expected_path} file does not exist"
  assert_equal test_case.expected, test_case.output, "Expected did not match output."
end

# This represents a specific test case.
class SassSpec::TestCase
  def initialize(input_scss, expected_css)
    @input = input_scss
    @expected = expected_css
  end

  def name
    return @input.dirname.to_s.sub(Dir.pwd + "/", "").gsub('/', '_')
  end

  def input_path
    return @input
  end

  def expected_path
    return @expected
  end

  def output
    return _clean_output `sass -q #{@input}`
  end

  def expected
    return _clean_output File.read(@expected)
  end

  def _clean_output(css)
    return css.strip.gsub(/\n/, "").squeeze(" ")
  end
end

# Holder to put and run test cases
class SassSpec::Test < Minitest::Test
  parallelize_me!
  def self.create_tests(test_cases)
    test_cases.each do |test_case|
      define_method('test_' + test_case.name) do 
        run_spec_test(test_case)
      end
    end
  end
end