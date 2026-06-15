import { Router, Response } from 'express';
import db from '../db';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', (_req: AuthRequest, res: Response) => {
  try {
    const events = db.prepare(`
      SELECT * FROM events ORDER BY date ASC
    `).all();
    res.json({ data: events });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '获取赛事列表失败';
    res.status(500).json({ error: message });
  }
});

router.get('/:id', (req: AuthRequest, res: Response) => {
  try {
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
    if (!event) {
      res.status(404).json({ error: '赛事不存在' });
      return;
    }

    const projects = db.prepare(
      'SELECT * FROM event_projects WHERE event_id = ?'
    ).all(req.params.id);

    res.json({ data: { ...event, projects } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '获取赛事详情失败';
    res.status(500).json({ error: message });
  }
});

router.get('/:id/results', (req: AuthRequest, res: Response) => {
  try {
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    if (!event) {
      res.status(404).json({ error: '赛事不存在' });
      return;
    }

    const projects = db.prepare('SELECT * FROM event_projects WHERE event_id = ?').all(req.params.id);

    const resultsByProject: Record<string, Array<Record<string, unknown>>> = {};

    for (const project of projects) {
      const projectData = project as Record<string, unknown>;
      const projectName = projectData.name as string;
      
      const results = db.prepare(`
        SELECT r.bib_number, r.finish_time, u.username
        FROM registrations r
        JOIN users u ON r.user_id = u.id
        WHERE r.event_id = ? AND r.project_id = ? AND r.finish_time IS NOT NULL AND r.finish_time != ''
        ORDER BY 
          CASE WHEN r.finish_time LIKE '%:%:%' THEN 
            (CAST(SUBSTR(r.finish_time, 1, INSTR(r.finish_time, ':') - 1) AS INTEGER) * 3600) +
            (CAST(SUBSTR(r.finish_time, INSTR(r.finish_time, ':') + 1, 2) AS INTEGER) * 60) +
            CAST(SUBSTR(r.finish_time, -2) AS INTEGER)
          ELSE 999999 END ASC
      `).all(req.params.id, projectData.id);

      const resultsWithRank = results.map((r, index) => ({
        ...r as Record<string, unknown>,
        rank: index + 1
      }));

      resultsByProject[projectName] = resultsWithRank;
    }

    res.json({ data: resultsByProject });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '获取成绩榜单失败';
    res.status(500).json({ error: message });
  }
});

export default router;
