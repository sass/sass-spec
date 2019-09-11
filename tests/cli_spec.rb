require_relative 'spec_helper'

RSpec.describe "run tests", type: :aruba do
  it "runs a single spec" do
    run_command "#{Dir.pwd}/sass-spec.rb --command '#{Dir.pwd}/tests/output_hrx' --cmd-args '#{Dir.pwd}/spec/colors/basic.hrx' #{Dir.pwd}/spec/colors/basic.hrx"

    expect(extract_text(last_command_started.output)).to  include("2 runs, 0 assertions, 0 failures, 0 errors, 0 skips")
  end
end
