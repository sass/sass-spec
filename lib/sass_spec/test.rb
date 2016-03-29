require 'minitest'
require 'fileutils'
require 'yaml'
require_relative "interactor"

def run_spec_test(test_case, options = {})
  if test_case.todo? && !options[:run_todo]
    skip "Skipped #{test_case.folder}"
  end

  assert_filename_length!(test_case.input_path, options)
  assert_filename_length!(test_case.expected_path, options)

  assert File.exists?(test_case.input_path),
    "Input #{test_case.input_path} file does not exist"

  if test_case.overwrite?
    overwrite_test!(test_case)
    return true
  end

  return unless handle_missing_output!(test_case)
  return unless handle_unexpected_error!(test_case, options)
  return unless handle_unexpected_pass!(test_case, options)
  return unless handle_output_difference!(test_case, options)

  if test_case.warning_todo? && !options[:run_todo]
    skip "Skipped warning check for #{test_case.folder}"
  else
    return unless handle_expected_error_message!(test_case, options)
    return unless handle_unexpected_error_message!(test_case, options)
  end

  return true
end

$interaction_memory = {}

# if the test case is interactive it will do the interaction and return
# the choice. Otherwise, it returns the default.
def interact(test_case, prompt_id, default, &block)
  if test_case.interactive?
    return SassSpec::Interactor.interact_with_memory($interaction_memory, prompt_id, &block)
  else
    return default
  end
end

def skip_test_case!(test_case, reason = nil)
  msg = "Skipped #{test_case.folder}" 
  if reason
    msg << ": #{reason}"
  else
    msg << "."
  end
  skip msg
end

def handle_expected_error_message!(test_case, options)
  return true unless test_case.verify_stderr?

  _output, _clean_output, error, _status = test_case.output

  error_msg = _extract_error_message(error, options)
  expected_error_msg = _extract_error_message(test_case.expected_error, options)

  if expected_error_msg != error_msg
    skip_test_case!(test_case, "TODO test is failing") if test_case.probe_todo?

    interact(test_case, :expected_error_different, :fail) do |i|
      i.prompt(error_msg.nil? ? "An error message was expected but wasn't produced." :
                                "Error output doesn't match what was expected.")

      i.choice(:show_source, "Show me the input.") do
        display_text_block(File.read(test_case.input_path))
        i.restart!
      end

      if error_msg.nil?
        i.choice(:show, "Show expected error.") do
          display_text_block(expected_error_msg)
          i.restart!
        end
      else
        i.choice(:show, "Show diff.") do
          require 'diffy'
          display_text_block(
            Diffy::Diff.new("Expected\n#{expected_error_msg}",
                            "Actual\n#{error_msg}").to_s(:color))
          i.restart!
        end
      end

      i.choice(:overwrite, "Update expected output and pass test.") do
        overwrite_test!(test_case)
        return false
      end

      i.choice(:migrate, "Migrate copy of test to pass current version.") do
        migrate_test!(test_case, options) || i.restart!
        return false
      end

      i.choice(:todo, "Mark warning as todo for #{test_case.impl}.") do
        change_options(test_case.options_path, add_warning_todo: [test_case.impl])
        return false
      end

      i.choice(:fail, "Mark as failed.")

      i.choice(:exit, "Exit testing.") do
        raise Interrupt
      end
    end
  end

  assert_equal expected_error_msg, error_msg,
    (error_msg.nil? ? "No error message produced" : "Expected did not match error")

  return true
end

def handle_unexpected_error_message!(test_case, options)
  return true if test_case.verify_stderr?

  _output, _clean_output, error, _status = test_case.output

  error_msg = _extract_error_message(error, options)

  return true if error_msg.nil? || error_msg.length == 0

  skip_test_case!(test_case, "TODO test is failing")  if test_case.probe_todo?

  interact(test_case, :unexpected_error_message, :fail) do |i|
    i.prompt "Unexpected output to stderr"

    i.choice(:show_source, "Show me the input.") do
      display_text_block(File.read(test_case.input_path))
      i.restart!
    end

    i.choice(:show, "Show error.") do
      display_text_block(error)
      i.restart!
    end

    i.choice(:overwrite, "Update expected error and pass test.") do
      overwrite_test!(test_case)
      return false
    end

    i.choice(:migrate, "Migrate copy of test to pass current version.") do
      migrate_test!(test_case, options) || i.restart!
      return false
    end

    i.choice(:todo, "Mark warning as todo for #{test_case.impl}.") do
      change_options(test_case.options_path, add_warning_todo: [test_case.impl])
      return false
    end

    i.choice(:fail, "Mark as failed.")

    i.choice(:exit, "Exit testing.") do
      raise Interrupt
    end
  end
  assert false, "Unexpected Error Output: #{error_msg}"
