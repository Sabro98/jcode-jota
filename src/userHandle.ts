import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch'
import { window, workspace, Uri, WorkspaceFolder, commands } from 'vscode';
import { getVSCodeDownloadUrl } from 'vscode-test/out/util';
import { writeFile, readFile, windowPath } from './function';

//열려있는 editor의 텍스트를 반환
export function getTextFromEditor(): String | undefined {
  const editor = window.activeTextEditor;
  if (editor) {
    const document = editor.document;
    let documentText = document.getText();
    documentText = documentText.replace(/\r?\n/g, '\r\n');

    return documentText;
  }
}

//입력받은 정보를 사용해 Jota에 로그인 시도
// status는 로그인 성공 -> 200, 실패 -> 500 을 반환
async function loginUser(username: string, password: string): Promise<boolean> {
  const HOST = "http://203.254.143.156:8001";
  const PATH = "/api/v2/auth/user";
  const URL = `${HOST}${PATH}`;
  if (!URL) return false;
  const data = {
    username, password
  }

  const options = {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'Content-type': 'application/json',
    },
  };

  const response = await fetch(URL, options);

  return response.status == 200;
}

//메타파일을 읽어 유저의 정보를 가져옴
export async function getUserInfo(): Promise<
  | {
    userID: string;
    currentSubmit: string;
    // submitHistory: Array<string>,
  }
  | undefined
> {
  const fileUri = getMetaFileUri();
  if (!fileUri) return;

  const text = await readFile(fileUri);

  //텍스트가 비어있다면 -> submit할 때 유저의 정보를 생성
  if (text == '') {
    window.showInformationMessage('유저 정보 초기화');
    const userID = await window.showInputBox({
      placeHolder: 'write your id',
    });
    if (!userID) return;
    const userPwd = await window.showInputBox({
      placeHolder: "write your password"
    })
    if (!userPwd) return;

    //입력 받은 정보를 사용해 로그인 시도
    if (!(await loginUser(userID, userPwd))) {
      window.showErrorMessage("로그인 실패!! 정보를 다시 확인해주세요.");
      return;
    } else {
      window.showInformationMessage("로그인 성공!!!")
    }

    // --- userInfo ---
    // {
    //   id: id,
    //   currentSubmit: submitProblemCode
    // }
    // 로 이루어져있음
    const userInfo = {
      userID,
      currentSubmit: '',
      // submitHistory: [],
    };

    //유저의 정보를 기록
    await writeFile(fileUri, JSON.stringify(userInfo));

    return userInfo;
  }

  // 내용이 있다면 JSON으로 변환
  try {
    const userInfo = JSON.parse(text);
    return userInfo;
  } catch (err) {
    window.showErrorMessage(`${fileUri.path} 형식 확인 필요.`);
  }
}
// 제출할 문제 코드 리턴
export async function getProblemCode(
  currentSubmit: string,
  // submitHistory: string[]
): Promise<String | undefined> {
  //--- showInputBox는 엔터를 쳐야 다음 단계로 넘어가짐 -> 엔터를 쳐야 문제코드 히스토리가 보이는 문제..
  // const problemCode = await window.showInputBox({
  //   placeHolder: 'Write problem code',
  //   value: currentSubmit,
  // });

  // ---problemsInfo---
  // from JOTA (JOTA에 현재 존재하는 문제의 정보)
  // <key:string, value:string>
  // key: problemName, value: problemCode
  const problemsInfoMap = new Map<string, string>();

  let validProblemList = await getProblemListfromJOTA(problemsInfoMap);
  if (!validProblemList) return;
  const HighPriorityIdx = validProblemList.indexOf(currentSubmit); // 최근 제출 문제 인덱스 얻기
  if (HighPriorityIdx != -1) {
    validProblemList.splice(HighPriorityIdx, 1); // 삭제, 리스트 중복 해결
    validProblemList.unshift(currentSubmit); // 최근 제출 문제 맨 앞에 삽입
  }
  if (!validProblemList) return;
  // showQuickPick : 전달해준 리스트에 있는 값만 problemCode로 리턴 가능 (새로운 값 입력 불가)
  const problemName = await window.showQuickPick(validProblemList, // 문제 이름 리스트 전달
    {
      placeHolder: 'Write problem code',
    });

  if (!problemName) return;
  updateUserCurrentSubmit(problemName);
  const problemCode = problemsInfoMap.get(problemName); // key를 입력해서 value를 얻어옴

  return problemCode; // 문제 코드 리턴
}

