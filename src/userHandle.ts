import * as fs from 'fs';
import * as path from 'path';
import { window, workspace, Uri, WorkspaceFolder } from 'vscode';
import { getProblemsMapFromContest } from './function';
import {
  writeFile,
  readFile,
  windowPath,
  encodeUserId,
  decodeUserID,
} from './function';
import {
  REST_loginUser,
  REST_getProblemListFromJOTA,
  REST_contestProblems,
  REST_userParticipate,
} from './jotaRest';

//열려있는 editor의 텍스트를 반환
export function getTextFromEditor(): string | undefined {
  const editor = window.activeTextEditor;
  if (editor) {
    const document = editor.document;
    let documentText = document.getText();
    documentText = documentText.replace(/\r?\n/g, '\r\n');

    return documentText;
  }
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

  let text = await readFile(fileUri);

  //텍스트가 비어있다면 -> submit할 때 유저의 정보를 생성
  if (text == '') {
    window.showInformationMessage('로그인 시도!');
    const userID = await window.showInputBox({
      placeHolder: 'write your id',
    });
    if (!userID) return;
    // const userPwd = await window.showInputBox({
    //   placeHolder: 'write your password',
    //   password: true,
    // });
    // if (!userPwd) return;

    //입력 받은 정보를 사용해 로그인 시도
    // if (!(await REST_loginUser(userID, userPwd))) {
    //   window.showErrorMessage('로그인 실패!! 정보를 다시 확인해주세요.');
    //   return;
    // } else {
    window.showInformationMessage('로그인 성공!!!');
    // }

    // --- userInfo ---
    // {
    //   id: id (encoded),
    //   currentSubmit: submitProblemCode
    // }
    // 로 이루어져있음
    const userInfo = {
      userID: encodeUserId(userID),
      currentSubmit: '',
      // submitHistory: [],
    };

    //유저의 정보를 기록 후 다시 읽기
    await writeFile(fileUri, JSON.stringify(userInfo));

    text = await readFile(fileUri);
  }
  // 내용이 있다면 JSON으로 변환
  try {
    const userInfo: {
      userID: string;
      currentSubmit: string;
    } = JSON.parse(text);
    return userInfo;
  } catch (err) {
    window.showErrorMessage(`${fileUri.path} 형식 확인 필요.`);
  }
}

// Return problems at contest wherer input user participated
// !!notice!! user id isn't encoded
async function getUserContestProblems(encodedUserID: string): Promise<
  | {
      code: string; // problems code
      is_pretesed: boolean;
      label: string;
      max_submissions: number;
      name: string; // problems name
      partial: boolean;
      points: number;
      contest: string;
    }[]
  | undefined
> {
  // input: user's id (encoded)
  // output: List of contest's problem

  const userID = decodeUserID(encodedUserID);
  const contestKey = await REST_userParticipate(userID);
  if (!contestKey) return;
  const problems = await REST_contestProblems(contestKey);

  return problems;
}

export async function getProblemCode(): Promise<string | undefined> {
  // currentSubmit: string
  const problemCode = await window.showInputBox({
    placeHolder: 'Write problem code',
    // value: currentSubmit,
  });

  //제출 후 문제 번호 업데이트
  // if (problemCode) updateUesrCurrentSubmit(problemCode);
  return problemCode;
}

// // Return source code that user want to submit
// export async function getProblemCode(
//   userID: string,
//   currentSubmit: string
//   // submitHistory: string[]
// ): Promise<string | undefined> {
//   //--- showInputBox는 엔터를 쳐야 다음 단계로 넘어가짐 -> 엔터를 쳐야 문제코드 히스토리가 보이는 문제..
//   // const problemCode = await window.showInputBox({
//   //   placeHolder: 'Write problem code',
//   //   value: currentSubmit,
//   // });

//   // userID : encode state
//   const contestProblems = await getUserContestProblems(userID); // return "user participate contest" problem list
//   if (!contestProblems) return;
//   // let validProblemList = await REST_getProblemListFromJOTA(problemsInfoMap); // return all jota problem list
//   const validProblemMap = getProblemsMapFromContest(contestProblems);

//   //--- problemsName : 'problemName(problemCode)' format
//   const problemsName = Array.from(validProblemMap.keys()); // iterator to Array
//   const HighPriorityIdx = problemsName.indexOf(currentSubmit); // 최근 제출 문제 인덱스 얻기
//   if (HighPriorityIdx != -1) {
//     // 인덱스를 성공적으로 얻으면
//     problemsName.splice(HighPriorityIdx, 1); // 삭제 (배열 중복 해결)
//     problemsName.unshift(currentSubmit); // 최근 제출 문제 맨 앞에 삽입
//   }
//   // showQuickPick : 전달해준 리스트에 있는 값만 pickProblem으로 리턴 가능 (새로운 값 입력 불가)
//   const pickProblem = await window.showQuickPick(
//     problemsName, // 문제 이름 리스트 전달
//     {
//       placeHolder: 'Write problem code',
//     }
//   );

//   if (!pickProblem) return;
//   updateUserCurrentSubmit(pickProblem);
//   const problemCode = validProblemMap.get(pickProblem); // key를 입력해서 value를 얻어옴

//   return problemCode; // 문제 코드 리턴
// }

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
