# frozen_string_literal: true

require_relative 'spec_helper'

RSpec.describe 'run tests', type: :aruba do
  it 'runs a single spec' do
    run_command "#{Dir.pwd}/sass-spec.rb --command "\
                "'#{Dir.pwd}/tests/sass_stub' "\
                "#{Dir.pwd}/tests/fixtures/basic"
    expect(last_command_started).to be_successfully_executed
  end

  it 'should not run todo specs by default' do
    run_command "#{Dir.pwd}/sass-spec.rb --command "\
                "'#{Dir.pwd}/tests/sass_stub' "\
                "#{Dir.pwd}/tests/fixtures/todo"
    expect(last_command_started).to be_successfully_executed
    expect(test_results(last_command_started.output)[:skips]).to eq 1
  end

  it 'should run todo specs with --run-todo flag' do
    run_command "#{Dir.pwd}/sass-spec.rb --run-todo --command "\
                "'#{Dir.pwd}/tests/sass_stub' "\
                "#{Dir.pwd}/tests/fixtures/todo"
    expect(last_command_started).to be_successfully_executed
    expect(test_results(last_command_started.output)[:skips]).to eq 0
  end

  it 'should not allow limit to take a negative number' do
    run_command "#{Dir.pwd}/sass-spec.rb --limit -10 --command "\
                "'#{Dir.pwd}/tests/sass_stub' "\
                "#{Dir.pwd}/tests/fixtures/basic"
    expect(last_command_started).to_not be_successfully_executed
  end

  it 'should not allow limit to take a negative number' do
    run_command "#{Dir.pwd}/sass-spec.rb --run-todo --limit 1 --command "\
                "'#{Dir.pwd}/tests/sass_stub' "\
                "#{Dir.pwd}/tests/fixtures/todo"
    expect(last_command_started).to be_successfully_executed
    expect(test_results(last_command_started.output)[:runs]).to eq 1
  end
end
