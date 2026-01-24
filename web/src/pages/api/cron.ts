import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const token = process.env.GH_TOKEN;
  const owner = process.env.GH_OWNER;
  const repo = process.env.GH_REPO;
  const workflow = process.env.GH_WORKFLOW;
  const ref = process.env.GH_REF || 'main';

  if (!token || !owner || !repo || !workflow) {
    res.status(500).send('Missing GitHub env vars');
    return;
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
    body: JSON.stringify({ ref }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    res.status(resp.status).send(text);
    return;
  }

  res.status(200).send('Workflow dispatched');
}
