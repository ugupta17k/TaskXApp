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
    "INSERT INTO users (username ,email, password) VALUES ($1, $2, $3)",
    [username, email, password],
  );

  res.json({
    message: "signUp done!",
  });
});

app.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  let UserExist = await pool.query(
    "SELECT * FROM users WHERE email = $1 AND password = $2",
    [email, password],
  );
  if (!UserExist || UserExist.rows.length === 0) {
    res.status(403).json({
      message: "user not exist with this credentials",
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

app.post("/Create-notes", authmiddleware, async (req, res) => {
  const userId = req.userId;
  let Title = req.body.Title;
  let description = req.body.description;

  const createNotes = await pool.query(
    `INSERT INTO notes (Title, description, userid) VALUES ($1, $2, $3)`,
    [Title, description, userId],
  );

  //   NOTES.push({
  //     NoteId: NoteId++,
  //     Title,
  //     desc,
  //     userId,
  //   });
  res.json({
    message: "Note is created",
    createNotes,
  });
});

app.get("/allNotes", authmiddleware, async (req, res) => {
  const userId = req.userId;

  const Usernotes = await pool.query(`SELECT * FROM notes WHERE userid =$1`, [
    userId,
  ]);

  res.json({
    allnotes: Usernotes.rows,
    users: {
      id: userId,
    },
  });
});

app.put("/notes", authmiddleware, async (req, res) => {
  const userId = req.userId;
  const noteid = parseInt(
    req.query.noteid || req.query.noteId || req.body.noteid || req.body.noteId,
    10,
  );
  const NewTitle = req.body.NewTitle;
  const NewDescription = req.body.NewDescription;

  if (!noteid) {
    return res.status(400).json({
      message: "noteid is required",
    });
  }

  const FindNote = await pool.query(
    `SELECT * FROM notes WHERE noteid = $1 AND userid = $2`,
    [noteid, userId],
  );
  if (FindNote.rows.length === 0) {
    return res.status(404).json({
      message: "Note not found or not owned by user",
    });
  }

  if (NewTitle === undefined && NewDescription === undefined) {
    return res.status(400).json({
      message: "Please provide NewTitle or NewDescription to update",
    });
  }

  const UpdateNote = await pool.query(
    `UPDATE notes
    SET Title = COALESCE($1, Title), description = COALESCE($2, description)
    WHERE noteid = $3 AND userid = $4
    RETURNING *`,
    [NewTitle, NewDescription, noteid, userId],
  );

  res.json({
    message: "Note updated successfully",
    updatedNote: UpdateNote.rows[0],
  });
});

app.delete("/Delete-note", authmiddleware, async (req, res) => {
  const userId = req.userId;
  const noteid = parseInt(req.query.noteid);

  if (!noteid) {
    res.status(403).json({
      message: "noteid is required",
    });
    return;
  }

  const FindNote = pool.query(
    `
    SELECT * FROM notes WHERE noteid = $1 AND userid = $2`,
    [noteid, userId],
  );

  if ((await FindNote).rows.length === 0) {
    res.status(403).json({
      message: "note not found in db",
    });
    return;
  }

  const DeleteNote = pool.query(
    `
    DELETE FROM notes 
    WHERE noteid = $1 AND userid = $2 RETURNING *
    `,
    [noteid, userId],
  );

  // const noteIndex = NOTES.findIndex(
  //   (n) => n.NoteId === noteId && n.userId === userId,
  // );
  res.json({
    message: "note deleted successfully",
    FindNote
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
