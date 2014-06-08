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

# class SassSpec::Test
#   STATUSES = {
#     :passed  => ".",
#     :failed  => "F",
#     :error   => "!",
#     :unknown => "?", # hasn't run
#     :todo_failed => "T",
#     :todo_passed => "^" }

#   # Pass in the directory you are expecting to run in
#   def initialize(file)
#     @path  = File.dirname(file)
#   end

#   def status
#     @stutus ||= :unknown
#   end

#   def is_todo?
#     @is_todo ||= @path.split("/").include?("todo")
#   end

#   def path
#     @path
#   end

#   def input_file
#     File.join(@path, "input.scss")
#   end

#   def input
#     @input ||= File.read(input_file).to_s
#   end

#   def expected_output_file
#     File.join(@path, "expected_output.css")
#   end

#   def expected_output
#     @expected_output ||= File.read(expected_output_file).to_s
#   end

#   def message
#     @message ||= ""
#   end

#   def error?
#     @status == :error
#   end

#   def output
#     @output
#   end

#   def generate_output!(cmd = nil)
#     if cmd
#       @output = `#{cmd} #{input_file}`
#       if !$?.success?
#         @status = :error
#         @message = $?.to_s
#       end
#     else
#       @output = Sass::Engine.new(input, :syntax => :scss).render
#     end
#   end
# end