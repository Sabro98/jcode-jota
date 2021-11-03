import * as fs from 'fs';
import * as path from 'path';
import { window, workspace, Uri, WorkspaceFolder } from 'vscode';
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

//메타파일을 읽어 유저의 정보를 가져옴
export async function getUserInfo(): Promise<
  | {
    userID: string;
    currentSubmit: string;
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

    // --- userInfo ---
    // {
    //   id: id,
    //   currentSubmit: submitProblemCode
    // }
    // 로 이루어져있음
    const userInfo = {
      userID,
      currentSubmit: '',
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

export async function getProblemCode(
  currentSubmit: string
): Promise<String | undefined> {
  const problemCode = await window.showInputBox({
    placeHolder: 'Write problem code',
    value: currentSubmit,
  });

  //제출 후 문제 번호 업데이트
  if (problemCode) updateUserCurrentSubmit(problemCode);
  return problemCode;
}

//최근 제출 정보를 업데이트
async function updateUserCurrentSubmit(newSubmit: string) {
  const userInfo = await getUserInfo();
  if (!userInfo) return;
  userInfo.currentSubmit = newSubmit;

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
