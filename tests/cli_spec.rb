# frozen_string_literal: true

require_relative 'spec_helper'

RSpec.describe 'run tests', type: :aruba do
  it 'runs a single spec' do
    run_command command('basic')

    expect(last_command_started).to be_successfully_executed
  end

  it 'should not run todo specs by default' do
    run_command command('todo')

    expect(last_command_started).to be_successfully_executed
    expect(test_results(last_command_started.output)[:skips]).to eq 1
  end

  it 'should run todo specs with --run-todo flag' do
    run_command command('todo', ["--run-todo"])

    expect(last_command_started).to be_successfully_executed
    expect(test_results(last_command_started.output)[:skips]).to eq 0
  end

  it 'should not allow limit to take a negative number' do
    run_command command('limit', ["--limit -10"])

    expect(last_command_started).to_not be_successfully_executed
  end

  it 'should not allow limit to take a negative number' do
    run_command command('limit', ["--run-todo", "--limit 3"])

    expect(last_command_started).to be_successfully_executed
    expect(test_results(last_command_started.output)[:runs]).to eq 3
  end
end
