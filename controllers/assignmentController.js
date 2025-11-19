const pool = require('../config/db');
const { validationResult } = require('express-validator');

exports.listAssignments = async (req, res, next) => {
  try {
    const courseId = req.params.id ?? req.params.courseId;
    const userId = req.session.user.id;

    // Ensure course belongs to user
    const [courseRows] = await pool.execute(
      'SELECT id, code FROM courses WHERE id = ? AND user_id = ? LIMIT 1',
      [courseId, userId]
    );
    if (!courseRows.length) return res.status(404).json({ error: 'Course not found' });

    const [assignments] = await pool.execute(
      'SELECT id, title, mark, weight, sort_order FROM assignments WHERE course_id = ? ORDER BY sort_order DESC, id ASC',
      [courseId]
    );

    res.json(assignments);
  } catch (err) {
    next(err);
  }
};

exports.createAssignment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const courseId = req.params.id ?? req.params.courseId;
    const userId = req.session.user.id;
    const { title, mark = 0, weight = 0 } = req.body;

    // Verify ownership
    const [courseRows] = await pool.execute(
      'SELECT id FROM courses WHERE id = ? AND user_id = ? LIMIT 1',
      [courseId, userId]
    );
    if (!courseRows.length) return res.status(404).json({ error: 'Course not found' });

    // New assignments get added to the end
    const [maxRows] = await pool.execute('SELECT COALESCE(MAX(sort_order), 0) AS maxo FROM assignments WHERE course_id = ?', [courseId]);
    const nextOrder = (maxRows[0]?.maxo || 0) + 1;

    const [result] = await pool.execute(
      'INSERT INTO assignments (course_id, title, mark, weight, sort_order) VALUES (?, ?, ?, ?, ?)',
      [courseId, title, mark, weight, nextOrder]
    );

    res.json({ success: true, id: result.insertId });
  } catch (err) {
    next(err);
  }
};

exports.updateAssignment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const assignmentId = req.params.assignmentId ?? req.params.id;
    const userId = req.session.user.id;
    const { title, mark = 0, weight = 0 } = req.body;

    // Ensure assignment belongs to a course owned by the user
    const [rows] = await pool.execute(
      `SELECT a.id FROM assignments a
       JOIN courses c ON a.course_id = c.id
       WHERE a.id = ? AND c.user_id = ? LIMIT 1`,
      [assignmentId, userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Assignment not found' });

    await pool.execute(
      'UPDATE assignments SET title = ?, mark = ?, weight = ? WHERE id = ?',
      [title, mark, weight, assignmentId]
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.deleteAssignment = async (req, res, next) => {
  try {
    const assignmentId = req.params.assignmentId ?? req.params.id;
    const userId = req.session.user.id;

    const [rows] = await pool.execute(
      `SELECT a.id FROM assignments a
       JOIN courses c ON a.course_id = c.id
       WHERE a.id = ? AND c.user_id = ? LIMIT 1`,
      [assignmentId, userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Assignment not found' });

    await pool.execute('DELETE FROM assignments WHERE id = ?', [assignmentId]);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.updateOrder = async (req, res, next) => {
  try {
    const userId = req.session?.user?.id;
    const courseId = req.params.id ?? req.params.courseId;
    const order = Array.isArray(req.body?.order) ? req.body.order : null;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    if (!courseId) return res.status(400).json({ error: 'Missing course id' });
    if (!order) return res.status(400).json({ error: 'Missing order array' });

    // Verify course belongs to the user
    const [crows] = await pool.execute('SELECT id FROM courses WHERE id = ? AND user_id = ? LIMIT 1', [courseId, userId]);
    if (!crows.length) return res.status(404).json({ error: 'Course not found' });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (let i = 0; i < order.length; i++) {
        const assignmentId = order[i];
        // Update assignment sort_order only if that assignment belongs to this course
        await conn.execute(
          'UPDATE assignments SET sort_order = ? WHERE id = ? AND course_id = ?',
          [i + 1, assignmentId, courseId]
        );
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};