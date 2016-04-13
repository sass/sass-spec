require 'minitest'

def run_spec_test(test_case, options = {})
  if test_case.todo?
    skip "Skipped todo" unless options[:run_todo]
  end

  assert_filename_length!(test_case.input_path, options)
  assert_filename_length!(test_case.expected_path, options)

  assert File.exists?(test_case.input_path), "Input #{test_case.input_path} file does not exist"

  output, clean_output, error, status = test_case.output

  if test_case.overwrite?
    if status != 0
      File.open(test_case.status_path, "w+", :binmode => true) do |f|
        f.write(status)
      end
    elsif (File.file?(test_case.status_path))
      File.unlink(test_case.status_path)
    end

    if error.length > 0
      File.open(test_case.error_path, "w+", :binmode => true) do |f|
        f.write(error)
      end
    elsif (File.file?(test_case.error_path))
      File.unlink(test_case.error_path)
    end

    File.open(test_case.expected_path, "w+", :binmode => true) do |f|
      f.write(output)
    end
  end

  assert File.exists?(test_case.expected_path), "Expected #{test_case.expected_path} file does not exist"

  begin
    if test_case.should_fail?
       # XXX Ruby returns 65 etc. SassC returns 1
       refute_equal status, 0, "Test case should fail, but it did not"
    else
       assert_equal 0, status, "Command `#{options[:engine_adapter]}` did not complete:\n\n#{error}"
    end
    assert_equal test_case.expected, clean_output, "Expected did not match output"
    if test_case.verify_stderr?
      # Compare only first line of error output (we can't compare stacktraces etc.)
      begin
        skip = false
        error_lines = error.each_line
        while error_line = error_lines.next do
          if (error_line =~ /DEPRECATION WARNING/)
            skip = false
          end
          if (error_line =~ /Error:/)
            skip = false
          end
          # disable once we support this deprecation fully
          if (error_line =~ /interpolation near operators will be simplified/)
            skip = true
            next
          end
          # disable once we support this deprecation fully
          # if (error_line =~ /The subject selector operator \"!\" is deprecated and will be removed/)
          #   skip = true
          #   next
          # end
          # disable once we support this deprecation fully
          if (error_line =~ /Passing a percentage as the alpha/)
            skip = true
            next
          end
          # disable once we support this deprecation fully (partial now)
          # if (error_line =~ /, a non-string value, to unquote()/)
          #   skip = true
          #   next
          # end
          if (skip)
            next
          end
          error_msg = error_line.rstrip
          break
        end
        expected_error_lines = test_case.expected_error.each_line
        while expected_error_line = expected_error_lines.next do
          if (expected_error_line =~ /DEPRECATION WARNING/)
            skip = false
          end
          if (expected_error_line =~ /Error:/)
            skip = false
          end
          # disable once we support this deprecation fully
          if (expected_error_line =~ /interpolation near operators will be simplified/)
            skip = true
            next
          end
          # disable once we support this deprecation fully
          # if (expected_error_line =~ /The subject selector operator \"!\" is deprecated and will be removed/)
          #   skip = true
          #   next
          # end
          # disable once we support this deprecation fully
          if (expected_error_line =~ /Passing a percentage as the alpha/)
            skip = true
            next
          end
          # disable once we support this deprecation fully (partial now)
          # if (expected_error_line =~ /, a non-string value, to unquote()/)
          #   skip = true
          #   next
          # end
          if (skip)
            next
          end
          expected_error_msg = expected_error_line.rstrip
          break
        end
        error_msg = _clean_debug_path(error_msg, options[:spec_directory])
        expected_error_msg = _clean_debug_path(expected_error_msg, options[:spec_directory])
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

GEMFILE_PREFIX_LENGTH = 68
# When running sass-spec as a gem from github very long filenames
# can cause installation issues. This checks that the paths in use will work.
def assert_filename_length!(filename, options)
  name = relative_name = filename.to_s.sub(File.expand_path(options[:spec_directory]), "")
  assert false, "Filename #{name} must no more than #{256 - GEMFILE_PREFIX_LENGTH} characters long" if name.size > (256 - GEMFILE_PREFIX_LENGTH)

  if name.size <= 100 then
    prefix = ""
  else
    parts = name.split(/\//)
    newname = parts.pop
    nxt = ""

    loop do
      nxt = parts.pop
      break if newname.size + 1 + nxt.size > 100
      newname = nxt + "/" + newname
    end

    prefix = (parts + [nxt]).join "/"
    name = newname

    assert false, "base name (#{name}) of #{relative_name} must no more than 100 characters long" if name.size > 100
    assert false, "prefix (#{prefix}) of #{relative_name} must no more than #{155 - GEMFILE_PREFIX_LENGTH} characters long" if prefix.size > (155 - GEMFILE_PREFIX_LENGTH)
  end
  return nil
end

def _clean_debug_path(error, spec_dir)
  spec_dir = File.expand_path(spec_dir)
  url = spec_dir.gsub(/\\/, '\/')
  error.gsub(/^.*?(input.scss:\d+ DEBUG:)/, '\1')
       .gsub(/\/+/, "/")
       .gsub(/^#{Regexp.quote(url)}\//, "/sass/sass-spec/")
       .gsub(/^#{Regexp.quote(spec_dir)}\//, "/sass/sass-spec/")
       .gsub(/(?:\/todo_|_todo\/)/, "/")
       .gsub(/\/libsass\-[a-z]+\-tests\//, "/")
       .gsub(/\/libsass\-[a-z]+\-issues/, "/libsass-issues")
       .strip
end


# Holder to put and run test cases
class SassSpec::Test < Minitest::Test
  def self.create_tests(test_cases, options = {})
    test_cases[0..options[:limit]].each do |test_case|
      define_method("test__#{test_case.name}") do
        run_spec_test(test_case, options)
      end
    end
  end
end
