# encoding: utf-8
#
# Cargo culted from: https://gist.github.com/pasela/9392115

require "timeout"

# Capture the standard output and the standard error of a command.
# Almost same as Open3.capture3 method except for timeout handling and return value.
# See Open3.capture3.
#
#   result = capture3_with_timeout([env,] cmd... [, opts])
#
# The arguments env, cmd and opts are passed to Process.spawn except
# opts[:stdin_data], opts[:binmode], opts[:timeout], opts[:signal]
# and opts[:kill_after].  See Process.spawn.
#
# If opts[:stdin_data] is specified, it is sent to the command's standard input.
#
# If opts[:binmode] is true, internal pipes are set to binary mode.
#
# If opts[:timeout] is specified, SIGTERM is sent to the command after specified seconds.
#
# If opts[:signal] is specified, it is used instead of SIGTERM on timeout.
#
# If opts[:kill_after] is specified, also send a SIGKILL after specified seconds.
# it is only sent if the command is still running after the initial signal was sent.
#
# The return value is a Hash as shown below.
#
#   {
#     :pid     => PID of the command,
#     :status  => Process::Status of the command,
#     :stdout  => the standard output of the command,
#     :stderr  => the standard error of the command,
#     :timeout => whether the command was timed out,
#   }
module CaptureWithTimeout
  def capture3_with_timeout(*cmd)
    spawn_opts = Hash === cmd.last ? cmd.pop.dup : {}
    opts = {
      :stdin_data => spawn_opts.delete(:stdin_data) || "",
      :binmode    => spawn_opts.delete(:binmode) || false,
      :timeout    => spawn_opts.delete(:timeout),
      :signal     => spawn_opts.delete(:signal) || "TERM",
      :kill_after => spawn_opts.delete(:kill_after),
    }

    in_r,  in_w  = IO.pipe
    out_r, out_w = IO.pipe
    err_r, err_w = IO.pipe
    in_w.sync = true

    if opts[:binmode]
      in_w.binmode
      out_r.binmode
      err_r.binmode
    end

    spawn_opts[:in]  = in_r
    spawn_opts[:out] = out_w
    spawn_opts[:err] = err_w

    result = {
      :pid     => nil,
      :status  => nil,
      :stdout  => nil,
      :stderr  => nil,
      :timeout => false,
    }

    out_reader = nil
    err_reader = nil
    wait_thr = nil

    begin
      Timeout.timeout(opts[:timeout]) do
        result[:pid] = spawn(*cmd, spawn_opts)
        wait_thr = Process.detach(result[:pid])
        in_r.close
        out_w.close
        err_w.close

        out_reader = Thread.new { out_r.read }
        err_reader = Thread.new { err_r.read }

        in_w.write opts[:stdin_data]
        in_w.close

        result[:status] = wait_thr.value
      end
    rescue Timeout::Error
      result[:timeout] = true
      pid = spawn_opts[:pgroup] ? -result[:pid] : result[:pid]
      Process.kill(opts[:signal], pid)
      if opts[:kill_after]
        unless wait_thr.join(opts[:kill_after])
          Process.kill("KILL", pid)
        end
      end
    ensure
      result[:status] = wait_thr.value if wait_thr
      result[:stdout] = out_reader.value if out_reader
      result[:stderr] = err_reader.value if err_reader
      out_r.close unless out_r.closed?
      err_r.close unless err_r.closed?
    end

    result
  end
end
