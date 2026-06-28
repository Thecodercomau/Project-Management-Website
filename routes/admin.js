const express = require('express');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');

const router = express.Router();

router.use(auth, admin);

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = value instanceof Date ? value.toISOString() : String(value);
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function toCsv(rows, columns) {
  const header = columns.map(column => csvEscape(column.header)).join(',');
  const body = rows.map(row => columns.map(column => csvEscape(column.value(row))).join(',')).join('\n');
  return body ? `${header}\n${body}\n` : `${header}\n`;
}

function sendCsv(res, filename, csv) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(`\uFEFF${csv}`);
}

async function buildUsersCsv() {
  const users = await User.find().sort({ createdAt: -1 }).lean();
  return toCsv(users, [
    { header: 'UserID', value: row => row._id },
    { header: 'Name', value: row => row.name },
    { header: 'Email', value: row => row.email },
    { header: 'IsAdmin', value: row => row.isAdmin ? 'Yes' : 'No' },
    { header: 'CreatedAt', value: row => row.createdAt },
    { header: 'UpdatedAt', value: row => row.updatedAt },
  ]);
}

async function buildProjectsCsv() {
  const projects = await Project.find().sort({ createdAt: -1 }).lean();
  return toCsv(projects, [
    { header: 'ProjectID', value: row => row._id },
    { header: 'Name', value: row => row.name },
    { header: 'Description', value: row => row.description },
    { header: 'OwnerUserID', value: row => row.owner },
    { header: 'MemberUserIDs', value: row => (row.members || []).join(';') },
    { header: 'CreatedAt', value: row => row.createdAt },
    { header: 'UpdatedAt', value: row => row.updatedAt },
  ]);
}

async function buildTasksCsv() {
  const tasks = await Task.find().sort({ createdAt: -1 }).lean();
  return toCsv(tasks, [
    { header: 'TaskID', value: row => row._id },
    { header: 'Title', value: row => row.title },
    { header: 'Description', value: row => row.description },
    { header: 'Status', value: row => row.status },
    { header: 'Priority', value: row => row.priority },
    { header: 'DueDate', value: row => row.dueDate },
    { header: 'ProjectID', value: row => row.project },
    { header: 'AssigneeUserID', value: row => row.assignee },
    { header: 'CreatorUserID', value: row => row.creator },
    { header: 'SortOrder', value: row => row.order },
    { header: 'CreatedAt', value: row => row.createdAt },
    { header: 'UpdatedAt', value: row => row.updatedAt },
  ]);
}

router.get('/summary', async (req, res) => {
  const [users, projects, tasks] = await Promise.all([
    User.countDocuments(),
    Project.countDocuments(),
    Task.countDocuments(),
  ]);
  res.json({ users, projects, tasks });
});

router.get('/export/users.csv', async (req, res) => sendCsv(res, 'projectflow-users.csv', await buildUsersCsv()));
router.get('/export/projects.csv', async (req, res) => sendCsv(res, 'projectflow-projects.csv', await buildProjectsCsv()));
router.get('/export/tasks.csv', async (req, res) => sendCsv(res, 'projectflow-tasks.csv', await buildTasksCsv()));

router.get('/export/all', async (req, res) => {
  const [usersCsv, projectsCsv, tasksCsv] = await Promise.all([
    buildUsersCsv(),
    buildProjectsCsv(),
    buildTasksCsv(),
  ]);
  res.json({
    generatedAt: new Date().toISOString(),
    files: {
      'projectflow-users.csv': usersCsv,
      'projectflow-projects.csv': projectsCsv,
      'projectflow-tasks.csv': tasksCsv,
    },
  });
});

module.exports = router;
