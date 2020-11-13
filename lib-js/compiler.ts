import child_process from "child_process"

interface Stdio {
  stdout: string
  stderr: string
  status: number | null
}

export interface Compiler {
  compile(path: string, args: string[]): Promise<Stdio>
}

export function execCompiler(bin: string): Compiler {
  return {
    async compile(path, args) {
      return child_process.spawnSync(bin, args, {
        cwd: path,
        encoding: "utf-8",
        stdio: "pipe",
      })
    },
  }
}
