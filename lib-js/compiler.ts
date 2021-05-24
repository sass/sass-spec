import events from "events"
import fs from "fs"
import os from "os"
import path from "path"
import child_process, { ChildProcessWithoutNullStreams } from "child_process"
import { Writable, Readable } from "stream"

export interface Stdio {
  stdout: string
  stderr: string
  status: number | null
}

/**
 * A wrapper around a process that can compile Sass files.
 */
export abstract class Compiler {
  /**
   * Run the compiler with the given args, at the path given as the cwd.
   */
  abstract compile(path: string, args: string[]): Promise<Stdio>

  /**
   * Shutdowns the compiler in case it was long-running
   */
  shutdown(): void {}
}

export class ExecutableCompiler extends Compiler {
  constructor(
    private readonly command: string,
    private readonly initArgs: string[] = []
  ) {
    super()
  }

  async compile(path: string, args: string[]) {
    const { error, stdout, stderr, status } = child_process.spawnSync(
      this.command,
      [...this.initArgs, ...args],
      {
        cwd: path,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"],
      }
    )
    if (error) {
      throw new Error(`Failed to run executable compiler: ${error}`)
    }
    return { stdout, stderr, status }
  }
}

export class DartCompiler implements Compiler {
  private readonly stdin: Writable

  private constructor(
    private readonly dart: ChildProcessWithoutNullStreams,
    private readonly stdout: AsyncGenerator<string>,
    private readonly stderr: AsyncGenerator<string>,
    private readonly initArgs: string[] = []
  ) {
    this.stdin = dart.stdin
  }

  /**
   * Create a dart-sass compiler from the repo given by the path.
   */
  static async fromRepo(
    path: string,
    initArgs: string[] = []
  ): Promise<DartCompiler> {
    const dart = await this.createProcess(path)
    const stdout = DartCompiler.toChunks(dart.stdout)
    const stderr = DartCompiler.toChunks(dart.stderr)

    // Wait for the signal that the process is ready to begin. If the process
    // crashes instead, the stdout stream will either emit a non-empty value or
    // close without a value.
    const { done } = await stdout.next()

    if (done) {
      const stderrText = await DartCompiler.readRest(stderr)
      const exitCode = dart.exitCode ?? (await events.once(dart, "exit"))[0]
      let message = `Dart Sass process exited unexpectedly with code ${exitCode}.`
      if (stderrText.length > 0) message += `\n${stderrText}`
      throw new Error(message)
    }

    return new DartCompiler(dart, stdout, stderr, initArgs)
  }

  async compile(path: string, opts: string[]): Promise<Stdio> {
    this.stdin.write(`!cd ${path}\n`)
    this.stdin.write([...this.initArgs, ...opts].join(" ") + "\n")

    return {
      stdout: (await this.stdout.next()).value,
      stderr: (await this.stderr.next()).value,
      status: +(await this.stdout.next()).value,
    }
  }

  shutdown() {
    this.dart.kill()
  }

  /**
   * Create a child process that uses the dart-sass repo at the path,
   * and compiles the files piped to stdin.
   */
  private static async createProcess(
    repoPath: string
  ): Promise<ChildProcessWithoutNullStreams> {
    if (!fs.existsSync(path.resolve(repoPath, "bin/sass.dart"))) {
      throw new Error(`${repoPath} is not a valid Dart Sass repository`)
    }
    const dartFile = `
// @dart=2.9
import "dart:convert";
import "dart:io";

import "${repoPath}/bin/sass.dart" as sass;

main() async {
  // Emit an initial signal that the process has started and is ready for input.
  stdout.add([0xFF]);

  await for (var line in new LineSplitter().bind(utf8.decoder.bind(stdin))) {
    if (line.startsWith("!cd ")) {
      Directory.current = line.substring("!cd ".length);
      continue;
    }

    try {
      await sass.main(line.split(" ").where((arg) => arg.isNotEmpty).toList());
    } catch (error, stackTrace) {
      stderr.writeln("Unhandled exception:");
      stderr.writeln(error);
      stderr.writeln(stackTrace);
      exitCode = 255;
    }

    stdout.add([0xFF]);
    stdout.write(exitCode);
    stdout.add([0xFF]);
    stderr.add([0xFF]);
    exitCode = 0;
  }
}`
    const dartFilename = path.resolve(os.tmpdir(), "dart-sass-spec")
    await fs.promises.writeFile(dartFilename, dartFile, { encoding: "utf-8" })
    const child = child_process.spawn("dart", [
      "--enable-asserts",
      `--packages=${repoPath}/.packages`,
      dartFilename,
    ])
    // When this process exits, delete the Dart file.
    child.on("exit", () => {
      fs.unlinkSync(dartFilename)
    })
    return child
  }

  private static splitSingle(buffer: Buffer, token: number): Buffer[] {
    const idx = buffer.indexOf(token)
    if (idx === -1) {
      return [buffer]
    } else {
      return [buffer.slice(0, idx), buffer.slice(idx + 1)]
    }
  }

  // Split a buffer using the given token
  private static split(buffer: Buffer, token: number): Buffer[] {
    const segments = []
    let [head, tail] = this.splitSingle(buffer, token)
    while (tail) {
      segments.push(head)
      const [head2, tail2] = this.splitSingle(tail, token)
      head = head2
      tail = tail2
    }
    segments.push(head)
    return segments
  }

  // Split the stream into chunks based on the break character (0xff)
  // TODO need to test this
  private static async *toChunks(stream: Readable): AsyncGenerator<string> {
    let buff = Buffer.from("")
    for await (const chunk of stream) {
      const [head, ...tail] = this.split(chunk, 0xff)
      // If we received *any* break characters, yield those segments
      if (tail.length > 0) {
        yield Buffer.concat([buff, head]).toString()
        for (const item of tail.slice(0, tail.length - 1)) {
          yield item.toString()
        }
        // Set the buffer to the last unfinished segment
        buff = tail[tail.length - 1]
      } else {
        // If we didn't receive any 0xff in this chunk, just append to the
        // intermediate buffer
        buff = Buffer.concat([buff, head])
      }
    }

    // If there's still text after the last break, yield it too. This allows us
    // to access error messages if something goes wrong.
    if (buff.length > 0) yield buff.toString()
  }

  // Consume the remaining text in `generator` and emit it as-is, with break
  // characters converted to newlines.
  private static async readRest(
    generator: AsyncGenerator<string>
  ): Promise<string> {
    let text = ""
    let first = true
    for await (const chunk of { [Symbol.asyncIterator]: () => generator }) {
      if (!first) text += "\n"
      text += chunk
    }
    return text
  }
}