end

def handle_output_difference!(test_case, options)
  _output, clean_output, _error, _status = test_case.output

  return true if test_case.expected == clean_output

  if test_case.migrate? && !test_case.interactive?
    migrate_test!(test_case, options)
    return false
  end

  skip_test_case!(test_case, "TODO test is failing") if test_case.probe_todo?

  interact(test_case, :output_difference, :fail) do |i|
    i.prompt "output does not match expectation"

    i.choice(:show_source, "Show me the input.") do
      display_text_block(File.read(test_case.input_path))
      i.restart!
    end

    i.choice(:diff, "show diff.") do
      require 'diffy'
      display_text_block(
        Diffy::Diff.new("Expected\n" + test_case.expected,
                        "Actual\n" + clean_output).to_s(:color))
      i.restart!
    end

    i.choice(:overwrite, "Update expected output and pass test.") do
      overwrite_test!(test_case)
      return false
    end

    i.choice(:migrate, "Migrate copy of test to pass current version.") do
      migrate_test!(test_case, options) || i.restart!
      return false
    end

    i.choice(:fail, "Mark as failed.")

    i.choice(:exit, "Exit testing.") do
      raise Interrupt
    end
  end

  assert_equal test_case.expected, clean_output, "expected did not match output"
  return true
end

def handle_missing_output!(test_case)
  return true if File.exists?(test_case.expected_path)

  output, _, error, _ = test_case.output

  skip_test_case!(test_case, "TODO test is failing") if test_case.probe_todo?

  choice = interact(test_case, :missing_output, :fail) do |i|
    i.prompt "in #{test_case.name}\n" +
             "Expected output file does not exist."

    i.choice(:show_source, "Show me the input.") do
      display_text_block(File.read(test_case.input_path))
      i.restart!
    end

    i.choice(:show, "Show me the #{error.length > 0 ? 'error' : 'output'} generated.") do
      to_show = error
      to_show = output if to_show.length == 0
      to_show = "No output or error to display." if to_show.length == 0

      display_text_block(to_show)
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

    i.choice(:fail, "Mark as failed.")

    i.choice(:exit, "Exit testing.") do
      raise Interrupt
    end
  end
  return true unless choice == :fail
  assert false, "Expected #{test_case.expected_path} file does not exist"
  return true
end

def handle_unexpected_pass!(test_case, options)
  output, _clean_output, error, status = test_case.output
  if status == 0
    return true if !test_case.should_fail?

    if test_case.migrate? && !test_case.interactive?
      migrate_test!(test_case, options)
      return false
    end

    return false if test_case.probe_todo?
    choice = interact(test_case, :unexpected_pass, :fail) do |i|
      i.prompt "In #{test_case.name}\n" +
               "A failure was expected but it compiled instead."
      i.choice(:show_source, "Show me the input.") do
        display_text_block(File.read(test_case.input_path))
        i.restart!
      end

      i.choice(:show_expected_error, "Show me the expected error.") do
        display_text_block(File.read(test_case.error_path))
        i.restart!
      end

      i.choice(:show_output, "Show me the output.") do
        display_text_block(output)
        i.restart!
      end

      i.choice(:fix, "Update test and mark it passing.") do
        overwrite_test!(test_case)
      end

      i.choice(:migrate, "Migrate copy of test to pass current version.") do
        migrate_test!(test_case, options) || i.restart!
      end

      i.choice(:fail, "Fail test and continue.")

      i.choice(:exit, "Exit testing.") do
        raise Interrupt
      end
    end
    return false unless choice == :fail
  end
  # XXX Ruby returns 65 etc. SassC returns 1
  refute_equal status, 0, "Test case should fail, but it did not"
  return true
end

