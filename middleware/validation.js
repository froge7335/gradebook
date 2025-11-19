const { body, param } = require('express-validator');

exports.registerRules = [
  body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username length 3-50'),
  body('password').isLength({ min: 6, max: 128 }).withMessage('Password length 6-128')
];

exports.loginRules = [
  body('username').trim().isLength({ min: 3, max: 50 }),
  body('password').isLength({ min: 6, max: 128 })
];

exports.courseCreateRules = [
  body('code').trim().isLength({ min: 1, max: 100 }).withMessage('Course code required'),
  body('weight').optional().isFloat({ min: 0, max: 1000 }).toFloat()
];

exports.courseIdParam = [
  param('id').isInt().toInt()
];

exports.assignmentCreateRules = [
  body('title').trim().isLength({ min: 1, max: 255 }),
  body('mark').isFloat({ min: 0, max: 100 }).toFloat(),
  body('weight').isFloat({ min: 0 }).toFloat()
];

exports.assignmentIdParam = [
  param('id').optional().isInt().toInt(),
  param('assignmentId').optional().isInt().toInt()
];
