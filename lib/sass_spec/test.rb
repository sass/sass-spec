require 'minitest'
require 'fileutils'
require_relative "interactor"

def run_spec_test(test_case, options = {})
  if test_case.todo?
    skip "Skipped todo" unless options[:run_todo]
  end

  assert_filename_length!(test_case.input_path, options)
  assert_filename_length!(test_case.expected_path, options)

  assert File.exists?(test_case.input_path), "Input #{test_case.input_path} file does not exist"

  _output, clean_output, error, status = test_case.output

  if test_case.overwrite?
    overwrite_test!(test_case)
    return
  end

  return unless handle_missing_output!(test_case)

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
      error_msg = _extract_error_message(error, options)
      expected_error_msg = _extract_error_message(test_case.expected_error, options)
      if error_msg.nil?
        assert_equal expected_error_msg, nil, "No error message produced"
      else
        assert_equal expected_error_msg, error_msg, "Expected did not match error"
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

def handle_missing_output!(test_case)
  return true if File.exists?(test_case.expected_path)

  output, _, error, _ = test_case.output
  if test_case.interactive?
    Interactor.interact do |i|
      i.prompt "In #{test_case.name}\n" +
               "Expected output file does not exist."

      i.choice(:show_source, "Show me the input.") do
        input = File.read(test_case.input_path)

        delim = "*" * input.lines.map{|l| l.rstrip.size}.max

        puts delim
        puts input
        puts delim

        i.restart!
      end

      i.choice(:show, "Show me the #{error.length > 0 ? 'error' : 'output'} generated.") do
        to_show = error
        to_show = output if to_show.length == 0
        to_show = "No output or error to display." if to_show.length == 0

        delim = "*" * to_show.lines.map{|l| l.rstrip.size}.max

        puts delim
        puts to_show
        puts delim

        i.restart!
      end

      i.choice(:delete, "Delete test.") do
        if delete_test!(test_case)
          return false
        else
          i.restart!
        end
      end

      i.choice(:overwrite, "Create it and pass test.") do
        overwrite_test!(test_case)
        return false
      end

      i.choice(:fail, "Mark as failed.") do
        assert false, "Expected #{test_case.expected_path} file does not exist"
      end

      i.choice(:exit, "Exit testing.") do
        raise Interrupt
      end
    end
  end

end

def delete_test!(test_case)
  files = Dir.glob(File.join(test_case.folder, "**", "*"))
  result = Interactor.interact do |i|
    i.prompt("The following files will be removed:\n  * " + files.join("\n  * "))
    i.choice(:proceed, "Delete them.") do
      FileUtils.rm_rf(test_case.folder)
    end
    i.choice(:abort, "I changed my mind.") do
    end
  end
  result == :proceed
end

def overwrite_test!(test_case)
  output, _, error, status = test_case.output

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

def _extract_error_message(error, options)
  skip = false
  error.each_line do |error_line|
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
    return _clean_debug_path(error_line.rstrip, options[:spec_directory])
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
