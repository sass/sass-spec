# frozen_string_literal: true

require_relative 'spec_helper'
require 'sass_spec'

describe SassSpec::TestCaseMetadata do
  include_context :uses_temp_dir

  def create_options_yaml(folder=nil, dictionary)
    dir = folder ? File.join(self.dir, folder) : self.dir
    FileUtils.mkdir_p(dir)
    File.write("#{dir}/options.yml", dictionary.to_yaml)
  end

  def metadata(folder=nil)
    SassSpec::TestCaseMetadata.new(
      SassSpec::Directory.new(folder ? File.join(self.dir, folder) : self.dir))
  end

  it 'should ignore impl when given ignore_for' do
    create_options_yaml(ignore_for: ['dart_sass'])
    expect(metadata.ignore_for?('dart_sass')).to be true
  end

  it 'should ignore impl when given only_on' do
    create_options_yaml(only_on: ['dart_sass'])
    expect(metadata.ignore_for?('libsass')).to be true
  end

  it 'should have precision' do
    create_options_yaml(precision: 10)
    expect(metadata.precision).to eq 10
  end

  it 'should have todos for an impl' do
    create_options_yaml(todo: ['sass/libsass#2342'])
    expect(metadata.todo?('libsass')).to be true
  end

  it 'should have warning todos for an impl' do
    create_options_yaml(warning_todo: ['sass/libsass#2342'])
    expect(metadata.warning_todo?('libsass')).to be true
  end
end
