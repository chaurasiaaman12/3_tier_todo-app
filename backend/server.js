const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const client = require('prom-client');

const app = express();
const PORT = 3000;

// Prometheus metrics setup
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });

const taskCounter = new client.Counter({
  name: 'todo_tasks_created_total',
  help: 'Total number of tasks created'
});

const deleteCounter = new client.Counter({
  name: 'todo_tasks_deleted_total',
  help: 'Total number of tasks deleted'
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect('mongodb://mongo:27017/todoDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Schema and Model
const TaskSchema = new mongoose.Schema({
  text: { type: String, required: true },
});

const Task = mongoose.model('Task', TaskSchema);

// Routes
app.get('/tasks', async (req, res) => {
  try {
    const tasks = await Task.find();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.post('/tasks', async (req, res) => {
  try {
    const newTask = new Task({ text: req.body.text });
    await newTask.save();
    taskCounter.inc(); // Prometheus metric
    res.status(201).json(newTask);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create task' });
  }
});

app.delete('/tasks/:id', async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    deleteCounter.inc(); // Prometheus metric
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
