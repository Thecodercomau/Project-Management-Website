const express = require('express');
const mongoose = require('mongoose');
const Task = require('../models/Task');
const Project = require('../models/Project');
const auth = require('../middleware/auth');

const router = express.Router();

function canAccessProject(project, userId) {
  const id = userId.toString();
  const ownerId = project.owner._id ? project.owner._id.toString() : project.owner.toString();
  return ownerId === id || project.members.some(member => {
    const memberId = member._id ? member._id.toString() : member.toString();
    return memberId === id;
  });
}

async function findAccessibleProject(projectId, userId) {
  if (!mongoose.Types.ObjectId.isValid(projectId)) return null;
  const project = await Project.findById(projectId);
  if (!project) return null;
  return canAccessProject(project, userId) ? project : false;
}

router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const project = await findAccessibleProject(req.params.projectId, req.user._id);
    if (project === null) return res.status(404).json({ error: 'Project not found' });
    if (project === false) return res.status(403).json({ error: 'Not authorized' });

    const tasks = await Task.find({ project: req.params.projectId })
      .populate('assignee', 'name email')
      .populate('creator', 'name email')
      .sort({ order: 1, createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, description, status, priority, dueDate, project, assignee } = req.body;
    if (!project) return res.status(400).json({ error: 'Project is required' });
    const accessibleProject = await findAccessibleProject(project, req.user._id);
    if (accessibleProject === null) return res.status(404).json({ error: 'Project not found' });
    if (accessibleProject === false) return res.status(403).json({ error: 'Not authorized' });

    const lastTask = await Task.findOne({ project, status }).sort({ order: -1 });
    const order = lastTask ? lastTask.order + 1 : 0;
    const task = await Task.create({
      title, description, status, priority, dueDate, project,
      assignee, creator: req.user._id, order,
    });
    const populated = await Task.findById(task._id)
      .populate('assignee', 'name email')
      .populate('creator', 'name email');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'name email')
      .populate('creator', 'name email');
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const project = await findAccessibleProject(task.project, req.user._id);
    if (project === null) return res.status(404).json({ error: 'Project not found' });
    if (project === false) return res.status(403).json({ error: 'Not authorized' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const project = await findAccessibleProject(task.project, req.user._id);
    if (project === null) return res.status(404).json({ error: 'Project not found' });
    if (project === false) return res.status(403).json({ error: 'Not authorized' });

    const { title, description, status, priority, dueDate, assignee, order } = req.body;
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (assignee !== undefined) task.assignee = assignee;
    if (order !== undefined) task.order = order;
    await task.save();
    const populated = await Task.findById(task._id)
      .populate('assignee', 'name email')
      .populate('creator', 'name email');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const project = await findAccessibleProject(task.project, req.user._id);
    if (project === null) return res.status(404).json({ error: 'Project not found' });
    if (project === false) return res.status(403).json({ error: 'Not authorized' });

    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/reorder', auth, async (req, res) => {
  try {
    const { status, order } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const project = await findAccessibleProject(task.project, req.user._id);
    if (project === null) return res.status(404).json({ error: 'Project not found' });
    if (project === false) return res.status(403).json({ error: 'Not authorized' });

    task.status = status;
    task.order = order;
    await task.save();
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
