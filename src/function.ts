import { workspace, Uri, env } from 'vscode';
import { JotaProblem } from './types';

export function encodeUserId(id: string): string {
  const encode = (str: string): string => {
    return Buffer.from(str, 'binary').toString('base64');
  };
  const encodedId = encode(id);
  return encodedId;
}

export function decodeUserID(id: string): string {
  const decode = (str: string): string => {
    return Buffer.from(str, 'base64').toString('binary');
  };
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

export async function showDetails(JotaURL: string) {
  env.openExternal(Uri.parse(JotaURL)); // 버튼 누르면 해당 URL로 이동
}

export function getProblemsListFromContest(
  contestProblems: JotaProblem[],
  problemInfoMap: Map<string, string>
) {
  // : Promise<string[] | undefined> {
  //User에게 보여질 problem Name (problem Code)를 formatting 해주는 함수 선언
  const formattingProblem = (problem: JotaProblem): string =>
    `${problem.name} (${problem.code})`;
  const problemNames = contestProblems.map((problem) =>
    formattingProblem(problem)
  );
  // 문제 이름과 문제 코드로 이루어진 map 생성
  // --- < key : 문제 이름, value: 문제 코드 > 인 map ---
  contestProblems.forEach((problem) => {
    // 문제를 하나씩 읽어옴 // 3문제면 3번 반복
    problemInfoMap.set(formattingProblem(problem), problem.code); // (key, value)
  });
  return problemNames; // 문제 이름으로 반환
}
