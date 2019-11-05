require 'minitest'
require 'thread'
require 'fileutils'
require 'yaml'
require_relative "interactor"
require_relative "util"

# Holder to put and run test cases
class SassSpec::Test < Minitest::Test
  def self.create_tests(test_cases, options = {})
    options[:limit] = test_cases.length + 1 unless options[:limit]
    test_cases[0...options[:limit]].each do |test_case|
      define_method("test__#{test_case.name}") do
        runner = SassSpecRunner.new(test_case, options)
        test_case.finalize(runner.run)
        self.assertions += runner.assertions
      end
    end
  end
end

class SassSpecRunner
  include MiniTest::Assertions

  attr_accessor :assertions

  @@interaction_memory = {}

  def initialize(test_case, options = {})
    @assertions = 0
    @test_case = test_case
    @options = options
  end

  def run
    if @test_case.todo? && !@options[:run_todo]
      skip "Skipped #{@test_case.name}"
    end

    unless @test_case.dir.hrx?
      @test_case.dir.glob("*").each {|p| assert_filename_length!(File.join(@test_case.dir.path, p))}
    end

    @output, @error, @status = @test_case.run(@options[:engine_adapter])
    @output = @output.gsub(/\r\n/, "\n")
    @normalized_output = SassSpec::Util.normalize_output(@output)
    @error = SassSpec::Util.normalize_error(@error)

    if @options[:generate]
      overwrite_test!
      return true
    end

    # Allow checks to throw `:done` to indicate that no more checks need to be
    # performed. We throw rather than returning a boolean so that we can do
    # checks in nested functions without worrying about piping return values.
    catch :done do
      check_annotations!
      handle_conflicting_files!
      handle_missing_output!
      handle_unexpected_error!
      handle_unexpected_pass!
      handle_output_difference!

      # Run these checks last because `handle_stderr_difference!` can skip the
      # test if `@test_case.warning_todo?` is set, and we only want to check for
      # an unnecessary TODO if the test isn't skipped because of a TODO.
      handle_stderr_difference!
      handle_unnecessary_todo!
    end

    return true
  end

  private

  ## Failure handlers

  def check_annotations!
    return unless @options[:check_annotations]

    ignored_warning_impls = @test_case.metadata.warnings_ignored_for

    if ignored_warning_impls.any? && @error.empty?
      message = "No warning issued, but warnings are ignored for #{ignored_warning_impls.join(', ')}"
      choice = interact(:ignore_warning_nonexistant, :fail) do |i|
        i.prompt message

        i.choice('R', "Remove ignored status for #{ignored_warning_impls.join(', ')}") do
          change_options(remove_ignore_warning_for: ignored_warning_impls)
        end

        fail_or_exit_choice(i)
      end

      assert choice != :fail, message
    end

    todo_warning_impls = @test_case.metadata.all_warning_todos
    if todo_warning_impls.any? && @error.length == 0
      message = "No warning issued, but warnings are pending for #{todo_warning_impls.join(', ')}"
      choice = interact(:todo_warning_nonexistant, :fail) do |i|
        i.prompt message

        i.choice('R', "Remove TODO status for #{todo_warning_impls.join(', ')}") do
          change_options(remove_warning_todo: todo_warning_impls)
        end

        fail_or_exit_choice(i)
      end

      assert choice != :fail, message
    end
  end

  def handle_conflicting_files!
    if @test_case.file?("error", impl: true)
      impl = true
    elsif @test_case.file?("error")
      impl = false
    else
      return
    end

    output_file_exists = @test_case.file?("output.css", impl: impl)
    warning_file_exists = @test_case.file?("warning", impl: impl)
    return unless output_file_exists || warning_file_exists

    choice = interact(:conflicting_files, :fail) do |i|
      i.prompt "Test has both error and success outputs."

      show_test_case_choice(i)
      show_output_choice(i)

      delete_choice(i)

      i.choice('S', 'Keep the success output.') do
        @test_case.delete("error", impl: :auto)
        throw :done
      end

      i.choice('E', 'Keep the error output.') do
        @test_case.delete("output.css") if output_file_exists
        @test_case.delete("warning") if warning_file_exists
        throw :done
      end

      migrate_warning_choice(i) unless warning_file_exists
      update_output_choice(i)
      fail_or_exit_choice(i)
    end

    assert choice != :fail, "Expected #{@test_case.expected_path} file does not exist"
  end

  def handle_missing_output!
    return if @test_case.should_fail? || @test_case.expected

    skip_test_case!("TODO test is failing") if probe_todo?

    choice = interact(:missing_output, :fail) do |i|
      i.prompt "Expected output file does not exist."

      show_test_case_choice(i)
      show_output_choice(i)
      delete_choice(i)
      update_output_choice(i)
      fail_or_exit_choice(i)
    end

    assert choice != :fail, "Expected output.css file does not exist"
  end

  def handle_unexpected_error!
    return if @status == 0 || @test_case.should_fail?

    if !@options[:interactive] && @options[:migrate_impl]
      migrate_impl!
      throw :done
    end

    skip_test_case!("TODO test is failing") if @test_case.todo?

    choice = interact(:unexpected_error, :fail) do |i|
      i.prompt "An unexpected compiler error was encountered."

      show_test_case_choice(i)

      i.choice('e', "Show me the error.") do
        display_text_block(@error)
        i.restart!
      end

      update_output_choice(i)
      migrate_impl_choice(i)
      todo_choice(i)
      ignore_choice(i)
      fail_or_exit_choice(i)
    end
    throw :done unless choice == :fail

    assert_equal 0, @status,
      "Command `#{@options[:engine_adapter]}` did not complete:\n\n#{@error}"
  end

  def handle_unexpected_pass!
    return unless @status == 0 && @test_case.should_fail?

    if !@options[:interactive] && @options[:migrate_impl]
      migrate_impl!
      throw :done
    end

    skip_test_case!("TODO test is failing") if probe_todo?

    choice = interact(:unexpected_pass, :fail) do |i|
      i.prompt "A failure was expected but it compiled instead."

      show_test_case_choice(i)

      i.choice('o', "Show me the output.") do
        display_text_block(@output)
        i.restart!
      end

      migrate_warning_choice(i)
      update_output_choice(i)
      migrate_impl_choice(i)
      todo_choice(i)
      fail_or_exit_choice(i)
    end
    throw :done unless choice == :fail

    refute_equal @status, 0, "Test case should fail, but it did not"
  end

  def handle_output_difference!
    return if @test_case.should_fail? || @normalized_output == @test_case.expected

    if !@options[:interactive] && @options[:migrate_impl]
      migrate_impl!
      throw :done
    end

    skip_test_case!("TODO test is failing") if probe_todo?

    interact(:output_difference, :fail) do |i|
      i.prompt "Output does not match expectation."

      show_test_case_choice(i)

      i.choice('d', "show diff.") do
        require 'diffy'
        display_text_block(
          Diffy::Diff.new("Expected\n" + @test_case.expected,
                          "Actual\n" + @normalized_output).to_s(:color))
        i.restart!
      end

      update_output_choice(i)
      migrate_impl_choice(i)
      todo_choice(i)
      ignore_choice(i)
      fail_or_exit_choice(i)
    end

    assert_equal @test_case.expected, @normalized_output, "expected did not match output"
  end

  def handle_unnecessary_todo!
    return if probe_todo? && !@options[:interactive]
    return unless @test_case.todo? || @test_case.warning_todo?

    interact(:unnecessary_todo, :fail) do |i|
      i.prompt "Test is passing but marked as TODO."

      show_test_case_choice(i)

      unless @output.empty?
        i.choice('o', "Show me the output.") do
          display_text_block(@output)
          i.restart!
        end
      end

      i.choice('R', "Remove TODO status for #{@test_case.impl}.") do
        change_options(remove_todo: [@test_case.impl], remove_warning_todo: [@test_case.impl])
        throw :done
      end

      i.choice('f', "Mark as skipped.") do
        skip_test_case!("TODO test is passing")
      end

      i.choice('X', "Exit testing.") do
        raise Interrupt
      end
    end

    assert_equal @test_case.expected, @normalized_output, "expected did not match output"
  end

  def handle_stderr_difference!
    unless @test_case.should_fail?
      if @test_case.ignore_warning?
        return
      elsif @test_case.warning_todo? && !@options[:run_todo]
        skip_test_case! "Skipped warning check for #{@test_case.name}"
      end
    end

    error_msg = extract_error_message(@error)
    expected_error_msg = extract_error_message(
      @test_case.expected_error || @test_case.expected_warning)

    return if expected_error_msg == error_msg
    skip_test_case!("TODO test is failing") if probe_todo?

    message =
      if error_msg.empty?
        if @test_case.should_fail?
          "An error message was expected but wasn't produced."
        else
          "A warning was expected but wasn't produced."
        end
      elsif expected_error_msg.empty?
        "An unexpected warning was produced."
      else
        if @test_case.should_fail?
          "Error message doesn't match the expected error."
        else
          "Warning doesn't match the expected warning."
        end
      end

    type = @test_case.should_fail? ? :expected_error_different : :expected_warning_different
    interact(type, :fail) do |i|
      i.prompt(message)

      show_test_case_choice(i)

      unless error_msg.empty?
        i.choice('e', "Show #{@test_case.should_fail? ? 'error' : 'warning'}.") do
          display_text_block(error_msg)
          i.restart!
        end
      end

      i.choice('d', "Show diff.") do
        require 'diffy'
        display_text_block(
          Diffy::Diff.new("Expected\n#{expected_error_msg}",
                          "Actual\n#{error_msg}").to_s(:color))
        i.restart!
      end

      update_output_choice(i)
      migrate_impl_choice(i)
      todo_warning_choice(i)
      ignore_warning_choice(i)
      fail_or_exit_choice(i)
    end

    assert_equal expected_error_msg, error_msg, message
  end

  ## Interaction utilities

  # If the runner is running in interactive mode, runs the interaction defined
  # in the block and returns the result. Otherwise, just returns the default
  # value.
  def interact(prompt_id, default, &block)
    if @options[:interactive]
      print "\nIn test case: #{@test_case.name}"
      return SassSpec::Interactor.interact_with_memory(@@interaction_memory, prompt_id, &block)
    else
      return default
    end
  end

  def show_test_case_choice(i)
    i.choice('t', "Show me the test case.") do
      display_text_block(@test_case.dir.to_hrx)
      i.restart!
    end
  end

  def show_output_choice(i)
    if @status == 0
      i.choice('o', "Show me the output generated.") do
        display_text_block(@output)
        i.restart!
      end

      if @error.length > 0
        i.choice('e', "Show me the warning generated.") do
          display_text_block(@error)
          i.restart!
        end
      end
    else
      i.choice('e', "Show me the error generated.") do
        display_text_block(@error)
        i.restart!
      end
    end
  end

  def migrate_warning_choice(i)
    i.choice('W', "Migrate the error to a warning.") do
      @test_case.rename("error", "warning")
      throw :done
    end
  end

  def update_output_choice(i)
    i.choice('O', "Update expected output and pass test.") do
      overwrite_test!
      throw :done
    end
  end

  def migrate_impl_choice(i)
    i.choice('I', "Migrate copy of test to pass on #{@test_case.impl}.") do
      migrate_impl! || i.restart!
      throw :done
    end
  end

  def todo_choice(i)
    return if @test_case.todo?
    i.choice('T', "Mark spec as todo for #{@test_case.impl}.") do
      change_options(add_todo: [@test_case.impl])
      throw :done
    end
  end

  def ignore_choice(i)
    i.choice('G', "Ignore test for #{@test_case.impl} FOREVER.") do
      change_options(
        add_ignore_for: [@test_case.impl],
        remove_warning_todo: [@test_case.impl],
        remove_todo: [@test_case.impl])
      throw :done
    end
  end

  def delete_choice(i)
    i.choice('D', "Delete test.") do
      if delete_test!
        throw :done
      else
        i.restart!
      end
    end
  end

  def todo_warning_choice(i)
    return if @test_case.warning_todo?
    i.choice('T', "Mark warning as todo for #{@test_case.impl}.") do
      change_options(add_warning_todo: [@test_case.impl])
      throw :done
    end
  end

  def ignore_warning_choice(i)
    i.choice('G', "Ignore warning for #{@test_case.impl}.") do
      change_options(add_ignore_warning_for: [@test_case.impl])
      throw :done
    end
  end

  def fail_or_exit_choice(i)
    i.choice('f', "Mark as failed.")
    i.choice('X', "Exit testing.") do
      raise Interrupt
    end
  end

  # Deletes the current test case.
  #
  # In interactive mode, prompts the user and returns `false` if they decide not
  # to delete the test.
  def delete_test!
    result = interact(:delete_test, :proceed) do |i|
      files = @test_case.dir.glob("**/*")
      i.prompt("The following files will be removed:\n  * " + files.join("\n  * "))

      i.choice('D', "Delete them.") do
        @test_case.dir.delete_dir!
      end

      i.choice('x', "I changed my mind.") {}
    end
    result == :proceed || result == "D"
  end

  # Adds separate outputs for the test that are compatible with the current
  # implementation.
  def migrate_impl!
    if @status == 0
      if @test_case.expected != @normalized_output || @test_case.should_fail?
        @test_case.write("output.css", @output, impl: true)
      end

      if extract_error_message(@test_case.expected_warning) != extract_error_message(@error)
        @test_case.write("warning", @error, impl: true)
      end
    else
      actual_error = @test_case.expected_error && extract_error_message(@test_case.expected_error)
      if actual_error != extract_error_message(@error)
        @test_case.write("error", @error, impl: true)
      end
    end

    change_options(remove_warning_todo: [@test_case.impl], remove_todo: [@test_case.impl])
  end

  ## Other utilities

  # Returns whether the current test case is marked as TODO, but is still being
  # run because --probe-todo was passed. These specs shouldn't produce errors
  # when they fail.
  def probe_todo?
    @options[:probe_todo] && (@test_case.todo? || @test_case.warning_todo?)
  end

  def skip_test_case!(reason = nil)
    msg = "Skipped #{@test_case.name}"
    if reason
      msg << ": #{reason}"
    else
      msg << "."
    end
    skip msg
  end

  ANSI_ESCAPES = /[\u001b\u009b][\[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/
  def display_text_block(text)
    if text.empty?
      puts "*" * 20 + " (empty) " + "*" * 20
      return
    end

    delim = "*" * text.gsub(ANSI_ESCAPES, '').lines.map{|l| l.rstrip.size}.max

    puts delim
    puts text
    puts delim
  end

  def overwrite_test!
    if @status == 0
      @test_case.write("output.css", @output, impl: :auto)
      @test_case.delete("error", if_exists: true, impl: :auto)

      if @error.empty?
        @test_case.delete("warning", if_exists: true, impl: :auto)
      else
        @test_case.write("warning", @error, impl: :auto)
      end
    else
      @test_case.write("error", @error, impl: :auto)
      @test_case.delete("output.css", if_exists: true, impl: :auto)
      @test_case.delete("warning", if_exists: true, impl: :auto)
    end

    change_options(remove_warning_todo: [@test_case.impl], remove_todo: [@test_case.impl])
  end

  def change_options(new_options)
    existing_options = if @test_case.file?("options.yml")
                         YAML.load(@test_case.read("options.yml"))
                       else
                         {}
                       end

    existing_options = SassSpec::TestCaseMetadata.merge_options(existing_options, new_options)

    if existing_options.any?
      @test_case.write("options.yml", existing_options.to_yaml)
    else
      @test_case.delete("options.yml", if_exists: true)
    end
  end

  GEMFILE_PREFIX_LENGTH = 68
  # When running sass-spec as a gem from github very long filenames can cause
  # installation issues. This checks that the paths in use will work.
  def assert_filename_length!(filename)
    name = relative_name = filename.to_s.sub(SassSpec::SPEC_DIR, "")
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

  def extract_error_message(error)
    # We want to make sure dart-sass continues to generate correct stack traces
    # and text highlights, so we check its full error messages.
    if @options[:engine_adapter].describe == 'dart-sass'
      return clean_debug_path(error.rstrip)
    end

    error_message = ""
    consume_next_line = false
    error.each_line do |line|
      if consume_next_line
        next if line.strip == ""
        error_message += line
        break
      end
      if (line =~ /(DEPRECATION )?WARNING/)
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
    clean_debug_path(error_message.rstrip)
  end

  def clean_debug_path(error)
    error.gsub(/^.*?(input.scss:\d+ DEBUG:)/, '\1')
         .gsub(/\/+/, "/")
         .gsub(/^#{Regexp.quote(SassSpec::SPEC_DIR.gsub(/\\/, '\/'))}\//, "/sass/sass-spec/")
         .gsub(/^#{Regexp.quote(SassSpec::SPEC_DIR)}\//, "/sass/sass-spec/")
         .gsub(/(?:\/todo_|_todo\/)/, "/")
         .gsub(/\/libsass\-[a-z]+\-tests\//, "/")
         .gsub(/\/libsass\-[a-z]+\-issues/, "/libsass-issues")
         .strip
  end
end
