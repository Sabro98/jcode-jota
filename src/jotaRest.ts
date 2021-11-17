import fetch from 'node-fetch'
import { window } from 'vscode';

// 모든 rest 요청을 하는 함수 이름은 반드시 REST_xxx

const JOTA_BASE_URL = 'http://203.254.143.156:8001'

function makeFullPath(subPath: string): string {
  // subPath must start with '/'
  if (subPath.charAt(0) !== '/') subPath = "/" + subPath;

  return `${JOTA_BASE_URL}${subPath}`;
}

function showErrorMsg() {
  window.showErrorMessage(`제출 실패! 정보를 다시 확인해 주세요!`);
}

// Submit user's code to JOTA problem using input
export async function REST_submit(
  userId: string,
  problemCode: string,
  sourceCode: string
): Promise<{
  status: number,
  result: any[],
  JotaURL: string
} | undefined> {
  // input: information for submit
  // output: parsed JSON from JOTA server

  const SUB_PATH = '/api/v2/submit/jcode';
  const URL = makeFullPath(SUB_PATH);

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

  let parsedPost: {
    status: number,
    result: any[],
    JotaURL: string
  } | undefined = undefined;

  try {
    const response = await fetch(URL, options);
    const post: string = await response.json();
    parsedPost = JSON.parse(post);
  } catch (error) {
    showErrorMsg();
  }

  return parsedPost;
}

// Get problems in specific contest
export async function REST_contestProblems(contests: string[]):
  Promise<
    {
      code: string // problems code
      is_pretesed: boolean
      label: string
      max_submissions: number
      name: string // problems name
      partial: boolean
      points: number
      contest: string
    }[]
  > {
  // input: contest id
  // output: List of problems at contest
  // TODO: type을 하나로 합칠 수 없을까?

  let problems: {
    code: string // problems code
    is_pretesed: boolean
    label: string
    max_submissions: number
    name: string // problems name
    partial: boolean
    points: number
    contest: string
  }[] = []

  for (let i = 0; i < contests.length; i++) {
    const SUB_PATH: string = `/api/v2/contest/problem/${contests[i]}`; //contest problem 정보
    const URL: string = makeFullPath(SUB_PATH);

    try {
      const response = await fetch(URL);
      const post = await response.json();
      post.data.object.problems.forEach((problem: {
        code: string // problems code
        is_pretesed: boolean
        label: string
        max_submissions: number
        name: string // problems name
        partial: boolean
        points: number
        contest: string
      }) => {
        problem.contest = contests[i];
        problems.push(problem)
      });
    } catch (error) {
      showErrorMsg();
    }
  }

  return problems;
}

// Get all contest's id that input user participated 
export async function REST_userParticipate(userID: string): Promise<string[] | undefined> {
  // input: user ID
  // output: current user's participate contest id

  const SUB_PATH = `/api/v2/user/contest/${userID}`;
  const URL = makeFullPath(SUB_PATH);

  try {
    const response = await fetch(URL);
    const post = await response.json();
    const currContests: {
      cumulative_time: number,
      key: string,
      rating: number,
      score: number,
      volatility: number
    }[] = post.data.object.contests;
    return currContests.map(contest => contest.key);
  } catch (error) {
    showErrorMsg();
  }
}

// try login to JOTA using input values
export async function REST_loginUser(username: string, password: string): Promise<boolean> {
  // input: user's name, user's password
  // output: if success to login return true else false 

  const SUB_PATH = "/api/v2/auth/user";
  const URL = makeFullPath(SUB_PATH);
  console.log(username, password)

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

  // if success to login, status = 200 else 500
  const response = await fetch(URL, options);

  return response.status == 200;
}

// use get whole problems in JOTA
export async function REST_getProblemListFromJOTA(
  problemsInfoMap: Map<string, string>, // <name, code>
): Promise<string[] | undefined> {
  // input: problem's information map using display problems
  // output: exists problems in JOTA

  //User에게 보여질 problem Name (problem Code)를 formatting 해주는 함수 선언
  const formattingProblem = (name: string, code: string): string => `${name} (${code})`;

  const SUB_PATH = '/api/v2/problems';
  const URL = makeFullPath(SUB_PATH);

  try {
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
    return problemNames; // 문제 이름으로 반환
  } catch (error) {
    showErrorMsg();
  }
}