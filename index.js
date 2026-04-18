const express = require("express");
const jwt = require("jsonwebtoken");
const { authmiddleware } = require("./authmiddleware");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString:
    "postgresql://neondb_owner:npg_No5RPh0OHeFS@ep-withered-frost-a1oho45l-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
});

const app = express();
app.use(express.json());

let NoteId = 1;
let taskId = 1;

let NOTES = [];
let task = [];

// ----------------- SIGNUP SIGNIN --------------------------------------------------------

app.post("/signup", async (req, res) => {
  let { username, email, password } = req.body;
  let UserExist = await pool.query(
    "SELECT * FROM users WHERE username = $1 AND email = $2",
    [username, email],
  );
  if (UserExist.rows.length > 0) {
    res.status(403).json({
      message: " username is already exist || email is already exist",
    });
    return;
  }

  const CreateUsers = await pool.query(
    "INSERT INTO users (username ,email, password) VALUES ($1, $2, $3)", [username, email, password],
  );

  res.json({
    message: "signUp done!",
  });
});

app.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  let UserExist = await pool.query(
    "SELECT * FROM users WHERE email = $1 AND password = $2",
    [email, password]
  );
  if (!UserExist) {
    res.status(403).json({
      message: " user not exist with this credentials",
    });
    return;
  }

  const token = jwt.sign(
    {
      userId: UserExist.rows[0].userid,
    },
    "taskUGsecret",
  );

  res.json({
    token,
  });
});

// ----------------------- NOTE SECTION  --------------------------------------------------

app.post("/Create-notes", authmiddleware, (req, res) => {
  const userId = req.userid;
  let Title = req.body.Title;
  let desc = req.body.desc;

  const createNotes = pool.query("INSERT INTO notes (Title, desc) VALUES ($1, $2)",[Title, desc])

//   NOTES.push({
//     NoteId: NoteId++,
//     Title,
//     desc,
//     userId,
//   });
  res.json({
    message: "Note is created",
  });
});

app.get("/allNotes", authmiddleware, (req, res) => {
  const userId = req.userId;

  const Usernotes = NOTES.filter((n) => Number(n.userId) === Number(userId));

  res.json({
    allnotes: Usernotes,
    users: {
      id: userId,
    },
  });
});

app.put("/notes", authmiddleware, (req, res) => {
  const userId = req.userId;
  const NoteId = parseInt(req.query.NoteId);
  const NewTitle = req.body.NewTitle;
  const NewDesc = req.body.NewDesc;

  const noteIndex = NOTES.findIndex(
    (n) => n.NoteId === NoteId && n.userId === userId,
  );
  if (noteIndex === -1) {
    return res.status(404).json({
      message: "Note not found or not owned by user",
    });
  }

  if (NewTitle !== undefined) {
    NOTES[noteIndex].Title = NewTitle;
  }
  if (NewDesc !== undefined) {
    NOTES[noteIndex].desc = NewDesc;
  }

  res.json({
    message: "Note updated successfully",
    updatedNote: NOTES[noteIndex],
  });
});

app.delete("/Delete-note", authmiddleware, async (req, res) => {
  const userId = req.userId;
  const noteId = parseInt(req.query.noteId);

  const noteIndex = NOTES.findIndex(
    (n) => n.NoteId === noteId && n.userId === userId,
  );

  if (noteIndex === -1) {
    return res.status(404).json({
      message: "Note not found",
    });
  }

  NOTES.splice(noteIndex, 1);

  res.json({
    message: "note deleted successfully",
  });
});

// ----------------------- TASK SECTION ---------------------------------------------

app.post("/task", authmiddleware, (req, res) => {
  const userId = req.userId;
  const taskTitle = req.body.taskTitle;
  const NoteId = parseInt(req.query.NoteId);

  const NoteExist = NOTES.find(
    (n) => n.NoteId === NoteId && n.userId === userId,
  );
  if (!NoteExist) {
    res.status(403).json({
      message: "note not found",
    });
    return;
  }

  task.push({
    taskId: taskId++,
    taskTitle,
    userId,
    NoteId,
  });

  res.json({
    message: "task created successfully",
  });
});

app.get("/allTask", authmiddleware, (req, res) => {
  const userId = req.userId;
  const NoteId = parseInt(req.query.NoteId);

  const NoteExist = NOTES.find(
    (n) => n.NoteId === NoteId && n.userId === userId,
  );
  if (!NoteExist) {
    res.status(403).json({
      message: "note not found with this noteID",
    });
    return;
  }

  const Findtask = task.filter(
    (t) =>
      Number(t.userId) === Number(userId) &&
      Number(t.NoteId) === Number(NoteId),
  );

  res.json({
    allTask: Findtask,
    idss: {
      userId,
      NoteId,
    },
  });
});

app.put("/Update-task", authmiddleware, (req, res) => {
  const userId = req.userId;
  const taskId = Number(req.query.taskId);
  const NoteId = Number(req.query.NoteId);
  const NewTitle = req.body.NewTitle;

  const NoteExist = NOTES.find(
    (n) => n.userId === userId && n.NoteId === NoteId,
  );
  if (!NoteExist) {
    res.status(404).json({
      messsage: "Note not found given credentials are not correct",
    });
    return;
  }

  const TaskExist = task.find(
    (t) => t.NoteId === NoteId && t.taskId === taskId && t.userId === userId,
  );
  if (!TaskExist) {
    return res.status(404).json({
      message: "task not found given credentials are not correct",
    });
  }

  const findTask = task.findIndex((tf) => tf.taskId === taskId);

  if (findTask.length === -1) {
    res.status(404).json({
      message: "bro task is not here credentials galat hai",
    });
    return;
  }

  if (NewTitle !== undefined) {
    task[findTask].taskTitle = NewTitle;
  }

  res.json({
    task,
  });
});

app.delete("/Delete-task", authmiddleware, (req, res) => {
  const userId = req.userId;
  const NoteId = Number(req.query.NoteId);
  const taskId = Number(req.query.taskId);

  const noteExist = NOTES.find(
    (n) => n.NoteId === NoteId && n.userId === userId,
  );
  if (!noteExist) {
    res.status(404).json({
      message: "note not exist given credentials are wrong",
    });
    return;
  }

  const taskExist = task.find(
    (t) => t.NoteId === NoteId && t.taskId === taskId && t.userId === userId,
  );
  if (!taskExist) {
    res.status(404).json({
      message: "task not found given credentials are wrong",
    });
    return;
  }

  task = task.filter(
    (t) => !(t.NoteId === NoteId && t.taskId === taskId && t.userId === userId),
  );

  res.json({
    message: "task deleted successfully",
    deletedTask: taskExist,
  });
});

app.listen(3000, () => {
  console.log("task App server is running on port 3000");
});
