
orts.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const body = JSON.parse(event.body || '{}');

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `evaluations/${ts}.json`;

    const owner = process.env.GITHUB_OWNER;
    const repo  = process.env.GITHUB_REPO;
    const token = process.env.GITHUB_TOKEN;
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filename)}`;

    const content = Buffer.from(JSON.stringify(body, null, 2), 'utf8').toString('base64');

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'netlify-function'
      },
      body: JSON.stringify({
        message: `chore(data): add evaluation ${filename}`,
        content
      })
    });

    const out = await res.json();
    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ ok:false, detail: out }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok:true, path: filename, commit: out?.commit?.sha }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok:false, error: e.message }) };
  }
};
``