//User에게 보여질 problem Name (problem Code)를 formatting 해주는 함수
function formattingProblem(name: string, code: string): string {
  return `${name} (${code})`;
}

// jota에서 존재하는 문제 이름을 가져와서 리스트로 반환하는 함수
// input: 없음, output: 존재하는 문제 이름 리스트 (string[])
async function getProblemListfromJOTA(
  problemsInfoMap: Map<string, string>, // <name, code>
): Promise<string[] | undefined> {
  const HOST = 'http://203.254.143.156:8001';
  const PATH = '/api/v2/problems';
  const URL = `${HOST}${PATH}`;
  const response = await fetch(URL);
  const post: {
    data: {
      objects: {
        code: string, // 문제 코드 -> 채점을 위해 JOTA에 전달해야하는 정보
        group: string,
        name: string, // 문제 이름 -> 사용자에게 보여줘야 하는 정보 (=> QuickPick 리스트 name으로 이루어진 배열)
        partial: boolean,
        points: number,
        types: string[]
      }[]
    }
  } = await response.json();
  const JOTAproblemsInfo = post.data.objects; // JOTA에 존재하는 문제 정보(problemCode, problemName등) 가져옴
  const problemNames = JOTAproblemsInfo.map((problem) => formattingProblem(problem.name, problem.code)); // 문제 이름 저장, QuickPick 리스트가 배열을 받으므로 따로 이름 배열로 저장

  // 문제 이름과 문제 코드로 이루어진 map 생성
  // --- < key : 문제 이름, value: 문제 코드 > 인 map ---
  JOTAproblemsInfo.forEach(element => { // 문제를 하나씩 읽어옴 // 3문제면 3번 반복
    problemsInfoMap.set(formattingProblem(element.name, element.code), element.code); // (key, value)
  });

  // let tempProblemList: string[] = ["aplusb", "aminusb"]; // 임시 문제 코드 리스트
  return problemNames; // 문제 이름으로 반환
}

//최근 제출 정보를 업데이트
async function updateUserCurrentSubmit(newSubmit: string) {
  const userInfo = await getUserInfo();
  if (!userInfo) return;
  userInfo.currentSubmit = newSubmit;

  //-- Inputfield로 입력받는 경우 제출한 적 있는 문제 코드 저장하기 위한 용도
  // userInfo.submitHistory.push(newSubmit); //최근 제출 정보 히스토리에 추가

  const fileUri = getMetaFileUri();
  if (!fileUri) return;

  await writeFile(fileUri, JSON.stringify(userInfo));
}


//메타파일의 Uri를 반환
function getMetaFileUri(): Uri | undefined {
  const workSpaceFolders: readonly WorkspaceFolder[] | undefined =
    workspace.workspaceFolders;
  if (!workSpaceFolders) return undefined;

  const folderUri = workSpaceFolders[0].uri;
  const saveFolderName = '.jcode-jota';
  let saveFolderPath = path.join(folderUri.path, saveFolderName);
  if (process.platform === 'win32') saveFolderPath = windowPath(saveFolderPath);

  //폴더가 없다면 생성
  !fs.existsSync(saveFolderPath) && fs.mkdirSync(saveFolderPath);

  const fileName = `submitMeta.json`;
  let saveFilePath = path.join(saveFolderPath, fileName);
  if (process.platform === 'win32') saveFilePath = windowPath(saveFilePath);

  const fileUri = folderUri.with({
    path: saveFilePath,
  });
  const time = new Date();

  //파일 존재 확인
  try {
    fs.utimesSync(fileUri.path, time, time);
  } catch (err) {
    fs.closeSync(fs.openSync(fileUri.path, 'w'));
  }

  return fileUri;
}
