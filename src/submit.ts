import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import { workspace, window, WorkspaceFolder } from 'vscode';
import { windowPath, writeFile } from './function';

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
  const workSpaceFolders: readonly WorkspaceFolder[] | undefined =
    workspace.workspaceFolders;

  if (!workSpaceFolders) return '';

  const folderUri = workSpaceFolders[0].uri;
  const resultFolderName = 'result';
  const currDate = new Date();
  const _year = currDate.getFullYear().toString(),
    _month = (currDate.getMonth() + 1).toString(),
    _date = currDate.getDate().toString();
  const year = _year.slice(2),
    month = _month.length == 1 ? '0' + _month : _month,
    date = _date.length == 1 ? '0' + _date : _date;
  const saveFolderName = `${year}${month}${date}`;

  let basePath = path.join(folderUri.path, resultFolderName, saveFolderName);
  if (process.platform == 'win32') basePath = windowPath(basePath);

  !fs.existsSync(basePath) && fs.mkdirSync(basePath, { recursive: true });

  //파일의 최종 경로
  let fileName = `${problemCode}@${currDate.getHours()}:${currDate.getMinutes()}:${currDate.getSeconds()}.txt`;

  //windows에서 경로에 :가 들어가면 오류남 --> 왜 오류가 나는지 파악 필요
  if (process.platform == 'win32')
    fileName = `${problemCode}@${currDate.getHours()}h ${currDate.getMinutes()}m ${currDate.getSeconds()}s.txt`;

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
  await writeFile(fileUri, data);
  return `Submission of ${problemCode} by ${userId}`;
}
