require 'minitest'

def run_spec_test(test_case, options = {})
  if options[:skip_todo] && test_case.todo?
    skip "Skipped todo"
  end

  assert File.exists?(test_case.input_path), "Input #{test_case.input_path} file does not exist"
  assert File.exists?(test_case.expected_path), "Expected #{test_case.expected_path} file does not exist"

  output, clean_output, error, status = test_case.output

  if status != 0 && !options[:unexpected_pass]
    msg = "Command `#{options[:engine_adapter]}` did not complete:\n\n#{error}"

    raise msg
  end


  if options[:unexpected_pass] && test_case.todo? && (test_case.expected == clean_output)
    raise "#{test_case.input_path} passed a test we expected it to fail"
  end

  if options[:nuke]
    File.open(test_case.expected_path, "w+") do |f|
      f.write(output)
      f.close
    end
  end

  if test_case.todo? && options[:unexpected_pass]
    assert test_case.expected != clean_output, "Marked as todo and passed"
  elsif !test_case.todo? || !options[:skip_todo]
    assert_equal test_case.expected, clean_output, "Expected did not match output"
  end
end


# Holder to put and run test cases
class SassSpec::Test < Minitest::Test
  parallelize_me!
  def self.create_tests(test_cases, options = {})
    test_cases[0..options[:limit]].each do |test_case|
      define_method('test__' << test_case.output_style + "_" + test_case.name) do
        run_spec_test(test_case, options)
      end
    end
  end
end
