const jwt = require("jsonwebtoken");
const User = require("../models/User");

const getJwtToken = (req) => req.cookies.token;

const requireAuth = async (req, res, next) => {
  try {
    const token = getJwtToken(req);
    if (!token) return res.redirect("/login");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).lean();
    if (!user) return res.redirect("/login");

    req.user = user;
    res.locals.currentUser = user;
    next();
  } catch (error) {
    return res.redirect("/login");
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).send("Access denied: admin only");
  }
  next();
};

const attachUserIfLoggedIn = async (req, res, next) => {
  try {
    const token = getJwtToken(req);
    if (!token) {
      res.locals.currentUser = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).lean();
    req.user = user || null;
    res.locals.currentUser = user || null;
    next();
  } catch (error) {
    req.user = null;
    res.locals.currentUser = null;
    next();
  }
};

module.exports = {
  requireAuth,
  requireAdmin,
  attachUserIfLoggedIn,
};
