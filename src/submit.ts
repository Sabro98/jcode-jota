import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import { workspace, window, WorkspaceFolder } from 'vscode';
import { windowPath } from './function';

// submit code to jota [params => (userId, problemCode, sourceCode)]
export async function submitCode(
  userId: String,
  problemCode: String,
  sourceCode: String
): Promise<string[] | undefined> {
  const HOST = 'http://203.254.143.156:8001';
  const PATH = '/api/v2/submit/jcode';
  const URL = `${HOST}${PATH}`;

  if (!URL) return;
  const data = {
    judge_id: 'jota-judge',
    language: 'C',
    user: userId,
    problem: problemCode,
    source: sourceCode,
  };

  const options = {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'Content-type': 'application/json',
    },
  };

  //send rest to URL
  try {
    const response = await fetch(URL, options);
    //status code로 에러를 확인

    const post: string = await response.json();
    if (response.status !== 200) {
      window.showErrorMessage(post);
      return;
    }

    const parsedPost = JSON.parse(post);

    const results = makeResult(parsedPost);
    const resultsEmoj: string[] = [];

    results.forEach((result) =>
      resultsEmoj.push(result.includes('AC') ? '✅' : '❌')
    );
    //save result to ./result
    const savedPath = await saveResultAsFile(
      userId,
      problemCode,
      sourceCode,
      results
    );

    //final Result -> {savedFilename, resultEmoji, results}
    const finalResult: string[] = [];
    finalResult.push(savedPath);
    finalResult.push(resultsEmoj.join(' '));
    results.forEach((result) => finalResult.push(result));

    return finalResult;
  } catch (error) {
    window.showErrorMessage(`Error: ${error}`);
  }
}

//post의 결과를 보여주기 위한 형식으로 변환
function makeResult(post: []): string[] {
  const submitResultArrs: string[] = [];

  //process result for show
  post.forEach((element: string[], index: number) => {
    const spendTime = parseFloat(element[1]).toFixed(4);
    const spendMemory = parseFloat(element[2]).toFixed(2);
    const resultMsg = `Test case #${index}: ${element[0]} [${spendTime}s, ${spendMemory} KB]`;

    submitResultArrs.push(resultMsg);
  });

  return submitResultArrs;
}

//save as text file
async function saveResultAsFile(
  userId: String,
  problemCode: String,
  sourceCode: String,
  results: String[]
): Promise<string> {
  const saveFolderName = 'result';
  const workSpaceFolders: readonly WorkspaceFolder[] | undefined =
    workspace.workspaceFolders;

  if (!workSpaceFolders) return '';

  const folderUri = workSpaceFolders[0].uri;
  let parentPath = path.join(folderUri.path, saveFolderName);
  if (process.platform == 'win32') parentPath = windowPath(parentPath);
  //폴더가 없다면 생성
  !fs.existsSync(parentPath) && fs.mkdirSync(parentPath);

  const currDate = new Date();
  const _year = currDate.getFullYear().toString(),
    _month = (currDate.getMonth() + 1).toString(),
    _date = currDate.getDate().toString();

  const year = _year.slice(2),
    month = _month.length == 1 ? '0' + _month : _month,
    date = _date.length == 1 ? '0' + _date : _date;

  let basePath = path.join(parentPath, `${year}${month}${date}`);
  if (process.platform == 'win32') {
    basePath = windowPath(basePath);
    if (!basePath.includes('c:\\\\')) {
      basePath = `c:\\\\${basePath}`;
    }
  }

  !fs.existsSync(basePath) && fs.mkdirSync(basePath);

  //파일의 최종 경로
  const fileName = `${problemCode}@${currDate.getHours()}:${currDate.getMinutes()}:${currDate.getSeconds()}.txt`;
  let saveFilePath = path.join(basePath, fileName);
  if (process.platform == 'win32') {
    saveFilePath = windowPath(saveFilePath);
  }
  const fileUri = folderUri.with({
    path: saveFilePath,
  });

  //기록할 채점 결과 문자열 생성
  let data = `Submission of ${problemCode} by ${userId}\n\n`;
  data += '-------- Execution Results--------\n';
  results.forEach((result) => (data += result.includes('AC') ? '✅ ' : '❌ '));
  data += '\n';
  data += results.join('\n');

  //소스코드 첨부
  data += '\n\n---------------- SOURCE CODE ---------------- \n';
  data += sourceCode;

  await workspace.fs.writeFile(fileUri, Buffer.from(data, 'utf8'));
  return `Submission of ${problemCode} by ${userId}`;
}
