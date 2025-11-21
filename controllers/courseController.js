const pool = require('../config/db');

function computeCourseMark(assignments) {
  const totalWeight = assignments.reduce((s, a) => s + parseFloat(a.weight || 0), 0);
  if (totalWeight <= 0) return 0;
  const weighted = assignments.reduce((s, a) => s + (parseFloat(a.mark || 0) * parseFloat(a.weight || 0)), 0);
  return Math.round((weighted / totalWeight) * 100) / 100;
}

exports.getCourses = async (req, res, next) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    // Get user's courses
    const [courses] = await pool.execute(
      'SELECT id, code, weight FROM courses WHERE user_id = ? ORDER BY sort_order DESC, id DESC',
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
    const userId = req.session?.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    // Verify the course belongs to this user and fetch metadata
    const [courses] = await pool.execute(
      'SELECT id, code, weight FROM courses WHERE id = ? AND user_id = ? LIMIT 1',
      [courseId, userId]
    );
    if (!courses.length) return res.status(404).json({ error: 'Course not found' });

    const course = courses[0];

    // Fetch assignments for that course
    const [assignments] = await pool.execute(
      'SELECT id, title, mark, weight FROM assignments WHERE course_id = ? ORDER BY sort_order DESC, id DESC',
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
    const {code, weight = 0} = req.body;
    const userId = req.session?.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    if (!code || !String(code).trim()) return res.status(400).json({ errors: [{ msg: 'Course code required', path: 'code' }] });

    const [maxRows] = await pool.execute('SELECT COALESCE(MAX(sort_order), 0) AS maxo FROM courses WHERE user_id = ?', [userId]);
    const nextOrder = (maxRows[0]?.maxo || 0) + 1;

    const [result] = await pool.execute(
      'INSERT INTO courses (code, weight, user_id, sort_order) VALUES (?, ?, ?, ?)',
      [code.trim(), weight, userId, nextOrder]
    );

    res.status(201).json({ id: result.insertId, code: code.trim(), weight });
  } catch (err) {
    next(err);
  }
};

exports.updateCourse = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const { code, weight = 0 } = req.body;
    const userId = req.session?.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    if (!code || !String(code).trim()) return res.status(400).json({ errors: [{ msg: 'Course code required', path: 'code' }] });

    // Only update if the course belongs to the user
    await pool.execute(
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
    const userId = req.session?.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    await pool.execute(
      'DELETE FROM assignments WHERE course_id = ?', 
      [courseId]
    );

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
        const sortOrder = order.length - i;
        await conn.execute(
          'UPDATE courses SET sort_order = ? WHERE id = ? AND user_id = ?',
          [sortOrder, courseId, userId]
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