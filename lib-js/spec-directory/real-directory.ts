import fs from 'fs';
import path from 'path';

import SpecOptions from './options';
import SpecDirectory from './spec-directory';
import VirtualDirectory from './virtual-directory';
import {resolveSpecPath} from './spec-path';

export default class RealDirectory extends SpecDirectory {
  path: string;

  constructor(path: string, root?: SpecDirectory, parentOpts?: SpecOptions) {
    super(root, parentOpts);
    this.path = path;
  }

  hasFile(filename: string): boolean {
    const filepath = path.resolve(this.path, filename);
    return fs.existsSync(filepath);
  }

  async readFile(filename: string): Promise<string> {
    const filepath = path.resolve(this.path, filename);
    return await fs.promises.readFile(filepath, {encoding: 'utf-8'});
  }

  async listFiles(): Promise<string[]> {
    const contents = await fs.promises.readdir(this.path, {
      withFileTypes: true,
    });
    return contents.filter(entry => entry.isFile()).map(entry => entry.name);
  }

  async listSubdirs(): Promise<string[]> {
    const contents = await fs.promises.readdir(this.path, {
      withFileTypes: true,
    });
    return contents
      .filter(entry => entry.isDirectory() || entry.name.endsWith('.hrx'))
      .map(entry => path.parse(entry.name).name);
  }

  async getSubdir(name: string): Promise<SpecDirectory> {
    const options = await this.options();
    const resolved = resolveSpecPath(path.resolve(this.path, name));
    return resolved.endsWith('.hrx')
      ? await VirtualDirectory.fromArchive(resolved, this.root, options)
      : new RealDirectory(resolved, this.root, options);
  }

  async writeFile(filename: string, contents: string): Promise<void> {
    const filepath = path.resolve(this.path, filename);
    await fs.promises.writeFile(filepath, contents, {encoding: 'utf-8'});
  }

  async removeFile(filename: string): Promise<void> {
    const filepath = path.resolve(this.path, filename);
    await fs.promises.rm(filepath, {force: true});
  }
}
