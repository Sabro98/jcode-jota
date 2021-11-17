import { workspace, Uri } from 'vscode';

export function encodeUserId(id: string): string {
  const encode = (str: string): string => Buffer.from(str, 'binary').toString('base64');
  const encodedId = encode(id);
  return encodedId;
}

export function decodeUserID(id: string): string {
  const decode = (str: string): string => Buffer.from(str, 'base64').toString('binary');
  const decodedId = decode(id);
  return decodedId;
}

export function windowPath(target: string): string {
  const from = '\\',
    to = '\\\\';
  const tmpTarget = target.split(from);
  // if (tmpTarget[0] === '') tmpTarget.splice(0, 1);
  tmpTarget.splice(0, 1);
  return tmpTarget.join(to);
}

export async function readFile(fileUri: Uri): Promise<string> {
  const readData = await workspace.fs.readFile(fileUri);
  const readStr = Buffer.from(readData).toString('utf8');
  return readStr;
}

export async function writeFile(fileUri: Uri, text: string) {
  await workspace.fs.writeFile(fileUri, Buffer.from(text, 'utf8'));
}
