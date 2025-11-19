const pool = require('../config/db');
const { validationResult } = require('express-validator');

function computeCourseMark(assignments) {
  const totalWeight = assignments.reduce((s, a) => s + parseFloat(a.weight || 0), 0);
  if (totalWeight <= 0) return 0;
  const weighted = assignments.reduce((s, a) => s + (parseFloat(a.mark || 0) * parseFloat(a.weight || 0)), 0);
  return Math.round((weighted / totalWeight) * 100) / 100;
}

exports.getCourses = async (req, res, next) => {
  try {
    const userId = req.session.user.id;

    // Get user's courses
    const [courses] = await pool.execute(
      'SELECT id, code, weight FROM courses WHERE user_id = ? ORDER BY sort_order DESC, id ASC',
      [userId]
    );

    const out = [];
    for (const c of courses) {
      const [assignments] = await pool.execute(
        'SELECT mark, weight FROM assignments WHERE course_id = ?',
        [c.id]
      );
      const currentMark = computeCourseMark(assignments);
      out.push({ id: c.id, code: c.code, weight: c.weight, currentMark });
    }

    res.json(out);
  } catch (err) {
    next(err);
  }
};

exports.getCourseById = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const userId = req.session.user.id;

    // Verify the course belongs to this user and fetch metadata
    const [courses] = await pool.execute(
      'SELECT id, code, weight FROM courses WHERE id = ? AND user_id = ? LIMIT 1',
      [courseId, userId]
    );
    if (!courses.length) return res.status(404).json({ error: 'Course not found' });

    const course = courses[0];

    // Fetch assignments for that course
    const [assignments] = await pool.execute(
      'SELECT id, title, mark, weight FROM assignments WHERE course_id = ? ORDER BY sort_order DESC',
      [courseId]
    );

    // Compute course mark
    const currentMark = computeCourseMark(assignments);

    res.json({
      id: course.id,
      code: course.code,
      weight: course.weight,
      currentMark,
      assignments
    });
  } catch (err) {
    next(err);
  }
};

exports.createCourse = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { code, weight = 0 } = req.body;
    const userId = req.session.user.id;

    // New course gets added to the end
    const [maxRows] = await pool.execute(
      'SELECT COALESCE(MAX(sort_order), 0) AS maxo FROM courses WHERE user_id = ?', 
      [userId]
    );
    const next = (maxRows[0]?.maxo || 0) + 1;
    const [result] = await pool.execute(
      'INSERT INTO courses (code, weight, user_id, sort_order) VALUES (?, ?, ?, ?)',
      [code, weight, userId, next]
    );

    res.status(201).json({ id: result.insertId, code, weight });
  } catch (err) {
    next(err);
  }
};

exports.updateCourse = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const courseId = req.params.id;
    const { code, weight = 0 } = req.body;
    const userId = req.session.user.id;

    // Only update if the course belongs to the user
    const [result] = await pool.execute(
      'UPDATE courses SET code = ?, weight = ? WHERE id = ? AND user_id = ?',
      [code, weight, courseId, userId]
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.deleteCourse = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const userId = req.session.user.id;

    await pool.execute(
      'DELETE FROM courses WHERE id = ? AND user_id = ?',
      [courseId, userId]
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.updateOrder = async (req, res, next) => {
  try {
    const userId = req.session?.user?.id;
    const order = Array.isArray(req.body?.order) ? req.body.order : null;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    if (!order) return res.status(400).json({ error: 'Missing order array' });

    // Use a connection/transaction to persist changes
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      // Update each id with the index as sort_order (1-based)
      for (let i = 0; i < order.length; i++) {
        const courseId = order[i];
        // Update only if course belongs to this user
        await conn.execute(
          'UPDATE courses SET sort_order = ? WHERE id = ? AND user_id = ?',
          [i + 1, courseId, userId]
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