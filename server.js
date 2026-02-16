require("dotenv").config();
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const methodOverride = require("method-override");

const User = require("./models/User");
const Post = require("./models/Post");
const { requireAuth, requireAdmin, attachUserIfLoggedIn } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 3000;
let dbConnectPromise = null;

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required in .env");
}
if (!process.env.MONGO_URI) {
  throw new Error("MONGO_URI is required in .env");
}

const connectToDatabase = async () => {
  if (mongoose.connection.readyState === 1) return;
  if (!dbConnectPromise) {
    dbConnectPromise = mongoose.connect(process.env.MONGO_URI).catch((err) => {
      dbConnectPromise = null;
      throw err;
    });
  }
  await dbConnectPromise;
};

app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (err) {
    console.error("Mongo connection error:", err.message);
    res.status(500).send("Database connection failed");
  }
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));
app.use(attachUserIfLoggedIn);

const createJwt = (user) =>
  jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

const setAuthCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const requireApiAuth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  next();
};

const requireApiAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
};

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ error: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "user",
    });

    const token = createJwt(user);
    setAuthCookie(res, token);
    return res.status(201).json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to sign up" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid email or password" });

    const token = createJwt(user);
    setAuthCookie(res, token);
    return res.json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to log in" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("token");
  res.status(204).end();
});

app.get("/api/auth/me", requireApiAuth, (req, res) => {
  return res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

app.get("/api/posts", requireApiAuth, async (req, res) => {
  const posts = await Post.find({}).sort({ createdAt: -1 }).lean();
  res.json({ posts });
});

app.get("/api/posts/:id", requireApiAuth, async (req, res) => {
  const post = await Post.findById(req.params.id).lean();
  if (!post) return res.status(404).json({ error: "Post not found" });

  if (String(post.authorId) !== String(req.user._id) && req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  res.json({ post });
});

app.post("/api/posts", requireApiAuth, async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    const post = await Post.create({
      title,
      content,
      authorId: req.user._id,
      authorName: req.user.name,
    });

    res.status(201).json({ post });
  } catch (error) {
    res.status(500).json({ error: "Failed to create post" });
  }
});

app.put("/api/posts/:id", requireApiAuth, async (req, res) => {
  const { title, content } = req.body;
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });

  if (String(post.authorId) !== String(req.user._id)) {
    return res.status(403).json({ error: "You can only edit your own posts" });
  }

  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required" });
  }

  post.title = title;
  post.content = content;
  post.updatedAt = new Date();
  await post.save();

  res.json({ post });
});

app.get("/api/admin/posts", requireApiAuth, requireApiAdmin, async (req, res) => {
  const posts = await Post.find({}).sort({ createdAt: -1 }).lean();
  res.json({ posts });
});

app.delete("/api/posts/:id", requireApiAuth, requireApiAdmin, async (req, res) => {
  await Post.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

app.delete("/api/admin/posts", requireApiAuth, requireApiAdmin, async (req, res) => {
  await Post.deleteMany({});
  res.status(204).end();
});
app.get("/", (req, res) => {
  if (!req.user) return res.redirect("/login");
  return res.redirect("/dashboard");
});

app.get("/signup", (req, res) => {
  if (req.user) return res.redirect("/dashboard");
  res.render("signup", { error: null, form: {} });
});

app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).render("signup", {
        error: "Name, email, and password are required",
        form: { name, email },
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).render("signup", {
        error: "Email already exists",
        form: { name, email },
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "user",
    });

    const token = createJwt(user);
    setAuthCookie(res, token);
    return res.redirect("/dashboard");
  } catch (error) {
    return res.status(500).render("signup", {
      error: "Failed to sign up",
      form: { name: req.body.name, email: req.body.email },
    });
  }
});

app.get("/login", (req, res) => {
  if (req.user) return res.redirect("/dashboard");
  res.render("login", { error: null, form: {} });
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).render("login", {
        error: "Email and password are required",
        form: { email },
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).render("login", {
        error: "Invalid email or password",
        form: { email },
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).render("login", {
        error: "Invalid email or password",
        form: { email },
      });
    }

    const token = createJwt(user);
    setAuthCookie(res, token);
    return res.redirect("/dashboard");
  } catch (error) {
    return res.status(500).render("login", {
      error: "Failed to log in",
      form: { email: req.body.email },
    });
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

app.get("/dashboard", requireAuth, async (req, res) => {
  const posts = await Post.find({}).sort({ createdAt: -1 }).lean();
  res.render("dashboard", { posts });
});

app.get("/create-post", requireAuth, (req, res) => {
  res.render("create-post", { error: null, form: {} });
});

app.post("/posts", requireAuth, async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).render("create-post", {
        error: "Title and content are required",
        form: { title, content },
      });
    }

    await Post.create({
      title,
      content,
      authorId: req.user._id,
      authorName: req.user.name,
    });
    return res.redirect("/dashboard");
  } catch (error) {
    return res.status(500).render("create-post", {
      error: "Failed to create post",
      form: { title: req.body.title, content: req.body.content },
    });
  }
});

app.get("/edit-post/:id", requireAuth, async (req, res) => {
  const post = await Post.findById(req.params.id).lean();
  if (!post) return res.status(404).send("Post not found");

  if (String(post.authorId) !== String(req.user._id)) {
    return res.status(403).send("You can only edit your own posts");
  }

  res.render("edit-post", { error: null, post });
});

app.put("/posts/:id", requireAuth, async (req, res) => {
  const { title, content } = req.body;
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).send("Post not found");

  if (String(post.authorId) !== String(req.user._id)) {
    return res.status(403).send("You can only edit your own posts");
  }
  if (!title || !content) {
    return res.status(400).render("edit-post", {
      error: "Title and content are required",
      post: { ...post.toObject(), title, content },
    });
  }

  post.title = title;
  post.content = content;
  post.updatedAt = new Date();
  await post.save();

  return res.redirect("/dashboard");
});

app.get("/admin", requireAuth, requireAdmin, async (req, res) => {
  const posts = await Post.find({}).sort({ createdAt: -1 }).lean();
  res.render("admin", { posts });
});

app.delete("/posts/:id", requireAuth, requireAdmin, async (req, res) => {
  await Post.findByIdAndDelete(req.params.id);
  res.redirect("/admin");
});

app.delete("/admin/posts", requireAuth, requireAdmin, async (req, res) => {
  await Post.deleteMany({});
  res.redirect("/admin");
});

app.use((req, res) => {
  res.status(404).send("Page not found");
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;


