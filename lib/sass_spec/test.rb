require 'minitest'

def run_spec_test(test_case, options = {})
  if options[:skip_todo] && test_case.todo?
    skip "Skipped todo"
  end

  assert File.exists?(test_case.input_path), "Input #{test_case.input_path} file does not exist"

  output, clean_output, error, status = test_case.output

  if test_case.overwrite?
    if status != 0
      File.open(test_case.status_path, "w+", :binmode => true) do |f|
        f.write(status)
        f.close
      end
    elsif (File.file?(test_case.status_path))
      File.unlink(test_case.status_path)
    end

    if error.length > 0
      File.open(test_case.error_path, "w+", :binmode => true) do |f|
        f.write(error)
        f.close
      end
    elsif (File.file?(test_case.error_path))
      File.unlink(test_case.error_path)
    end

    File.open(test_case.expected_path, "w+", :binmode => true) do |f|
      f.write(output)
      f.close
    end
  end

  assert File.exists?(test_case.expected_path), "Expected #{test_case.expected_path} file does not exist"

  begin
    if test_case.should_fail?
       # XXX Ruby returns 65 etc. SassC returns 1
       refute_equal status, 0, "Test case should fail, but it did not"
    else
       assert_equal status, 0, "Command `#{options[:engine_adapter]}` did not complete:\n\n#{error}"
    end
    assert_equal test_case.expected, clean_output, "Expected did not match output"
    if test_case.verify_stderr?
      # Compare only first line of error output (we can't compare stacktraces etc.)
      begin
        error_lines = error.each_line
        error_msg = error_lines.next.rstrip
        if (error_msg =~ /DEPRECATION WARNING:? on line/)
          error_msg = error_lines.next.rstrip
        end
        expected_error_lines = test_case.expected_error.each_line
        expected_error_msg = expected_error_lines.next.rstrip
        if (expected_error_msg =~ /DEPRECATION WARNING:? on line/)
          expected_error_msg = expected_error_lines.next.rstrip
        end
        error_msg = _clean_debug_path(error_msg)
        expected_error_msg = _clean_debug_path(expected_error_msg)
        assert_equal expected_error_msg, error_msg, "Expected did not match error"
      rescue StopIteration
        assert_equal expected_error_msg, nil, "No error message produced"
      end
    end
  rescue Minitest::Assertion
    if test_case.todo? && options[:unexpected_pass]
      pass
    else
      raise
    end
  else
    if test_case.todo? && options[:unexpected_pass]
      raise "#{test_case.input_path} passed a test we expected it to fail"
    else
      pass
    end
  end
end

def _clean_debug_path(error)
  pwd = Dir.pwd
  url = pwd.gsub(/\\/, '\/')
  error.gsub(/^.*?(input.scss:\d+ DEBUG:)/, '\1')
       .gsub(/\/+/, "/")
       .gsub(/#{Regexp.quote(url)}\//, "/sass/sass-spec/")
       .gsub(/#{Regexp.quote(pwd)}\//, "/sass/sass-spec/")
       .gsub(/(?:\/todo_|_todo\/)/, "/")
       .gsub(/\/libsass\-[a-z]+\-tests\//, "/")
       .gsub(/\/libsass\-[a-z]+\-issues/, "/libsass-issues")
       .strip
end


# Holder to put and run test cases
class SassSpec::Test < Minitest::Test
  def self.create_tests(test_cases, options = {})
    test_cases[0..options[:limit]].each do |test_case|
      define_method('test__' << test_case.output_style + "_" + test_case.name) do
        run_spec_test(test_case, options)
      end
    end
  end
end
