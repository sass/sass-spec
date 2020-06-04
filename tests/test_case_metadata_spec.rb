# frozen_string_literal: true

require_relative 'spec_helper'
require 'sass_spec'

describe SassSpec::TestCaseMetadata do
  include_context :uses_fs
  after(:each) { SassSpec::TestCaseMetadata.cache.clear }

  def create_options_yaml(folder=nil, dictionary)
    dir = self.dir(folder)
    FileUtils.mkdir_p(dir)
    File.write(File.join(dir, 'options.yml'), dictionary.to_yaml)
  end

  def metadata(folder=nil)
    SassSpec::TestCaseMetadata.new(SassSpec::Directory.new(self.dir(folder)))
  end

  describe '#initialize' do
    it 'should load all options from the directory' do
      create_options_yaml(foo: 'bar', baz: 'qux', zip: 'zap')
      expect(metadata.options).to be == {foo: 'bar', baz: 'qux', zip: 'zap'}
    end

    context 'with a parent directory' do
      it 'should include options from the parent and child' do
        create_options_yaml(foo: 'bar')
        create_options_yaml('child', baz: 'qux')
        create_options_yaml('child/grandchild', zip: 'zap')
        expect(metadata('child/grandchild').options).to be == {foo: 'bar', baz: 'qux', zip: 'zap'}
      end

      it 'should prefer child options to parent options' do
        create_options_yaml(foo: 'parent')
        create_options_yaml('child', foo: 'child')
        expect(metadata('child').options).to be == {foo: 'child'}
      end

      it 'should consider directories without options to have empty options' do
        create_options_yaml(foo: 'bar')
        create_options_yaml('child/grandchild', baz: 'qux')
        expect(metadata('child/grandchild').options).to be == {foo: 'bar', baz: 'qux'}
      end

      context 'and mergeable options' do
        it 'should add each value to a list' do
          create_options_yaml(ignore_for: 'dart-sass')
          create_options_yaml('child', ignore_for: 'libsass')
          create_options_yaml('child/grandchild', ignore_for: 'future-sass')
          expect(metadata('child/grandchild').options).to(
            be == {ignore_for: %w[dart-sass libsass future-sass]})
        end

        it 'should concatenate list values' do
          create_options_yaml(ignore_for: 'dart-sass')
          create_options_yaml('child', ignore_for: ['libsass', 'future-sass'])
          expect(metadata('child').options).to(
            be == {ignore_for: %w[dart-sass libsass future-sass]})
        end
      end
    end
  end

  it 'should ignore impl when given ignore_for' do
    create_options_yaml(ignore_for: ['dart-sass'])
    expect(metadata.ignore_for?('dart-sass')).to be true
  end

  it 'should ignore impl when given only_on' do
    create_options_yaml(only_on: ['dart-sass'])
    expect(metadata.ignore_for?('libsass')).to be true
  end

  it 'should have precision' do
    create_options_yaml(precision: 10)
    expect(metadata.precision).to eq 10
  end

  context 'with todos' do
    it 'should load todos from implementation names' do
      create_options_yaml(todo: ['libsass'])
      expect(metadata.todo?('libsass')).to be true
    end

    it 'should load warning_todos from implementation names' do
      create_options_yaml(warning_todo: ['libsass'])
      expect(metadata.warning_todo?('libsass')).to be true
    end

    it 'should load todos from issue numbers' do
      create_options_yaml(todo: ['sass/libsass#2342'])
      expect(metadata.todo?('libsass')).to be true
    end

    it 'should load warning_todos from issue numbers' do
      create_options_yaml(warning_todo: ['sass/libsass#2342'])
      expect(metadata.warning_todo?('libsass')).to be true
    end
  end
end
