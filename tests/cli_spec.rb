# frozen_string_literal: true

require_relative 'spec_helper'

RSpec.describe 'run tests', type: :aruba do
  it 'runs a single spec' do
    run_command "#{Dir.pwd}/sass-spec.rb --command "\
                "'#{Dir.pwd}/tests/sass_stub' "\
                "#{Dir.pwd}/tests/fixtures/colors"
    expect(last_command_started).to be_successfully_executed
  end
end
