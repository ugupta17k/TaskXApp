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


app.get('/', (req,res)=>{
  res.sendFile('/Users/ugupt/OneDrive/Desktop/UG-Projects/practice-project/taskApp/frontend/index.html')
})
app.get('/signup', (req,res)=>{
  res.sendFile('/Users/ugupt/OneDrive/Desktop/UG-Projects/practice-project/taskApp/frontend/signup.html')
})
app.get('/signin', (req,res)=>{
  res.sendFile('/Users/ugupt/OneDrive/Desktop/UG-Projects/practice-project/taskApp/frontend/signin.html')
})
app.get('/allNotes', (req,res)=>{
  res.sendFile('/Users/ugupt/OneDrive/Desktop/UG-Projects/practice-project/taskApp/frontend/Dashboard.html')
})


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

  if (FindNote.rows.length === 0) {
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
    FindNote,
  });
});

// ----------------------- TASK SECTION ---------------------------------------------

app.post("/task", authmiddleware, async (req, res) => {
  const userId = req.userId;
  const taskTitle = req.body.tasktitle;
  const noteid = Number(req.query.noteid);

  if (!noteid) {
    res.send(403).json({
      message: "note id is required",
    });
    return;
  }
  console.log(userId);
  

  const NoteExist = await pool.query(
    `SELECT * FROM notes WHERE userid = $1 AND noteid = $2`,
    [userId, noteid],
  );
  // const NoteExist = NOTES.find(
  //   (n) => n.NoteId === NoteId && n.userId === userId,
  // );
  if (NoteExist.rows.length === 0 ) {
    res.status(403).json({
      message: "note not found",
    });
    return;
  }

  const AddTask = await pool.query(
    `INSERT INTO task (tasktitle, userid, noteid) VALUES ($1, $2, $3) RETURNING *`,
    [taskTitle, userId, noteid],
  );

  // task.push({
  //   taskId: taskId++,
  //   taskTitle,
  //   userId,
  //   NoteId,
  // });

  res.json({
    message: "task created successfully",
    AddTask: AddTask.rows[0],
  });
});

app.get("/allTask", authmiddleware, async (req, res) => {
  const userId = req.userId;
  const noteid = Number(req.query.noteid);

  if (!noteid) {
    return res.status(404).json({
      message: "note id is required",
    });
  }
  // console.log(userId);
  // console.log(noteid);
  

  const NoteExist = pool.query(
    `
    SELECT * FROM notes WHERE noteid = $1 AND userid = $2`,
    [noteid, userId],
  );

  if (!NoteExist) {
    res.status(403).json({
      message: "note not found",
    });
    return;
  }

  const Findtask = await pool.query(
    "SELECT * FROM task WHERE userid = $1 AND noteid = $2",
    [userId, noteid]
  );

  if(Findtask.rows.length === 0){
    return res.status(404).json({
      message:"task not found "
    })
  }

  res.json({
    allTask: Findtask.rows,
    idss: {
      userId,
      noteid,
    },
  });
});

app.put("/Update-task", authmiddleware, async (req, res) => {
  const userId = req.userId;
  const taskid = Number(req.query.taskid);
  const noteid = Number(req.query.noteid);
  const NewTitle = req.body.NewTitle;

  const NoteExist = await pool.query(
    `SELECT * FROM notes WHERE userid = $1 AND noteid = $2`,
    [userId, noteid],
  );
  if (!NoteExist.rows.length === 0) {
    res.status(404).json({
      messsage: "Note not found given credentials are not correct",
    });
    return;
  }

  const TaskExist = await pool.query(
    `SELECT * FROM task WHERE userid = $1 AND noteid = $2 AND taskid = $3`,
    [userId, noteid, taskid],
  );
  if (!TaskExist.rows.length === 0) {
    return res.status(404).json({
      message: "task not found given credentials are not correct",
    });
  }

  const UpdateTask = await pool.query(
    `
    UPDATE task 
    SET tasktitle = $1 
    WHERE userid = $2 AND noteid = $3 AND taskid = $4 RETURNING *
    `,
    [NewTitle, userId, noteid, taskid],
  );
  // const findTask = task.findIndex((tf) => tf.taskId === taskId);

  res.json({
    message: "task updated successfully",
    UpdateTask: UpdateTask.rows,
  });
});

app.delete("/Delete-task", authmiddleware, async (req, res) => {
  const userId = req.userId;
  const noteid = parseInt(req.query.noteid);
  const taskid = parseInt(req.query.taskid);

  const noteExist = await pool.query(
    `SELECT * FROM notes WHERE userid = $1 AND noteid = $2`,
    [userId, noteid],
  );
  if (noteExist.rows.length === 0) {
    res.status(404).json({
      messsage: "Note not found given credentials are not correct",
    });
    return;
  }

  const taskExist = await pool.query(
    `
    SELECT * FROM task 
    WHERE userid = $1 AND noteid = $2 AND taskid = $3`,
    [userId, noteid, taskid],
  );
  if (taskExist.rows.length === 0) {
    return res.status(404).json({
      message: "task not found given credentials are not correct",
    });
  }

  const DeleteTask = await pool.query(
    `DELETE FROM task 
     WHERE userid = $1 AND noteid = $2 AND taskid = $3 
     RETURNING *`,
    [userId, noteid, taskid],
  );

  if (DeleteTask.rows.length === 0) {
    return res.status(404).json({
      message: "Task not found or not owned by user",
    });
  }

  res.json({
    message: "task deleted successfully",
    deletedTask: DeleteTask.rows[0],
  });
});

app.listen(3000, () => {
  console.log("task App server is running on port 3000");
});
