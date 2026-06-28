const express = require('express');
const Project = require('../models/Project');
const Task = require('../models/Task');
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

router.get('/', auth, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [{ owner: req.user._id }, { members: req.user._id }],
    }).sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    const project = await Project.create({ name, description, owner: req.user._id });
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members', 'name email');
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!canAccessProject(project, req.user._id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const { name, description, members } = req.body;
    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;
    if (members !== undefined) project.members = members;
    await project.save();
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await Task.deleteMany({ project: project._id });
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
