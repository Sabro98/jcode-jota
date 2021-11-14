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
  // currentSubmit: string,
  // submitHistory: string[]
): Promise<String | undefined> {
  //--- showInputBox는 엔터를 쳐야 다음 단계로 넘어가짐 -> 엔터를 쳐야 문제코드 히스토리가 보이는 문제..
  // const problemCode = await window.showInputBox({
  //   placeHolder: 'Write problem code',
  //   value: currentSubmit,
  // });

  let validProblemList = await getProblemListfromJOTA();

  if (!validProblemList) return;
  // showQuickPick : 전달해준 리스트에 있는 값만 problemCode로 리턴 가능 (새로운 값 입력 불가)
  const problemCode = await window.showQuickPick(validProblemList,
    {
      placeHolder: 'Write problem code',
    });
  if (problemCode) updateUserCurrentSubmit(problemCode);
  return problemCode;
}

// jota에서 존재하는 문제 코드를 가져와서 리스트로 반환하는 함수
// input: 없음, output: 존재하는 문제 코드 리스트 (string[])
async function getProblemListfromJOTA(): Promise<string[] | undefined> {
  const HOST = 'http://203.254.143.156:8001';
  const PATH = '/api/v2/problems';
  const URL = `${HOST}${PATH}`;
  const response = await fetch(URL);
  const post: {
    data: {
      objects: {
        code: string,
        group: string,
        name: string,
        partial: boolean,
        points: number,
        types: string[]
      }[]
    }
  } = await response.json();

  const problems = post.data.objects;
  const problemCodes = problems.map((problem) => problem.code);
  // let tempProblemList: string[] = ["aplusb", "aminusb"]; // 임시 문제 코드 리스트
  return problemCodes;
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
