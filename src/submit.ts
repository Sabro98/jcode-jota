import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';

import { workspace, window, WorkspaceFolder, env, Uri } from 'vscode';
import { windowPath, writeFile, showDetails, decodeUserID } from './function';

// submit code to jota [params => (userId, problemCode, sourceCode)]
export async function submitCode(
  encodedUserId: string,
  problemCode: string,
  sourceCode: string
): Promise<
  {
    finalResult: string[],
    JotaURL: string
  }
  | undefined
> {
  const HOST = 'http://203.254.143.156:8001';
  const PATH = '/api/v2/submit/jcode';
  const URL = `${HOST}${PATH}`;

  if (!URL) return;
  const userId = decodeUserID(encodedUserId);
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

    const post: string = await response.json();
    const parsedPost: {
      status: number,
      result: any[],
      JotaURL: string
    } = JSON.parse(post);

    // status -> 정상적인 결과: 200, 비정상 결과: 405
    // result -> 정상적인 결과: 정답들의 array, 비정상 결과: 에러 코드가 포함된 size 1의 array
    // JotaURL -> 해당 제출과 연결된 Jota의 URL
    const { status, result, JotaURL } = parsedPost;

    //제출한 code에 에러가 있는 상황
    if (status !== 200) {
      //URL을 포함해서 보여주면 될듯
      // console.log(JotaURL);
      const buttonText = 'Show Details';
      const click = await window.showErrorMessage(`!!${result[0]}!! error in code!!! `, buttonText);
      if(!click) return;
      showDetails(JotaURL); // 버튼 누르면 jota 채점 페이지로 이동
      return;
    }

    const results = makeResult(result);
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

    return { finalResult, JotaURL };
  } catch (error) {
    window.showErrorMessage(`Error: id를 다시 확인해 주세요!`);
  }
}

//post의 결과를 보여주기 위한 형식으로 변환
function makeResult(post: any[]): string[] {
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

  const hour = currDate.getHours().toString().padStart(2, '0'), minute = currDate.getMinutes().toString().padStart(2, '0'), sec = currDate.getSeconds().toString().padStart(2, '0');
  const fileName = `${problemCode}@${hour}_${minute}_${sec}.txt`;

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
