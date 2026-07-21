global.users;

function register(req, res) {
  const { name, email, password } = req.body;

  if (global.users.some((user) => user.email === email)) {
    return res.status(401).json();
  }

  const user = {
    email,
    name,
    password,
  };

  global.user_id = user;
  global.users.push(user);

  res.status(201).json({
    name,
    email,
  });
}

function logon(req, res) {
  const { email, password } = req.body;

  const currentUser = global.users.find((user) => user.email === email);

  if (currentUser) {
    const name = currentUser.name;
    if (currentUser.password === password) {
      global.user_id = currentUser;
      res.status(200).json({
        name,
        email,
      });
    } else {
      res.status(401).json();
    }
  } else {
    res.status(401).json();
  }
}

function logoff(req, res) {
  global.user_id = null;
  res.status(200).json();
}

module.exports = {
  register,
  logon,
  logoff,
};
