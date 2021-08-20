import { workspace, Uri } from 'vscode';

export function windowPath(target: string): string {
    const from = '\\', to = '\\\\'
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