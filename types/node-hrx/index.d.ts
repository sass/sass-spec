declare module 'node-hrx' {
  import {Readable} from 'stream';

  class File {
    path: string;
    body: string;
    comment?: string;
    isDirectory(): this is Directory;
    isFile(): this is File;
  }

  class Directory implements Iterable<string> {
    path: string;
    contents: Record<string, HrxItem>;
    comment: string;
    get(path: string): HrxItem | undefined;
    list(): string[];
    isDirectory(): this is Directory;
    isFile(): this is File;
    [Symbol.iterator](): Iterator<string>;
  }

  type HrxItem = File | Directory;

  export function archiveFromStream(stream: Readable): Promise<Directory>;
}
