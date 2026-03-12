
// netlify/functions/save-to-github.js
// 런타임: Node 18 (Netlify 기본) - fetch 내장

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const body = JSON.parse(event.body || '{}');

    // 파일명: evaluations/2026-03-12T07-11-22-123Z.json 형태
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `evaluations/${ts}.json`;

    const owner = process.env.GITHUB_OWNER;
    const repo  = process.env.GITHUB_REPO;
    const token = process.env.GITHUB_TOKEN;
    const branch = process.env.GITHUB_BRANCH || 'main'; // 필요시 환경변수로 브랜치 지정

    if (!owner || !repo || !token) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          ok: false,
          error: 'Missing GitHub environment variables',
          required: ['GITHUB_OWNER', 'GITHUB_REPO', 'GITHUB_TOKEN']
        })
      };
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filename)}`;

    // GitHub Contents API는 파일 콘텐츠를 base64 인코딩 요구
    const content = Buffer.from(JSON.stringify(body, null, 2), 'utf8').toString('base64');

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        // Personal Access Token 또는 Fine-grained Token 사용
        // 'token xxx' 또는 'Bearer xxx' 모두 허용되지만 GitHub 권장은 Bearer
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'netlify-function'
      },
      body: JSON.stringify({
        message: `chore(data): add evaluation ${filename}`,
        content,
        branch // 기본 브랜치가 main이 아닐 수 있어서 명시
      })
    });

    const out = await res.json();
    if (!res.ok) {
      // GitHub API 에러 메시지와 문맥을 그대로 반환해 디버깅 용이
      return {
        statusCode: res.status,
        body: JSON.stringify({ ok: false, detail: out })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        path: filename,
        commit: out?.commit?.sha,
        content_url: out?.content?.html_url
      })
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: e.message })
    };
  }
};