def handle_unexpected_error!(test_case, options)
  _output, _clean_output, error, status = test_case.output
  if status != 0
    return true if test_case.should_fail?

    if test_case.migrate? && !test_case.interactive?
      migrate_test!(test_case, options)
      return false
    end

    skip_test_case!(test_case, "TODO test is failing") if test_case.probe_todo?

    choice = interact(test_case, :unexpected_error, :fail) do |i|
      i.prompt "In #{test_case.name}\n" +
               "An unexpected compiler error was encountered."
      i.choice(:show_source, "Show me the input.") do
        display_text_block(File.read(test_case.input_path))
        i.restart!
      end

      i.choice(:show_expected_error, "Show me the error.") do
        display_text_block(error)
        i.restart!
      end

      i.choice(:show_output, "Show me the expected output.") do
        display_text_block(test_case.expected)
        i.restart!
      end

      i.choice(:fix, "Update test to expect this failure.") do
        overwrite_test!(test_case)
      end

      i.choice(:migrate, "Migrate copy of test to pass current version.") do
        migrate_test!(test_case, options) || i.restart!
      end

      i.choice(:fail, "Fail test and continue.")

      i.choice(:exit, "Exit testing.") do
        raise Interrupt
      end
    end
    return false unless choice == :fail
  end
  assert_equal 0, status,
    "Command `#{options[:engine_adapter]}` did not complete:\n\n#{error}"
  return true
end

def delete_test!(test_case)
  files = Dir.glob(File.join(test_case.folder, "**", "*"))
  result = interact(test_case, :delete_test, :proceed) do |i|
    i.prompt("The following files will be removed:\n  * " + files.join("\n  * "))
    i.choice(:proceed, "Delete them.") do
      FileUtils.rm_rf(test_case.folder)
    end
    i.choice(:abort, "I changed my mind.") do
    end
  end
  result == :proceed
end


ANSI_ESCAPES = /[\u001b\u009b][\[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/
def display_text_block(text)
  delim = "*" * text.gsub(ANSI_ESCAPES, '').lines.map{|l| l.rstrip.size}.max

  puts delim
  puts text
  puts delim
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

# Copy a test
# Mark the original as only being valid until the version before the current version.
# Mark the copy as being valid starting with the current version.
# Update copy to expect current actual results.
def migrate_test!(test_case, options)
  current_version = options[:language_version]
  current_version_index = SassSpec::LANGUAGE_VERSIONS.index(current_version)
  if current_version_index == 0
    puts "Cannot migrate test. There's no version earlier than #{current_version}."
    return false
  end

  start_version_index = SassSpec::LANGUAGE_VERSIONS.index(
    test_case.metadata.start_version.to_s)

  if start_version_index >= current_version_index
    puts "Cannot migrate test. Test does not apply to an earlier version."
    return false
  end

  previous_version = SassSpec::LANGUAGE_VERSIONS[current_version_index - 1]

  new_folder = test_case.folder + "-#{current_version}"

  if File.exist?(new_folder)
    choice = interact(test_case, :migrate_over_existing, :abort) do |i|
      i.prompt("Target folder '#{new_folder}' already exists.")
      i.choice(:abort, "Don't migrate the test.") do
        return false
      end
      i.choice(:remove, "Remove it.") do
        unless delete_test!(SassSpec::TestCase.new(new_folder, options))
          i.restart!
        end
      end
    end

    if choice == :abort
      puts "Cannot migrate test. #{new_folder} already exists."
      return false
    end
  end

  FileUtils.cp_r test_case.folder, new_folder

  new_test_case = SassSpec::TestCase.new(new_folder, options)

  change_options(test_case.options_path, end_version: previous_version)

  change_options(new_test_case.options_path, start_version: current_version)

  overwrite_test!(new_test_case)

  return true
end

def change_options(options_file, options)
  existing_options = if File.exist?(options_file)
                       YAML.load_file(options_file)
                     else
                       {}
                     end

  existing_options = SassSpec::TestCaseMetadata.merge_options(existing_options, options)

  if existing_options.any?
    File.open(options_file, "w") do |f|
      f.write(existing_options.to_yaml)
    end
  else
    File.unlink(options_file) if File.exist?(options_file)
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
  error_message = ""
  consume_next_line = false
  error.each_line do |line|
    if consume_next_line
      next if line.strip == ""
      error_message += line
      break
    end
    if (line =~ /DEPRECATION WARNING/)
      if line.rstrip.end_with?(":")
        error_message = line.rstrip + "\n"
        consume_next_line = true
        next
      else
        error_message = line
        break
      end
    end
    if (line =~ /Error:/)
      error_message = line
      break
    end
  end
  _clean_debug_path(error_message.rstrip, options[:spec_directory])
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
        test_case.finalize(run_spec_test(test_case, options))
      end
    end
  end
end
