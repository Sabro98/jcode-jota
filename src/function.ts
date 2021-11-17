import { workspace, Uri, env } from 'vscode';

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

export async function showDetails(JotaURL: string){
    env.openExternal(Uri.parse(JotaURL)); // 버튼 누르면 해당 URL로 이동
}