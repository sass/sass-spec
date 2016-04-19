class Interactor

  class Choice < Struct.new(:label, :message, :block)
    def run_block!
      block.call if block
    end
  end

  def initialize
    @choices = []
    @choice = nil
  end

  def prompt(message)
    @prompt = message
  end

  def choice(label, message, &block)
    @choices << Choice.new(label, message, block)
  end

  def restart!
    @choice = nil
  end

  def display_choices!
    puts
    puts @prompt if @prompt
    @choices.each_with_index do |c, i|
      puts "#{i + 1}. #{c.message}"
    end
    print "Please select an option > "
  end

  def run!
    if @choices.size == 0
      raise ArgumentError, "No choices to run."
    end
    @choice = nil
    until @choice
      display_choices!
      input = $stdin.gets
      puts
      @choice = input ? input.strip.to_i : 0
      if @choice > 0 && @choice <= @choices.size
        @choices[@choice - 1].run_block! # We run this in the loop so restart! can be invoked.
      else
        @choice = nil
      end
    end
    @choices[@choice - 1].label # we return the label so re-ordering choices doesn't change result
  end

  def self.interact
    interactor = new
    yield interactor
    interactor.run!
  end
end


